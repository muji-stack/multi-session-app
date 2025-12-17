// License Store
// Manages license state and feature access in the renderer

import { create } from 'zustand'
import type { LicenseStatus, FeatureAccess, LicenseCheckResult } from '@shared/licenseTypes'

interface LicenseState {
  // State
  license: LicenseStatus | null
  featureAccess: FeatureAccess | null
  isLoading: boolean
  error: string | null
  lastCheckedAt: number | null

  // Actions
  fetchLicense: (userId: string) => Promise<void>
  fetchFeatureAccess: (userId: string) => Promise<void>
  checkAccountLimit: (userId: string) => Promise<LicenseCheckResult>
  checkAction: (
    userId: string,
    action: 'post' | 'schedule' | 'automation' | 'workflow' | 'monitoring' | 'addAccount'
  ) => Promise<LicenseCheckResult>
  clearCache: () => Promise<void>
  setLicense: (license: LicenseStatus) => void
  clearError: () => void
}

export const useLicenseStore = create<LicenseState>((set, get) => ({
  // Initial state
  license: null,
  featureAccess: null,
  isLoading: false,
  error: null,
  lastCheckedAt: null,

  // Fetch license status
  fetchLicense: async (userId: string) => {
    set({ isLoading: true, error: null })

    try {
      const license = await window.api.license.validate(userId)
      set({
        license: license as LicenseStatus,
        isLoading: false,
        lastCheckedAt: Date.now(),
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'ライセンスの取得に失敗しました',
      })
    }
  },

  // Fetch feature access
  fetchFeatureAccess: async (userId: string) => {
    set({ isLoading: true, error: null })

    try {
      const access = await window.api.license.getFeatureAccess(userId)
      set({
        featureAccess: access as FeatureAccess,
        isLoading: false,
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '機能アクセスの取得に失敗しました',
      })
    }
  },

  // Check if user can add more accounts
  checkAccountLimit: async (userId: string): Promise<LicenseCheckResult> => {
    try {
      const result = await window.api.license.checkAccountLimit(userId)
      return result as LicenseCheckResult
    } catch (error) {
      return {
        allowed: false,
        reason: error instanceof Error ? error.message : 'アカウント上限の確認に失敗しました',
      }
    }
  },

  // Check if specific action is allowed
  checkAction: async (
    userId: string,
    action: 'post' | 'schedule' | 'automation' | 'workflow' | 'monitoring' | 'addAccount'
  ): Promise<LicenseCheckResult> => {
    try {
      const result = await window.api.license.checkAction(userId, action)
      return result as LicenseCheckResult
    } catch (error) {
      return {
        allowed: false,
        reason: error instanceof Error ? error.message : '操作の確認に失敗しました',
      }
    }
  },

  // Clear license cache
  clearCache: async () => {
    try {
      await window.api.license.clearCache()
      set({ license: null, featureAccess: null, lastCheckedAt: null })
    } catch (error) {
      console.error('Failed to clear license cache:', error)
    }
  },

  // Set license (from IPC event)
  setLicense: (license: LicenseStatus) => {
    set({ license, lastCheckedAt: Date.now() })
  },

  // Clear error
  clearError: () => {
    set({ error: null })
  },
}))

// Setup license status change listener
export function setupLicenseListener(): () => void {
  const unsubscribe = window.api.license.onStatusChanged((license) => {
    useLicenseStore.getState().setLicense(license as LicenseStatus)
  })

  return unsubscribe
}

// Helper hooks
export function useLicenseStatus() {
  return useLicenseStore((state) => state.license)
}

export function useFeatureAccess() {
  return useLicenseStore((state) => state.featureAccess)
}

export function useIsLicenseValid() {
  return useLicenseStore((state) => state.license?.isValid ?? false)
}

export function useIsTrial() {
  return useLicenseStore((state) => state.license?.status === 'trial')
}

export function useTrialDaysRemaining() {
  return useLicenseStore((state) => {
    if (state.license?.status === 'trial') {
      return state.license.daysRemaining
    }
    return null
  })
}

export function useCanAddAccount() {
  return useLicenseStore((state) => state.featureAccess?.canAddAccount ?? false)
}

export function useCanPost() {
  return useLicenseStore((state) => state.featureAccess?.canPost ?? false)
}

export function useCanSchedulePost() {
  return useLicenseStore((state) => state.featureAccess?.canSchedulePost ?? false)
}

export function useCanUseAutomation() {
  return useLicenseStore((state) => state.featureAccess?.canUseAutomation ?? false)
}

export function useCanUseWorkflows() {
  return useLicenseStore((state) => state.featureAccess?.canUseWorkflows ?? false)
}

export function useCanUseMonitoring() {
  return useLicenseStore((state) => state.featureAccess?.canUseMonitoring ?? false)
}
