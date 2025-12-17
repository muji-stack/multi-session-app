// Configuration for Firebase Functions

export const config = {
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  },
  app: {
    // Custom protocol for returning to the app after checkout
    customProtocol: 'multisession://',
    // Web URL for success/cancel pages
    successUrl: process.env.SUCCESS_URL || 'https://your-domain.com/billing/success',
    cancelUrl: process.env.CANCEL_URL || 'https://your-domain.com/billing/cancel',
  },
}

// Stripe Price IDs - Set these in your environment
export const STRIPE_PRICES = {
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

// Plan to max accounts mapping
export const PLAN_LIMITS: Record<string, number> = {
  free: 2,
  starter: 5,
  basic: 10,
  pro: 25,
  business: 50,
  enterprise: 999,
}

// Price ID to plan mapping (will be populated from STRIPE_PRICES)
export function getPlanFromPriceId(priceId: string): string {
  for (const [plan, prices] of Object.entries(STRIPE_PRICES)) {
    if (prices.monthly === priceId || prices.yearly === priceId) {
      return plan
    }
  }
  return 'free'
}
