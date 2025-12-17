// Sync Store
// Manages sync state and operations in the renderer

import { create } from 'zustand'
import type { DeviceInfo, SyncResult, SyncStatus } from '@shared/syncTypes'

interface SyncState {
  // State
  devices: DeviceInfo[]
  currentDevice: DeviceInfo | null
  status: SyncStatus
  isLoading: boolean
  error: string | null

  // Actions
  fetchDevices: (userId: string) => Promise<void>
  fetchCurrentDevice: () => Promise<void>
  fetchStatus: (userId: string) => Promise<void>
  registerDevice: (userId: string) => Promise<boolean>
  removeDevice: (userId: string, deviceId: string) => Promise<boolean>
  setPassword: (password: string) => Promise<boolean>
  hasPassword: () => Promise<boolean>
  clearPassword: () => Promise<void>
  syncToCloud: (userId: string) => Promise<SyncResult | null>
  syncFromCloud: (userId: string) => Promise<SyncResult | null>
  clearError: () => void
}

export const useSyncStore = create<SyncState>((set, get) => ({
  // Initial state
  devices: [],
  currentDevice: null,
  status: {
    lastSyncAt: null,
    isSyncing: false,
    lastError: null,
    conflictCount: 0,
  },
  isLoading: false,
  error: null,

  // Fetch registered devices
  fetchDevices: async (userId: string) => {
    set({ isLoading: true, error: null })
    try {
      const devices = await window.api.sync.getDevices(userId)
      set({ devices, isLoading: false })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'デバイス一覧の取得に失敗しました',
      })
    }
  },

  // Fetch current device info
  fetchCurrentDevice: async () => {
    try {
      const device = await window.api.sync.getCurrentDevice()
      set({ currentDevice: device })
    } catch (error) {
      console.error('Failed to fetch current device:', error)
    }
  },

  // Fetch sync status
  fetchStatus: async (userId: string) => {
    try {
      const status = await window.api.sync.getStatus(userId)
      set({
        status: {
          lastSyncAt: status.lastSyncAt,
          isSyncing: status.isSyncing,
          lastError: status.lastError,
          conflictCount: 0,
        },
      })
    } catch (error) {
      console.error('Failed to fetch sync status:', error)
    }
  },

  // Register current device
  registerDevice: async (userId: string) => {
    set({ isLoading: true, error: null })
    try {
      const result = await window.api.sync.registerDevice(userId)
      if (result.success && result.device) {
        set({ currentDevice: result.device, isLoading: false })
        // Refresh device list
        await get().fetchDevices(userId)
        return true
      } else {
        set({ isLoading: false, error: result.error || 'デバイスの登録に失敗しました' })
        return false
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'デバイスの登録に失敗しました',
      })
      return false
    }
  },

  // Remove a device
  removeDevice: async (userId: string, deviceId: string) => {
    set({ isLoading: true, error: null })
    try {
      const result = await window.api.sync.removeDevice(userId, deviceId)
      if (result.success) {
        // Refresh device list
        await get().fetchDevices(userId)
        set({ isLoading: false })
        return true
      } else {
        set({ isLoading: false, error: result.error || 'デバイスの削除に失敗しました' })
        return false
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'デバイスの削除に失敗しました',
      })
      return false
    }
  },

  // Set sync password
  setPassword: async (password: string) => {
    try {
      const result = await window.api.sync.setPassword(password)
      return result.success
    } catch (error) {
      console.error('Failed to set sync password:', error)
      return false
    }
  },

  // Check if password is set
  hasPassword: async () => {
    try {
      return await window.api.sync.hasPassword()
    } catch (error) {
      console.error('Failed to check sync password:', error)
      return false
    }
  },

  // Clear sync password
  clearPassword: async () => {
    try {
      await window.api.sync.clearPassword()
    } catch (error) {
      console.error('Failed to clear sync password:', error)
    }
  },

  // Sync to cloud
  syncToCloud: async (userId: string) => {
    set({
      status: { ...get().status, isSyncing: true, lastError: null },
      error: null,
    })

    try {
      const result = await window.api.sync.toCloud(userId)

      if (result.success) {
        set({
          status: {
            lastSyncAt: result.syncedAt || Date.now(),
            isSyncing: false,
            lastError: null,
            conflictCount: result.conflicts?.length || 0,
          },
        })
        return result as SyncResult
      } else {
        set({
          status: { ...get().status, isSyncing: false, lastError: result.error || null },
          error: result.error || '同期に失敗しました',
        })
        return null
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '同期に失敗しました'
      set({
        status: { ...get().status, isSyncing: false, lastError: errorMsg },
        error: errorMsg,
      })
      return null
    }
  },

  // Sync from cloud
  syncFromCloud: async (userId: string) => {
    set({
      status: { ...get().status, isSyncing: true, lastError: null },
      error: null,
    })

    try {
      const result = await window.api.sync.fromCloud(userId)

      if (result.success) {
        set({
          status: {
            lastSyncAt: result.syncedAt || Date.now(),
            isSyncing: false,
            lastError: null,
            conflictCount: result.conflicts?.length || 0,
          },
        })
        return result as SyncResult
      } else {
        set({
          status: { ...get().status, isSyncing: false, lastError: result.error || null },
          error: result.error || '同期に失敗しました',
        })
        return null
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '同期に失敗しました'
      set({
        status: { ...get().status, isSyncing: false, lastError: errorMsg },
        error: errorMsg,
      })
      return null
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null })
  },
}))

// Helper hooks
export function useSyncStatus() {
  return useSyncStore((state) => state.status)
}

export function useDevices() {
  return useSyncStore((state) => state.devices)
}

export function useCurrentDevice() {
  return useSyncStore((state) => state.currentDevice)
}

export function useIsSyncing() {
  return useSyncStore((state) => state.status.isSyncing)
}

export function useLastSyncTime() {
  return useSyncStore((state) => state.status.lastSyncAt)
}
