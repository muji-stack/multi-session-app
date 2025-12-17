// License Service
// Handles license validation and feature access control

import { getSubscription } from './billingService'
import { getAllAccounts } from '../database/accountRepository'
import { PLANS } from '../../shared/billingTypes'
import type { SubscriptionPlan } from '../../shared/billingTypes'
import type {
  LicenseStatus,
  LicenseStatusType,
  FeatureAccess,
  LicenseCheckResult,
} from '../../shared/licenseTypes'
import {
  TRIAL_PERIOD_DAYS,
  GRACE_PERIOD_DAYS,
  PLAN_FEATURES,
} from '../../shared/licenseTypes'

// In-memory cache for license status
let cachedLicense: LicenseStatus | null = null
let lastCheckTime: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Trial start date storage (would be stored in database in production)
let trialStartDate: number | null = null

/**
 * Get or set trial start date
 */
function getTrialStartDate(): number {
  if (!trialStartDate) {
    // In production, this would be stored in the database
    trialStartDate = Date.now()
  }
  return trialStartDate
}

/**
 * Calculate days remaining
 */
function calculateDaysRemaining(endDate: number | null): number | null {
  if (!endDate) return null
  const now = Date.now()
  const remaining = Math.ceil((endDate - now) / (24 * 60 * 60 * 1000))
  return Math.max(0, remaining)
}

/**
 * Validate license and get current status
 */
export async function validateLicense(userId: string): Promise<LicenseStatus> {
  // Check cache first
  const now = Date.now()
  if (cachedLicense && now - lastCheckTime < CACHE_DURATION) {
    // Update current accounts count
    const accounts = getAllAccounts()
    cachedLicense.currentAccounts = accounts.length
    return cachedLicense
  }

  try {
    const subscription = await getSubscription(userId)
    const accounts = getAllAccounts()
    const currentAccounts = accounts.length

    let status: LicenseStatusType = 'none'
    let isValid = false
    let message = ''
    let expiresAt: number | null = null
    let trialEndsAt: number | null = null
    let gracePeriodEndsAt: number | null = null
    let daysRemaining: number | null = null

    const plan = subscription.plan
    const maxAccounts = PLANS[plan].maxAccounts

    // Determine license status
    if (subscription.status === 'active') {
      status = 'active'
      isValid = true
      expiresAt = subscription.currentPeriodEnd
      daysRemaining = calculateDaysRemaining(expiresAt)
      message = `${PLANS[plan].name}プランをご利用中です`
    } else if (subscription.status === 'trialing') {
      status = 'trial'
      isValid = true
      const trialStart = getTrialStartDate()
      trialEndsAt = trialStart + TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000
      daysRemaining = calculateDaysRemaining(trialEndsAt)
      if (daysRemaining !== null && daysRemaining > 0) {
        message = `トライアル期間中（残り${daysRemaining}日）`
      } else {
        status = 'expired'
        isValid = false
        message = 'トライアル期間が終了しました'
      }
    } else if (subscription.status === 'past_due') {
      status = 'payment_failed'
      // Grace period: 7 days after payment failure
      if (subscription.currentPeriodEnd) {
        gracePeriodEndsAt = subscription.currentPeriodEnd + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
        daysRemaining = calculateDaysRemaining(gracePeriodEndsAt)
        if (daysRemaining !== null && daysRemaining > 0) {
          status = 'grace_period'
          isValid = true
          message = `支払いに失敗しました。${daysRemaining}日以内に更新してください`
        } else {
          isValid = false
          message = '支払いの猶予期間が終了しました'
        }
      } else {
        isValid = false
        message = '支払いに失敗しました。請求情報を更新してください'
      }
    } else if (subscription.status === 'canceled') {
      // Check if still within the paid period
      if (subscription.currentPeriodEnd && subscription.currentPeriodEnd > now) {
        status = 'active'
        isValid = true
        expiresAt = subscription.currentPeriodEnd
        daysRemaining = calculateDaysRemaining(expiresAt)
        message = `プランは${new Date(expiresAt).toLocaleDateString('ja-JP')}に終了します`
      } else {
        status = 'expired'
        isValid = false
        message = 'サブスクリプションが終了しました'
      }
    } else {
      // No subscription - check trial
      const trialStart = getTrialStartDate()
      trialEndsAt = trialStart + TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000
      daysRemaining = calculateDaysRemaining(trialEndsAt)

      if (daysRemaining !== null && daysRemaining > 0) {
        status = 'trial'
        isValid = true
        message = `無料トライアル中（残り${daysRemaining}日）`
      } else {
        status = 'none'
        isValid = false
        message = 'サブスクリプションが必要です'
      }
    }

    const licenseStatus: LicenseStatus = {
      isValid,
      plan,
      maxAccounts,
      currentAccounts,
      expiresAt,
      trialEndsAt,
      status,
      subscriptionStatus: subscription.status,
      message,
      daysRemaining,
      gracePeriodEndsAt,
    }

    // Update cache
    cachedLicense = licenseStatus
    lastCheckTime = now

    return licenseStatus
  } catch (error) {
    console.error('Error validating license:', error)

    // Return a default trial license on error
    const accounts = getAllAccounts()
    const trialStart = getTrialStartDate()
    const trialEndsAt = trialStart + TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000
    const daysRemaining = calculateDaysRemaining(trialEndsAt)

    return {
      isValid: daysRemaining !== null && daysRemaining > 0,
      plan: 'free',
      maxAccounts: PLANS.free.maxAccounts,
      currentAccounts: accounts.length,
      expiresAt: null,
      trialEndsAt,
      status: daysRemaining !== null && daysRemaining > 0 ? 'trial' : 'none',
      subscriptionStatus: 'none',
      message: daysRemaining !== null && daysRemaining > 0
        ? `無料トライアル中（残り${daysRemaining}日）`
        : 'サブスクリプションが必要です',
      daysRemaining,
      gracePeriodEndsAt: null,
    }
  }
}

/**
 * Check if user can add more accounts
 */
export async function checkAccountLimit(userId: string): Promise<LicenseCheckResult> {
  const license = await validateLicense(userId)

  if (!license.isValid) {
    return {
      allowed: false,
      reason: license.message,
      upgradeRequired: true,
    }
  }

  if (license.currentAccounts >= license.maxAccounts) {
    return {
      allowed: false,
      reason: `アカウント上限（${license.maxAccounts}）に達しています`,
      upgradeRequired: true,
      currentLimit: license.maxAccounts,
      requiredPlan: getNextPlan(license.plan),
    }
  }

  return {
    allowed: true,
  }
}

/**
 * Get the next higher plan
 */
function getNextPlan(currentPlan: SubscriptionPlan): SubscriptionPlan {
  const planOrder: SubscriptionPlan[] = ['free', 'starter', 'basic', 'pro', 'business', 'enterprise']
  const currentIndex = planOrder.indexOf(currentPlan)
  if (currentIndex < planOrder.length - 1) {
    return planOrder[currentIndex + 1]
  }
  return 'enterprise'
}

/**
 * Get feature access based on license
 */
export async function getFeatureAccess(userId: string): Promise<FeatureAccess> {
  const license = await validateLicense(userId)

  // If license is not valid (expired, etc.)
  if (!license.isValid) {
    return {
      canAddAccount: false,
      canPost: false,
      canSchedulePost: false,
      canUseAutomation: false,
      canUseWorkflows: false,
      canUseMonitoring: false,
      canExportData: true, // Allow data export even when expired
      canImportData: false,
      maxAccountsAllowed: 0,
      reason: license.message,
    }
  }

  const planFeatures = PLAN_FEATURES[license.plan]
  const canAddMore = license.currentAccounts < license.maxAccounts

  // During trial, allow all features
  if (license.status === 'trial') {
    return {
      canAddAccount: canAddMore,
      canPost: true,
      canSchedulePost: true,
      canUseAutomation: true,
      canUseWorkflows: true,
      canUseMonitoring: true,
      canExportData: true,
      canImportData: true,
      maxAccountsAllowed: license.maxAccounts,
    }
  }

  // During grace period, allow basic features but show warning
  if (license.status === 'grace_period') {
    return {
      canAddAccount: false, // Don't allow adding accounts during grace period
      canPost: true,
      canSchedulePost: false,
      canUseAutomation: false,
      canUseWorkflows: false,
      canUseMonitoring: true,
      canExportData: true,
      canImportData: false,
      maxAccountsAllowed: license.maxAccounts,
      reason: license.message,
    }
  }

  return {
    canAddAccount: canAddMore,
    canPost: true,
    canSchedulePost: planFeatures.canSchedulePost,
    canUseAutomation: planFeatures.canUseAutomation,
    canUseWorkflows: planFeatures.canUseWorkflows,
    canUseMonitoring: planFeatures.canUseMonitoring,
    canExportData: planFeatures.canExportData,
    canImportData: planFeatures.canImportData,
    maxAccountsAllowed: license.maxAccounts,
  }
}

/**
 * Check if a specific action is allowed
 */
export async function checkActionAllowed(
  userId: string,
  action: 'post' | 'schedule' | 'automation' | 'workflow' | 'monitoring' | 'addAccount'
): Promise<LicenseCheckResult> {
  const access = await getFeatureAccess(userId)

  switch (action) {
    case 'post':
      return {
        allowed: access.canPost,
        reason: access.canPost ? undefined : access.reason || 'この操作は許可されていません',
      }
    case 'schedule':
      return {
        allowed: access.canSchedulePost,
        reason: access.canSchedulePost ? undefined : '予約投稿にはStarterプラン以上が必要です',
        upgradeRequired: !access.canSchedulePost,
        requiredPlan: 'starter',
      }
    case 'automation':
      return {
        allowed: access.canUseAutomation,
        reason: access.canUseAutomation ? undefined : '自動化機能にはStarterプラン以上が必要です',
        upgradeRequired: !access.canUseAutomation,
        requiredPlan: 'starter',
      }
    case 'workflow':
      return {
        allowed: access.canUseWorkflows,
        reason: access.canUseWorkflows ? undefined : 'ワークフロー機能にはBasicプラン以上が必要です',
        upgradeRequired: !access.canUseWorkflows,
        requiredPlan: 'basic',
      }
    case 'monitoring':
      return {
        allowed: access.canUseMonitoring,
        reason: access.canUseMonitoring ? undefined : 'モニタリング機能にはBasicプラン以上が必要です',
        upgradeRequired: !access.canUseMonitoring,
        requiredPlan: 'basic',
      }
    case 'addAccount':
      return checkAccountLimit(userId)
    default:
      return { allowed: true }
  }
}

/**
 * Clear license cache (call when subscription changes)
 */
export function clearLicenseCache(): void {
  cachedLicense = null
  lastCheckTime = 0
}

/**
 * Set trial start date (for testing or when user first registers)
 */
export function setTrialStartDate(date: number): void {
  trialStartDate = date
  clearLicenseCache()
}
