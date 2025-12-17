// Sync IPC Handlers
// Handles sync-related IPC messages

import { ipcMain } from 'electron'
import type {
  DeviceInfo,
  SyncResult,
  EncryptedSyncData,
  SyncData,
} from '../../shared/syncTypes'
import {
  getDeviceId,
  getDeviceName,
  getCurrentDeviceInfo,
  exportSyncData,
  encryptForCloud,
  decryptFromCloud,
  resolveConflicts,
  setSyncPassword,
  hasSyncPassword,
  clearSyncPassword,
  getUserSyncSalt,
  setUserSyncSalt,
} from '../services/syncService'
import { createAccount, updateAccount, deleteAccount, getAllAccounts } from '../database/accountRepository'
import { createGroup, updateGroup, deleteGroup, getAllGroups } from '../database/groupRepository'
import { createProxy, updateProxy, deleteProxy, getAllProxies } from '../database/proxyRepository'
import { createTemplate, updateTemplate, deleteTemplate, getAllTemplates } from '../database/postRepository'
import {
  createAutomationTask as createAutomation,
  updateAutomationTask as updateAutomation,
  deleteAutomationTask as deleteAutomation,
  getAllAutomationTasks as getAllAutomations,
} from '../database/automationRepository'

// In-memory device storage (in production, this would come from Firestore)
const deviceStorage = new Map<string, DeviceInfo[]>()

// In-memory sync data storage (in production, this would be Firestore)
const syncDataStorage = new Map<string, { data: EncryptedSyncData; salt: string; timestamp: number }>()

// Last sync timestamps per user
const lastSyncTimes = new Map<string, number>()

export function registerSyncHandlers(): void {
  // Get device ID
  ipcMain.handle('sync:get-device-id', async () => {
    return getDeviceId()
  })

  // Get current device info
  ipcMain.handle('sync:get-current-device', async () => {
    return getCurrentDeviceInfo()
  })

  // Set sync password
  ipcMain.handle('sync:set-password', async (_event, password: string) => {
    setSyncPassword(password)
    return { success: true }
  })

  // Check if sync password is set
  ipcMain.handle('sync:has-password', async () => {
    return hasSyncPassword()
  })

  // Clear sync password
  ipcMain.handle('sync:clear-password', async () => {
    clearSyncPassword()
    return { success: true }
  })

  // Register device
  ipcMain.handle('sync:register-device', async (_event, userId: string) => {
    try {
      const deviceInfo = getCurrentDeviceInfo()
      deviceInfo.createdAt = Date.now()

      // Get existing devices
      let devices = deviceStorage.get(userId) || []

      // Check if device already registered
      const existingIndex = devices.findIndex((d) => d.id === deviceInfo.id)
      if (existingIndex >= 0) {
        devices[existingIndex] = { ...deviceInfo, createdAt: devices[existingIndex].createdAt }
      } else {
        devices.push(deviceInfo)
      }

      deviceStorage.set(userId, devices)

      console.log(`[Sync] Device registered: ${deviceInfo.name}`)
      return { success: true, device: deviceInfo }
    } catch (error) {
      console.error('[Sync] Failed to register device:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register device',
      }
    }
  })

  // Get registered devices
  ipcMain.handle('sync:get-devices', async (_event, userId: string) => {
    try {
      const devices = deviceStorage.get(userId) || []
      const currentDeviceId = getDeviceId()

      return devices.map((d) => ({
        ...d,
        isCurrentDevice: d.id === currentDeviceId,
      }))
    } catch (error) {
      console.error('[Sync] Failed to get devices:', error)
      return []
    }
  })

  // Remove device
  ipcMain.handle('sync:remove-device', async (_event, userId: string, deviceId: string) => {
    try {
      const devices = deviceStorage.get(userId) || []
      const filteredDevices = devices.filter((d) => d.id !== deviceId)
      deviceStorage.set(userId, filteredDevices)

      console.log(`[Sync] Device removed: ${deviceId}`)
      return { success: true }
    } catch (error) {
      console.error('[Sync] Failed to remove device:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove device',
      }
    }
  })

  // Sync to cloud
  ipcMain.handle('sync:to-cloud', async (_event, userId: string) => {
    try {
      if (!hasSyncPassword()) {
        return {
          success: false,
          error: '同期パスワードが設定されていません',
        }
      }

      // Export local data
      const syncData = await exportSyncData()

      // Encrypt data
      const encryptedData = encryptForCloud(syncData, userId)
      if (!encryptedData) {
        return {
          success: false,
          error: 'データの暗号化に失敗しました',
        }
      }

      // Get salt for storage
      const salt = getUserSyncSalt(userId)

      // Store encrypted data (in production, this would go to Firestore)
      syncDataStorage.set(userId, {
        data: encryptedData,
        salt,
        timestamp: Date.now(),
      })

      // Update device last active time
      const devices = deviceStorage.get(userId) || []
      const currentDeviceId = getDeviceId()
      const updatedDevices = devices.map((d) =>
        d.id === currentDeviceId ? { ...d, lastActiveAt: Date.now() } : d
      )
      deviceStorage.set(userId, updatedDevices)

      // Update last sync time
      lastSyncTimes.set(userId, Date.now())

      console.log('[Sync] Data synced to cloud')
      return {
        success: true,
        syncedAt: Date.now(),
        itemsSynced: {
          accounts: syncData.accounts.length,
          groups: syncData.groups.length,
          proxies: syncData.proxies.length,
          templates: syncData.templates.length,
          automationTasks: syncData.automationTasks.length,
        },
        conflicts: [],
      } as SyncResult
    } catch (error) {
      console.error('[Sync] Failed to sync to cloud:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'クラウドへの同期に失敗しました',
      }
    }
  })

  // Sync from cloud
  ipcMain.handle('sync:from-cloud', async (_event, userId: string) => {
    try {
      if (!hasSyncPassword()) {
        return {
          success: false,
          error: '同期パスワードが設定されていません',
        }
      }

      // Get stored data (in production, this would come from Firestore)
      const storedData = syncDataStorage.get(userId)
      if (!storedData) {
        return {
          success: false,
          error: 'クラウドにデータがありません',
        }
      }

      // Set salt from cloud
      setUserSyncSalt(userId, storedData.salt)

      // Decrypt data
      const remoteData = decryptFromCloud(storedData.data, userId)
      if (!remoteData) {
        return {
          success: false,
          error: 'データの復号化に失敗しました。パスワードが正しいか確認してください。',
        }
      }

      // Export local data for conflict resolution
      const localData = await exportSyncData()

      // Resolve conflicts
      const { merged, conflicts } = resolveConflicts(localData, remoteData)

      // Import merged data
      await importSyncData(merged)

      // Update last sync time
      lastSyncTimes.set(userId, Date.now())

      console.log('[Sync] Data synced from cloud')
      return {
        success: true,
        syncedAt: Date.now(),
        itemsSynced: {
          accounts: merged.accounts.length,
          groups: merged.groups.length,
          proxies: merged.proxies.length,
          templates: merged.templates.length,
          automationTasks: merged.automationTasks.length,
        },
        conflicts,
      } as SyncResult
    } catch (error) {
      console.error('[Sync] Failed to sync from cloud:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'クラウドからの同期に失敗しました',
      }
    }
  })

  // Get last sync time
  ipcMain.handle('sync:get-last-sync', async (_event, userId: string) => {
    return lastSyncTimes.get(userId) || null
  })

  // Get sync status
  ipcMain.handle('sync:get-status', async (_event, userId: string) => {
    const lastSync = lastSyncTimes.get(userId) || null
    const hasData = syncDataStorage.has(userId)

    return {
      lastSyncAt: lastSync,
      hasCloudData: hasData,
      isSyncing: false,
      lastError: null,
    }
  })

  // Export local data (for manual backup)
  ipcMain.handle('sync:export-data', async () => {
    try {
      const data = await exportSyncData()
      return { success: true, data }
    } catch (error) {
      console.error('[Sync] Failed to export data:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'データのエクスポートに失敗しました',
      }
    }
  })

  // Import data (for manual restore)
  ipcMain.handle('sync:import-data', async (_event, data: SyncData) => {
    try {
      await importSyncData(data)
      return { success: true }
    } catch (error) {
      console.error('[Sync] Failed to import data:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'データのインポートに失敗しました',
      }
    }
  })
}

/**
 * Import sync data into local database
 */
async function importSyncData(data: SyncData): Promise<void> {
  // Import groups first (accounts depend on them)
  const existingGroups = getAllGroups()
  const existingGroupIds = new Set(existingGroups.map((g) => g.id))

  for (const group of data.groups) {
    if (existingGroupIds.has(group.id)) {
      updateGroup(group.id, { name: group.name, color: group.color })
    } else {
      // Create with specific ID
      createGroup(group.name, group.color)
    }
  }

  // Import proxies (accounts depend on them)
  const existingProxies = getAllProxies()
  const existingProxyIds = new Set(existingProxies.map((p) => p.id))

  for (const proxy of data.proxies) {
    if (existingProxyIds.has(proxy.id)) {
      updateProxy(proxy.id, {
        name: proxy.name,
        host: proxy.host,
        port: proxy.port,
        username: proxy.username,
        password: proxy.password,
        protocol: proxy.protocol,
        groupId: proxy.groupId,
      })
    } else {
      createProxy({
        name: proxy.name,
        host: proxy.host,
        port: proxy.port,
        username: proxy.username,
        password: proxy.password,
        protocol: proxy.protocol,
        groupId: proxy.groupId,
      })
    }
  }

  // Import accounts
  const existingAccounts = getAllAccounts()
  const existingAccountIds = new Set(existingAccounts.map((a) => a.id))

  for (const account of data.accounts) {
    if (existingAccountIds.has(account.id)) {
      updateAccount(account.id, {
        username: account.username,
        displayName: account.displayName,
        profileImage: account.profileImage,
        groupId: account.groupId,
        proxyId: account.proxyId,
        memo: account.memo,
        sortOrder: account.sortOrder,
      })
    } else {
      createAccount({
        username: account.username,
        displayName: account.displayName,
        profileImage: account.profileImage,
        groupId: account.groupId,
        proxyId: account.proxyId,
        memo: account.memo,
      })
    }
  }

  // Import templates
  const existingTemplates = getAllTemplates()
  const existingTemplateIds = new Set(existingTemplates.map((t) => t.id))

  for (const template of data.templates) {
    if (existingTemplateIds.has(template.id)) {
      updateTemplate(template.id, {
        name: template.name,
        content: template.content,
        imageCategory: template.imageCategory,
      })
    } else {
      createTemplate(template.name, template.content, template.imageCategory || undefined)
    }
  }

  // Import automation tasks
  const existingAutomations = getAllAutomations()
  const existingAutomationIds = new Set(existingAutomations.map((a) => a.id))

  for (const task of data.automationTasks) {
    if (existingAutomationIds.has(task.id)) {
      updateAutomation(task.id, {
        name: task.name,
        actionType: task.actionType,
        isEnabled: task.isEnabled,
        accountIds: task.accountIds.split(','),
        targetType: task.targetType,
        targetValue: task.targetValue,
        intervalMinutes: task.intervalMinutes,
        dailyLimit: task.dailyLimit,
      })
    } else {
      createAutomation({
        name: task.name,
        actionType: task.actionType,
        accountIds: task.accountIds.split(','),
        targetType: task.targetType,
        targetValue: task.targetValue,
        intervalMinutes: task.intervalMinutes,
        dailyLimit: task.dailyLimit,
      })
    }
  }

  // Note: Settings import would update security, notification, and monitoring configs
  // This is skipped for now as it requires more careful handling
  console.log('[Sync] Data import completed')
}
