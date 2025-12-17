import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import Stripe from 'stripe'
import { config, STRIPE_PRICES, PLAN_LIMITS, getPlanFromPriceId } from './config'

// Initialize Stripe
const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2023-10-16',
})

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

// ============================================
// Helper Functions
// ============================================

interface UserSubscription {
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'none'
  plan: string
  maxAccounts: number
  currentPeriodEnd: admin.firestore.Timestamp | null
  cancelAtPeriodEnd: boolean
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
}

async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const userRef = db.collection('users').doc(userId)
  const userDoc = await userRef.get()
  const userData = userDoc.data()

  if (userData?.stripeCustomerId) {
    return userData.stripeCustomerId
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      firebaseUserId: userId,
    },
  })

  // Save to Firestore
  await userRef.set(
    {
      stripeCustomerId: customer.id,
      email,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  return customer.id
}

async function updateUserSubscription(
  userId: string,
  subscription: Partial<UserSubscription>
): Promise<void> {
  const userRef = db.collection('users').doc(userId)
  await userRef.set(
    {
      subscription: {
        ...subscription,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
}

async function getUserIdFromCustomerId(customerId: string): Promise<string | null> {
  const usersSnapshot = await db
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get()

  if (usersSnapshot.empty) {
    return null
  }

  return usersSnapshot.docs[0].id
}

// ============================================
// Cloud Functions
// ============================================

/**
 * Create a Stripe Checkout session for subscription
 */
export const createCheckoutSession = functions.https.onCall(
  async (data: { priceId: string; userId: string; email: string; successUrl?: string; cancelUrl?: string }) => {
    const { priceId, userId, email, successUrl, cancelUrl } = data

    if (!priceId || !userId || !email) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required parameters: priceId, userId, email'
      )
    }

    try {
      // Get or create Stripe customer
      const customerId = await getOrCreateStripeCustomer(userId, email)

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl || `${config.app.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || config.app.cancelUrl,
        metadata: {
          userId,
        },
        subscription_data: {
          metadata: {
            userId,
          },
        },
        allow_promotion_codes: true,
      })

      return {
        success: true,
        sessionId: session.id,
        url: session.url,
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      throw new functions.https.HttpsError(
        'internal',
        error instanceof Error ? error.message : 'Failed to create checkout session'
      )
    }
  }
)

/**
 * Create a Stripe Customer Portal session
 */
export const createPortalSession = functions.https.onCall(
  async (data: { userId: string; returnUrl?: string }) => {
    const { userId, returnUrl } = data

    if (!userId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing userId')
    }

    try {
      const userRef = db.collection('users').doc(userId)
      const userDoc = await userRef.get()
      const userData = userDoc.data()

      if (!userData?.stripeCustomerId) {
        throw new functions.https.HttpsError(
          'not-found',
          'No Stripe customer found for this user'
        )
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: userData.stripeCustomerId,
        return_url: returnUrl || config.app.successUrl,
      })

      return {
        success: true,
        url: session.url,
      }
    } catch (error) {
      console.error('Error creating portal session:', error)
      throw new functions.https.HttpsError(
        'internal',
        error instanceof Error ? error.message : 'Failed to create portal session'
      )
    }
  }
)

/**
 * Get user subscription status
 */
export const getSubscription = functions.https.onCall(
  async (data: { userId: string }) => {
    const { userId } = data

    if (!userId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing userId')
    }

    try {
      const userRef = db.collection('users').doc(userId)
      const userDoc = await userRef.get()
      const userData = userDoc.data()

      if (!userData?.subscription) {
        return {
          status: 'none',
          plan: 'free',
          maxAccounts: PLAN_LIMITS.free,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          stripeCustomerId: userData?.stripeCustomerId || null,
          stripeSubscriptionId: null,
        }
      }

      return userData.subscription
    } catch (error) {
      console.error('Error getting subscription:', error)
      throw new functions.https.HttpsError(
        'internal',
        error instanceof Error ? error.message : 'Failed to get subscription'
      )
    }
  }
)

/**
 * Stripe Webhook Handler
 */
export const handleWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed')
    return
  }

  const sig = req.headers['stripe-signature']
  if (!sig) {
    res.status(400).send('Missing stripe-signature header')
    return
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      config.stripe.webhookSecret
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    return
  }

  console.log('Received webhook event:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutComplete(session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error('Error handling webhook:', error)
    res.status(500).send('Webhook handler failed')
  }
})

// ============================================
// Webhook Event Handlers
// ============================================

async function handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId
  if (!userId) {
    console.error('No userId in checkout session metadata')
    return
  }

  const subscriptionId = session.subscription as string
  if (!subscriptionId) {
    console.error('No subscription in checkout session')
    return
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0]?.price.id
  const plan = getPlanFromPriceId(priceId)

  await updateUserSubscription(userId, {
    status: 'active',
    plan,
    maxAccounts: PLAN_LIMITS[plan] || PLAN_LIMITS.free,
    currentPeriodEnd: admin.firestore.Timestamp.fromMillis(
      subscription.current_period_end * 1000
    ),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: subscriptionId,
  })

  console.log(`Checkout complete for user ${userId}, plan: ${plan}`)
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
  const userId = subscription.metadata?.userId
  if (!userId) {
    // Try to find user by customer ID
    const foundUserId = await getUserIdFromCustomerId(subscription.customer as string)
    if (!foundUserId) {
      console.error('Could not find user for subscription update')
      return
    }
    await processSubscriptionUpdate(foundUserId, subscription)
  } else {
    await processSubscriptionUpdate(userId, subscription)
  }
}

async function processSubscriptionUpdate(
  userId: string,
  subscription: Stripe.Subscription
): Promise<void> {
  const priceId = subscription.items.data[0]?.price.id
  const plan = getPlanFromPriceId(priceId)

  let status: UserSubscription['status'] = 'none'
  switch (subscription.status) {
    case 'active':
      status = 'active'
      break
    case 'canceled':
      status = 'canceled'
      break
    case 'past_due':
      status = 'past_due'
      break
    case 'trialing':
      status = 'trialing'
      break
    default:
      status = 'none'
  }

  await updateUserSubscription(userId, {
    status,
    plan,
    maxAccounts: PLAN_LIMITS[plan] || PLAN_LIMITS.free,
    currentPeriodEnd: admin.firestore.Timestamp.fromMillis(
      subscription.current_period_end * 1000
    ),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    stripeSubscriptionId: subscription.id,
  })

  console.log(`Subscription updated for user ${userId}, status: ${status}, plan: ${plan}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const userId =
    subscription.metadata?.userId ||
    (await getUserIdFromCustomerId(subscription.customer as string))

  if (!userId) {
    console.error('Could not find user for subscription deletion')
    return
  }

  await updateUserSubscription(userId, {
    status: 'canceled',
    plan: 'free',
    maxAccounts: PLAN_LIMITS.free,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    stripeSubscriptionId: null,
  })

  console.log(`Subscription deleted for user ${userId}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string
  const userId = await getUserIdFromCustomerId(customerId)

  if (!userId) {
    console.error('Could not find user for payment failure')
    return
  }

  await updateUserSubscription(userId, {
    status: 'past_due',
  })

  // TODO: Send notification to user about payment failure
  console.log(`Payment failed for user ${userId}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string
  const subscriptionId = invoice.subscription as string

  if (!subscriptionId) {
    return // Not a subscription invoice
  }

  const userId = await getUserIdFromCustomerId(customerId)
  if (!userId) {
    console.error('Could not find user for payment success')
    return
  }

  // Get updated subscription
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  await processSubscriptionUpdate(userId, subscription)

  console.log(`Payment succeeded for user ${userId}`)
}
