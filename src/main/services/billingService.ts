// Billing Service
// Handles communication with Firebase Functions for Stripe billing

import { shell } from 'electron'
import type {
  Subscription,
  SubscriptionPlan,
  CheckoutResult,
  PortalResult,
  PLANS,
} from '../../shared/billingTypes'

// Firebase Functions URLs - Set these based on your deployment
const FUNCTIONS_BASE_URL = process.env.FIREBASE_FUNCTIONS_URL || ''

/**
 * Check if billing is configured
 */
function isBillingConfigured(): boolean {
  return !!FUNCTIONS_BASE_URL && !FUNCTIONS_BASE_URL.includes('your-project')
}

interface FunctionsResponse<T> {
  result?: T
  error?: {
    message: string
    code: string
  }
}

// Stripe Price IDs from environment
const STRIPE_PRICES: Record<Exclude<SubscriptionPlan, 'free' | 'enterprise'>, { monthly: string; yearly: string }> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || '',
  },
  basic: {
    monthly: process.env.STRIPE_PRICE_BASIC_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_BASIC_YEARLY || '',
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
  },
  business: {
    monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY || '',
  },
}

/**
 * Call a Firebase Cloud Function
 */
async function callFunction<T>(
  functionName: string,
  data: Record<string, unknown>
): Promise<T> {
  const url = `${FUNCTIONS_BASE_URL}/${functionName}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Function call failed: ${errorText}`)
  }

  const result: FunctionsResponse<T> = await response.json()

  if (result.error) {
    throw new Error(result.error.message)
  }

  return result.result as T
}

/**
 * Get current subscription status for a user
 */
export async function getSubscription(userId: string): Promise<Subscription> {
  try {
    const result = await callFunction<Subscription>('getSubscription', { userId })
    return result
  } catch (error) {
    console.error('Error getting subscription:', error)
    // Return default free subscription on error
    return {
      status: 'none',
      plan: 'free',
      maxAccounts: 2,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    }
  }
}

/**
 * Create a Stripe Checkout session URL
 */
export async function createCheckoutUrl(
  userId: string,
  email: string,
  plan: Exclude<SubscriptionPlan, 'free' | 'enterprise'>,
  billingPeriod: 'monthly' | 'yearly' = 'monthly'
): Promise<CheckoutResult> {
  // Check if billing is configured
  if (!isBillingConfigured()) {
    return {
      success: false,
      error: 'Stripe課金はまだ設定されていません。.envファイルにFIREBASE_FUNCTIONS_URLを設定し、Firebase Functionsをデプロイしてください。',
    }
  }

  try {
    const priceId = STRIPE_PRICES[plan]?.[billingPeriod]

    if (!priceId) {
      return {
        success: false,
        error: `Price ID not configured for plan: ${plan} (${billingPeriod}). .envファイルにSTRIPE_PRICE_*を設定してください。`,
      }
    }

    const result = await callFunction<{ success: boolean; url: string; sessionId: string }>(
      'createCheckoutSession',
      {
        priceId,
        userId,
        email,
      }
    )

    if (result.success && result.url) {
      return {
        success: true,
        url: result.url,
      }
    }

    return {
      success: false,
      error: 'Failed to create checkout session',
    }
  } catch (error) {
    console.error('Error creating checkout URL:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create checkout',
    }
  }
}

/**
 * Create a Stripe Customer Portal URL
 */
export async function createPortalUrl(userId: string): Promise<PortalResult> {
  // Check if billing is configured
  if (!isBillingConfigured()) {
    return {
      success: false,
      error: 'Stripe課金はまだ設定されていません。.envファイルにFIREBASE_FUNCTIONS_URLを設定し、Firebase Functionsをデプロイしてください。',
    }
  }

  try {
    const result = await callFunction<{ success: boolean; url: string }>(
      'createPortalSession',
      { userId }
    )

    if (result.success && result.url) {
      return {
        success: true,
        url: result.url,
      }
    }

    return {
      success: false,
      error: 'Failed to create portal session',
    }
  } catch (error) {
    console.error('Error creating portal URL:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create portal',
    }
  }
}

/**
 * Open checkout URL in external browser
 */
export async function openCheckout(
  userId: string,
  email: string,
  plan: Exclude<SubscriptionPlan, 'free' | 'enterprise'>,
  billingPeriod: 'monthly' | 'yearly' = 'monthly'
): Promise<CheckoutResult> {
  const result = await createCheckoutUrl(userId, email, plan, billingPeriod)

  if (result.success && result.url) {
    await shell.openExternal(result.url)
    return { success: true, url: result.url }
  }

  return result
}

/**
 * Open customer portal in external browser
 */
export async function openPortal(userId: string): Promise<PortalResult> {
  const result = await createPortalUrl(userId)

  if (result.success && result.url) {
    await shell.openExternal(result.url)
    return { success: true, url: result.url }
  }

  return result
}

/**
 * Check if the current subscription is valid
 */
export async function checkLicenseValidity(userId: string): Promise<boolean> {
  try {
    const subscription = await getSubscription(userId)

    if (subscription.status === 'active' || subscription.status === 'trialing') {
      // Check if not expired
      if (subscription.currentPeriodEnd) {
        return subscription.currentPeriodEnd > Date.now()
      }
      return true
    }

    // Free plan is always valid (but with limitations)
    if (subscription.plan === 'free') {
      return true
    }

    return false
  } catch (error) {
    console.error('Error checking license validity:', error)
    return false
  }
}

/**
 * Get available plans with pricing
 */
export function getAvailablePlans(): typeof PLANS {
  const { PLANS } = require('../../shared/billingTypes')
  return PLANS
}

/**
 * Get price ID for a plan
 */
export function getPriceId(
  plan: Exclude<SubscriptionPlan, 'free' | 'enterprise'>,
  billingPeriod: 'monthly' | 'yearly'
): string | null {
  return STRIPE_PRICES[plan]?.[billingPeriod] || null
}
