import { create } from 'zustand'
import type { SecurityConfig, LockState } from '../../shared/types'

interface SecurityState {
  config: SecurityConfig | null
  lockState: LockState
  hasMasterPassword: boolean
  isLoading: boolean
  error: string | null
  isLocked: boolean

  // Initialize and listeners
  initialize: () => Promise<void>
  setupListeners: () => () => void

  // Config actions
  fetchConfig: () => Promise<void>
  updateConfig: (updates: Partial<Pick<SecurityConfig, 'autoLockMinutes' | 'lockOnMinimize' | 'lockOnSleep' | 'encryptSessionData'>>) => Promise<void>

  // Master password actions
  checkMasterPassword: () => Promise<void>
  setMasterPassword: (password: string) => Promise<{ success: boolean; error?: string }>
  changeMasterPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  removeMasterPassword: (password: string) => Promise<{ success: boolean; error?: string }>

  // Lock actions
  fetchLockState: () => Promise<void>
  lock: () => Promise<{ success: boolean; error?: string }>
  unlock: (password: string) => Promise<{ success: boolean; error?: string; attemptsRemaining?: number }>

  // Helper
  clearError: () => void
}

export const useSecurityStore = create<SecurityState>((set, get) => ({
  config: null,
  lockState: {
    isLocked: false,
    lockedAt: null,
    failedAttempts: 0,
    lastFailedAt: null
  },
  hasMasterPassword: false,
  isLoading: false,
  error: null,
  isLocked: false,

  initialize: async () => {
    await get().fetchConfig()
    await get().checkMasterPassword()
    await get().fetchLockState()
    // Update isLocked based on lockState
    set({ isLocked: get().lockState.isLocked })
  },

  setupListeners: () => {
    const unsubLocked = window.api.security.onLocked(() => {
      set({
        isLocked: true,
        lockState: {
          ...get().lockState,
          isLocked: true,
          lockedAt: Date.now()
        }
      })
    })

    const unsubUnlocked = window.api.security.onUnlocked(() => {
      set({
        isLocked: false,
        lockState: {
          isLocked: false,
          lockedAt: null,
          failedAttempts: 0,
          lastFailedAt: null
        }
      })
    })

    return () => {
      unsubLocked()
      unsubUnlocked()
    }
  },

  fetchConfig: async () => {
    set({ isLoading: true, error: null })
    try {
      const config = (await window.api.security.getConfig()) as SecurityConfig
      set({ config, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  updateConfig: async (updates) => {
    set({ error: null })
    try {
      const config = (await window.api.security.updateConfig(updates)) as SecurityConfig
      set({ config })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  checkMasterPassword: async () => {
    try {
      const hasMasterPassword = await window.api.security.hasMasterPassword()
      set({ hasMasterPassword })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  setMasterPassword: async (password: string) => {
    set({ isLoading: true, error: null })
    try {
      const result = await window.api.security.setMasterPassword(password)
      if (result.success) {
        set({ hasMasterPassword: true, isLoading: false })
        // Refresh config
        get().fetchConfig()
      } else {
        set({ error: result.error, isLoading: false })
      }
      return result
    } catch (error) {
      const errorMsg = (error as Error).message
      set({ error: errorMsg, isLoading: false })
      return { success: false, error: errorMsg }
    }
  },

  changeMasterPassword: async (currentPassword: string, newPassword: string) => {
    set({ isLoading: true, error: null })
    try {
      const result = await window.api.security.changeMasterPassword(currentPassword, newPassword)
      if (!result.success) {
        set({ error: result.error })
      }
      set({ isLoading: false })
      return result
    } catch (error) {
      const errorMsg = (error as Error).message
      set({ error: errorMsg, isLoading: false })
      return { success: false, error: errorMsg }
    }
  },

  removeMasterPassword: async (password: string) => {
    set({ isLoading: true, error: null })
    try {
      const result = await window.api.security.removeMasterPassword(password)
      if (result.success) {
        set({
          hasMasterPassword: false,
          lockState: {
            isLocked: false,
            lockedAt: null,
            failedAttempts: 0,
            lastFailedAt: null
          },
          isLoading: false
        })
        // Refresh config
        get().fetchConfig()
      } else {
        set({ error: result.error, isLoading: false })
      }
      return result
    } catch (error) {
      const errorMsg = (error as Error).message
      set({ error: errorMsg, isLoading: false })
      return { success: false, error: errorMsg }
    }
  },

  fetchLockState: async () => {
    try {
      const lockState = await window.api.security.getLockState()
      set({ lockState })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  lock: async () => {
    set({ error: null })
    try {
      const result = await window.api.security.lock()
      if (result.success) {
        set({
          isLocked: true,
          lockState: {
            ...get().lockState,
            isLocked: true,
            lockedAt: Date.now()
          }
        })
      }
      return result
    } catch (error) {
      const errorMsg = (error as Error).message
      set({ error: errorMsg })
      return { success: false, error: errorMsg }
    }
  },

  unlock: async (password: string) => {
    set({ isLoading: true, error: null })
    try {
      const result = await window.api.security.unlock(password)
      if (result.success) {
        set({
          isLocked: false,
          lockState: {
            isLocked: false,
            lockedAt: null,
            failedAttempts: 0,
            lastFailedAt: null
          },
          isLoading: false
        })
      } else {
        set({
          lockState: {
            ...get().lockState,
            failedAttempts: get().lockState.failedAttempts + 1,
            lastFailedAt: Date.now()
          },
          error: result.error,
          isLoading: false
        })
      }
      return result
    } catch (error) {
      const errorMsg = (error as Error).message
      set({ error: errorMsg, isLoading: false })
      return { success: false, error: errorMsg }
    }
  },

  clearError: () => set({ error: null })
}))
