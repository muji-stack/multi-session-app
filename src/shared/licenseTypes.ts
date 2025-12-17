// License Types

import type { SubscriptionPlan, SubscriptionStatus } from './billingTypes'

export type LicenseStatusType = 'active' | 'trial' | 'expired' | 'payment_failed' | 'grace_period' | 'none'

export interface LicenseStatus {
  isValid: boolean
  plan: SubscriptionPlan
  maxAccounts: number
  currentAccounts: number
  expiresAt: number | null
  trialEndsAt: number | null
  status: LicenseStatusType
  subscriptionStatus: SubscriptionStatus
  message: string
  daysRemaining: number | null
  gracePeriodEndsAt: number | null
}

export interface FeatureAccess {
  canAddAccount: boolean
  canPost: boolean
  canSchedulePost: boolean
  canUseAutomation: boolean
  canUseWorkflows: boolean
  canUseMonitoring: boolean
  canExportData: boolean
  canImportData: boolean
  maxAccountsAllowed: number
  reason?: string
}

export interface LicenseCheckResult {
  allowed: boolean
  reason?: string
  upgradeRequired?: boolean
  currentLimit?: number
  requiredPlan?: SubscriptionPlan
}

// Trial period configuration
export const TRIAL_PERIOD_DAYS = 14
export const GRACE_PERIOD_DAYS = 7

// Feature access by plan
export const PLAN_FEATURES: Record<SubscriptionPlan, {
  canUseAutomation: boolean
  canUseWorkflows: boolean
  canUseMonitoring: boolean
  canSchedulePost: boolean
  canExportData: boolean
  canImportData: boolean
}> = {
  free: {
    canUseAutomation: false,
    canUseWorkflows: false,
    canUseMonitoring: false,
    canSchedulePost: false,
    canExportData: true,
    canImportData: true,
  },
  starter: {
    canUseAutomation: true,
    canUseWorkflows: false,
    canUseMonitoring: false,
    canSchedulePost: true,
    canExportData: true,
    canImportData: true,
  },
  basic: {
    canUseAutomation: true,
    canUseWorkflows: true,
    canUseMonitoring: true,
    canSchedulePost: true,
    canExportData: true,
    canImportData: true,
  },
  pro: {
    canUseAutomation: true,
    canUseWorkflows: true,
    canUseMonitoring: true,
    canSchedulePost: true,
    canExportData: true,
    canImportData: true,
  },
  business: {
    canUseAutomation: true,
    canUseWorkflows: true,
    canUseMonitoring: true,
    canSchedulePost: true,
    canExportData: true,
    canImportData: true,
  },
  enterprise: {
    canUseAutomation: true,
    canUseWorkflows: true,
    canUseMonitoring: true,
    canSchedulePost: true,
    canExportData: true,
    canImportData: true,
  },
}
