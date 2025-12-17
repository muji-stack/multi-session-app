// License Check Hook
// Provides easy license validation for components

import { useState, useCallback } from 'react'
import { useLicenseStore } from '@stores/licenseStore'
import { useAuthStore } from '@stores/authStore'
import type { LicenseCheckResult } from '@shared/licenseTypes'
import type { SubscriptionPlan } from '@shared/billingTypes'

interface UseLicenseCheckOptions {
  onUpgradeRequired?: (result: LicenseCheckResult) => void
}

interface UseLicenseCheckReturn {
  isChecking: boolean
  canAddAccount: () => Promise<LicenseCheckResult>
  canPost: () => Promise<LicenseCheckResult>
  canSchedulePost: () => Promise<LicenseCheckResult>
  canUseAutomation: () => Promise<LicenseCheckResult>
  canUseWorkflows: () => Promise<LicenseCheckResult>
  canUseMonitoring: () => Promise<LicenseCheckResult>
  checkAndExecute: <T>(
    action: 'post' | 'schedule' | 'automation' | 'workflow' | 'monitoring' | 'addAccount',
    callback: () => T | Promise<T>
  ) => Promise<{ success: boolean; result?: T; error?: LicenseCheckResult }>
}

export function useLicenseCheck(options: UseLicenseCheckOptions = {}): UseLicenseCheckReturn {
  const { onUpgradeRequired } = options
  const [isChecking, setIsChecking] = useState(false)
  const { checkAction, checkAccountLimit } = useLicenseStore()
  const { user } = useAuthStore()

  const getUserId = useCallback(() => {
    return user?.uid || 'local-user'
  }, [user])

  const handleResult = useCallback(
    (result: LicenseCheckResult) => {
      if (!result.allowed && result.upgradeRequired && onUpgradeRequired) {
        onUpgradeRequired(result)
      }
      return result
    },
    [onUpgradeRequired]
  )

  const canAddAccount = useCallback(async (): Promise<LicenseCheckResult> => {
    setIsChecking(true)
    try {
      const result = await checkAccountLimit(getUserId())
      return handleResult(result)
    } finally {
      setIsChecking(false)
    }
  }, [checkAccountLimit, getUserId, handleResult])

  const canPost = useCallback(async (): Promise<LicenseCheckResult> => {
    setIsChecking(true)
    try {
      const result = await checkAction(getUserId(), 'post')
      return handleResult(result)
    } finally {
      setIsChecking(false)
    }
  }, [checkAction, getUserId, handleResult])

  const canSchedulePost = useCallback(async (): Promise<LicenseCheckResult> => {
    setIsChecking(true)
    try {
      const result = await checkAction(getUserId(), 'schedule')
      return handleResult(result)
    } finally {
      setIsChecking(false)
    }
  }, [checkAction, getUserId, handleResult])

  const canUseAutomation = useCallback(async (): Promise<LicenseCheckResult> => {
    setIsChecking(true)
    try {
      const result = await checkAction(getUserId(), 'automation')
      return handleResult(result)
    } finally {
      setIsChecking(false)
    }
  }, [checkAction, getUserId, handleResult])

  const canUseWorkflows = useCallback(async (): Promise<LicenseCheckResult> => {
    setIsChecking(true)
    try {
      const result = await checkAction(getUserId(), 'workflow')
      return handleResult(result)
    } finally {
      setIsChecking(false)
    }
  }, [checkAction, getUserId, handleResult])

  const canUseMonitoring = useCallback(async (): Promise<LicenseCheckResult> => {
    setIsChecking(true)
    try {
      const result = await checkAction(getUserId(), 'monitoring')
      return handleResult(result)
    } finally {
      setIsChecking(false)
    }
  }, [checkAction, getUserId, handleResult])

  const checkAndExecute = useCallback(
    async <T>(
      action: 'post' | 'schedule' | 'automation' | 'workflow' | 'monitoring' | 'addAccount',
      callback: () => T | Promise<T>
    ): Promise<{ success: boolean; result?: T; error?: LicenseCheckResult }> => {
      setIsChecking(true)
      try {
        const result =
          action === 'addAccount'
            ? await checkAccountLimit(getUserId())
            : await checkAction(getUserId(), action)

        if (!result.allowed) {
          handleResult(result)
          return { success: false, error: result }
        }

        const callbackResult = await callback()
        return { success: true, result: callbackResult }
      } finally {
        setIsChecking(false)
      }
    },
    [checkAccountLimit, checkAction, getUserId, handleResult]
  )

  return {
    isChecking,
    canAddAccount,
    canPost,
    canSchedulePost,
    canUseAutomation,
    canUseWorkflows,
    canUseMonitoring,
    checkAndExecute,
  }
}

// Helper to get feature name in Japanese
export function getFeatureName(
  action: 'post' | 'schedule' | 'automation' | 'workflow' | 'monitoring' | 'addAccount'
): string {
  switch (action) {
    case 'post':
      return '投稿'
    case 'schedule':
      return '予約投稿'
    case 'automation':
      return '自動化'
    case 'workflow':
      return 'ワークフロー'
    case 'monitoring':
      return 'モニタリング'
    case 'addAccount':
      return 'アカウント追加'
    default:
      return action
  }
}

// Helper to get required plan name in Japanese
export function getPlanName(plan: SubscriptionPlan): string {
  const planNames: Record<SubscriptionPlan, string> = {
    free: '無料',
    starter: 'Starter',
    basic: 'Basic',
    pro: 'Pro',
    business: 'Business',
    enterprise: 'Enterprise',
  }
  return planNames[plan] || plan
}
