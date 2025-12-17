// Billing and Subscription Types

export type SubscriptionPlan = 'free' | 'starter' | 'basic' | 'pro' | 'business' | 'enterprise'

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'none'

export interface Subscription {
  status: SubscriptionStatus
  plan: SubscriptionPlan
  maxAccounts: number
  currentPeriodEnd: number | null
  cancelAtPeriodEnd: boolean
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
}

export interface PlanDetails {
  id: SubscriptionPlan
  name: string
  description: string
  maxAccounts: number
  priceMonthly: number
  priceYearly: number
  stripePriceIdMonthly: string
  stripePriceIdYearly: string
  features: string[]
  popular?: boolean
}

export interface CheckoutResult {
  success: boolean
  url?: string
  error?: string
}

export interface PortalResult {
  success: boolean
  url?: string
  error?: string
}

export interface BillingResult {
  success: boolean
  error?: string
}

// Plan configurations
export const PLANS: Record<SubscriptionPlan, Omit<PlanDetails, 'stripePriceIdMonthly' | 'stripePriceIdYearly'>> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic features',
    maxAccounts: 2,
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      'Up to 2 accounts',
      'Basic posting',
      'Manual engagement',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for individuals',
    maxAccounts: 5,
    priceMonthly: 980,
    priceYearly: 9800,
    features: [
      'Up to 5 accounts',
      'Scheduled posting',
      'Basic automation',
      'Email support',
    ],
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    description: 'Great for small teams',
    maxAccounts: 10,
    priceMonthly: 1980,
    priceYearly: 19800,
    features: [
      'Up to 10 accounts',
      'Advanced scheduling',
      'Automation workflows',
      'Priority support',
    ],
    popular: true,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For growing businesses',
    maxAccounts: 25,
    priceMonthly: 4980,
    priceYearly: 49800,
    features: [
      'Up to 25 accounts',
      'All automation features',
      'API access',
      'Advanced analytics',
      'Dedicated support',
    ],
  },
  business: {
    id: 'business',
    name: 'Business',
    description: 'For large organizations',
    maxAccounts: 50,
    priceMonthly: 9800,
    priceYearly: 98000,
    features: [
      'Up to 50 accounts',
      'Everything in Pro',
      'Team management',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solutions',
    maxAccounts: 999,
    priceMonthly: 0, // Contact for pricing
    priceYearly: 0,
    features: [
      'Unlimited accounts',
      'Custom features',
      'On-premise option',
      'Dedicated account manager',
      '24/7 support',
    ],
  },
}

export function getPlanByMaxAccounts(count: number): SubscriptionPlan {
  if (count <= 2) return 'free'
  if (count <= 5) return 'starter'
  if (count <= 10) return 'basic'
  if (count <= 25) return 'pro'
  if (count <= 50) return 'business'
  return 'enterprise'
}

export function getMaxAccountsForPlan(plan: SubscriptionPlan): number {
  return PLANS[plan].maxAccounts
}
