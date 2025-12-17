// Sync Service
// Handles cross-device data synchronization

import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import type {
  DeviceInfo,
  SyncData,
  SyncResult,
  SyncConflict,
  EncryptedSyncData,
  SyncAccount,
  SyncGroup,
  SyncProxy,
  SyncTemplate,
  SyncAutomationTask,
  SyncSettings,
} from '../../shared/syncTypes'
import { SYNC_DATA_VERSION, DEFAULT_SYNC_SETTINGS } from '../../shared/syncTypes'
import {
  encryptSyncData,
  decryptSyncData,
  encryptValue,
  getSaltHex,
  setSaltForUser,
} from './syncEncryption'
import { getAllAccounts } from '../database/accountRepository'
import { getAllGroups } from '../database/groupRepository'
import { getAllProxies } from '../database/proxyRepository'
import { getAllTemplates } from '../database/postRepository'
import { getAllAutomationTasks } from '../database/automationRepository'
import { getSecurityConfig } from '../database/securityRepository'
import { getNotificationSettings } from '../database/notificationRepository'
import { getConfig as getMonitoringConfig } from '../database/monitoringRepository'

// Device ID storage path
const DEVICE_ID_FILE = 'device-id.json'

// In-memory cache
let cachedDeviceId: string | null = null
let syncPassword: string | null = null

/**
 * Get or create device ID
 */
export function getDeviceId(): string {
  if (cachedDeviceId) return cachedDeviceId

  const userDataPath = app.getPath('userData')
  const deviceIdPath = path.join(userDataPath, DEVICE_ID_FILE)

  try {
    if (fs.existsSync(deviceIdPath)) {
      const data = JSON.parse(fs.readFileSync(deviceIdPath, 'utf-8'))
      cachedDeviceId = data.deviceId
      return cachedDeviceId!
    }
  } catch (error) {
    console.error('[Sync] Error reading device ID:', error)
  }

  // Generate new device ID
  cachedDeviceId = crypto.randomUUID()

  // Save device ID
  try {
    fs.writeFileSync(deviceIdPath, JSON.stringify({ deviceId: cachedDeviceId }))
  } catch (error) {
    console.error('[Sync] Error saving device ID:', error)
  }

  return cachedDeviceId
}

/**
 * Get device name
 */
export function getDeviceName(): string {
  const hostname = require('os').hostname()
  const platform = process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'Mac' : 'Linux'
  return `${hostname} (${platform})`
}

/**
 * Set sync password (used for encryption)
 */
export function setSyncPassword(password: string): void {
  syncPassword = password
}

/**
 * Check if sync password is set
 */
export function hasSyncPassword(): boolean {
  return syncPassword !== null
}

/**
 * Clear sync password
 */
export function clearSyncPassword(): void {
  syncPassword = null
}

/**
 * Export local data for sync
 */
export async function exportSyncData(): Promise<SyncData> {
  const deviceId = getDeviceId()
  const timestamp = Date.now()

  // Get accounts (exclude session data)
  const accounts = getAllAccounts()
  const syncAccounts: SyncAccount[] = accounts.map((a) => ({
    id: a.id,
    username: a.username,
    displayName: a.displayName,
    profileImage: a.profileImage,
    groupId: a.groupId,
    proxyId: a.proxyId,
    memo: a.memo,
    status: a.status,
    sortOrder: a.sortOrder,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }))

  // Get groups
  const groups = getAllGroups()
  const syncGroups: SyncGroup[] = groups.map((g) => ({
    id: g.id,
    name: g.name,
    color: g.color,
    sortOrder: g.sortOrder,
    createdAt: g.createdAt,
  }))

  // Get proxies (encrypt passwords)
  const proxies = getAllProxies()
  const syncProxies: SyncProxy[] = proxies.map((p) => ({
    id: p.id,
    name: p.name,
    host: p.host,
    port: p.port,
    username: p.username,
    password: p.password, // Will be encrypted when full sync data is encrypted
    protocol: p.protocol,
    groupId: p.groupId,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }))

  // Get templates
  const templates = getAllTemplates()
  const syncTemplates: SyncTemplate[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    content: t.content,
    imageCategory: t.imageCategory,
    usageCount: t.usageCount,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }))

  // Get automation tasks
  const automationTasks = getAllAutomationTasks()
  const syncAutomationTasks: SyncAutomationTask[] = automationTasks.map((t) => ({
    id: t.id,
    name: t.name,
    actionType: t.actionType,
    isEnabled: t.isEnabled === 1,
    accountIds: t.accountIds,
    targetType: t.targetType,
    targetValue: t.targetValue,
    intervalMinutes: t.intervalMinutes,
    dailyLimit: t.dailyLimit,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }))

  // Get settings
  const securityConfig = getSecurityConfig()
  const notificationSettings = getNotificationSettings()
  const monitoringConfig = getMonitoringConfig()

  const syncSettings: SyncSettings = {
    autoLockMinutes: securityConfig?.autoLockMinutes ?? DEFAULT_SYNC_SETTINGS.autoLockMinutes,
    lockOnMinimize: securityConfig?.lockOnMinimize === 1,
    lockOnSleep: securityConfig?.lockOnSleep === 1,
    encryptSessionData: securityConfig?.encryptSessionData === 1,
    notificationSettings: {
      enableDesktopNotifications: notificationSettings?.enableDesktopNotifications === 1,
      enableSoundNotifications: notificationSettings?.enableSoundNotifications === 1,
      enableInAppNotifications: notificationSettings?.enableInAppNotifications === 1,
      soundVolume: notificationSettings?.soundVolume ?? 50,
      showPreview: notificationSettings?.showPreview === 1,
      groupByCategory: notificationSettings?.groupByCategory === 1,
    },
    monitoringConfig: {
      isEnabled: monitoringConfig?.isEnabled === 1,
      checkIntervalMinutes: monitoringConfig?.checkIntervalMinutes ?? 30,
      autoCheckShadowBan: monitoringConfig?.autoCheckShadowBan === 1,
      autoCheckLoginStatus: monitoringConfig?.autoCheckLoginStatus === 1,
      alertOnLock: monitoringConfig?.alertOnLock === 1,
      alertOnSuspend: monitoringConfig?.alertOnSuspend === 1,
      alertOnShadowBan: monitoringConfig?.alertOnShadowBan === 1,
      alertOnLoginFailure: monitoringConfig?.alertOnLoginFailure === 1,
      notifyDesktop: monitoringConfig?.notifyDesktop === 1,
      notifySound: monitoringConfig?.notifySound === 1,
    },
  }

  return {
    version: SYNC_DATA_VERSION,
    timestamp,
    deviceId,
    accounts: syncAccounts,
    groups: syncGroups,
    proxies: syncProxies,
    templates: syncTemplates,
    automationTasks: syncAutomationTasks,
    settings: syncSettings,
  }
}

/**
 * Encrypt sync data for cloud storage
 */
export function encryptForCloud(data: SyncData, userId: string): EncryptedSyncData | null {
  if (!syncPassword) {
    console.error('[Sync] No sync password set')
    return null
  }

  return encryptSyncData(data, syncPassword, userId)
}

/**
 * Decrypt sync data from cloud
 */
export function decryptFromCloud(
  encryptedData: EncryptedSyncData,
  userId: string
): SyncData | null {
  if (!syncPassword) {
    console.error('[Sync] No sync password set')
    return null
  }

  return decryptSyncData(encryptedData, syncPassword, userId)
}

/**
 * Resolve conflicts between local and remote data
 * Uses timestamp-based resolution (newer wins)
 */
export function resolveConflicts(
  local: SyncData,
  remote: SyncData
): { merged: SyncData; conflicts: SyncConflict[] } {
  const conflicts: SyncConflict[] = []

  // Merge accounts
  const mergedAccounts = mergeArrays(
    local.accounts,
    remote.accounts,
    'id',
    'updatedAt',
    'account',
    conflicts
  )

  // Merge groups (use createdAt for timestamp)
  const mergedGroups = mergeArrays(
    local.groups,
    remote.groups,
    'id',
    'createdAt',
    'group',
    conflicts
  )

  // Merge proxies
  const mergedProxies = mergeArrays(
    local.proxies,
    remote.proxies,
    'id',
    'updatedAt',
    'proxy',
    conflicts
  )

  // Merge templates
  const mergedTemplates = mergeArrays(
    local.templates,
    remote.templates,
    'id',
    'updatedAt',
    'template',
    conflicts
  )

  // Merge automation tasks
  const mergedAutomationTasks = mergeArrays(
    local.automationTasks,
    remote.automationTasks,
    'id',
    'updatedAt',
    'automation',
    conflicts
  )

  // Settings: use the newer timestamp
  const settings = local.timestamp > remote.timestamp ? local.settings : remote.settings

  const merged: SyncData = {
    version: SYNC_DATA_VERSION,
    timestamp: Date.now(),
    deviceId: getDeviceId(),
    accounts: mergedAccounts,
    groups: mergedGroups,
    proxies: mergedProxies,
    templates: mergedTemplates,
    automationTasks: mergedAutomationTasks,
    settings,
  }

  return { merged, conflicts }
}

/**
 * Merge two arrays with conflict detection
 */
function mergeArrays<T extends { [key: string]: unknown }>(
  local: T[],
  remote: T[],
  idKey: keyof T,
  timestampKey: keyof T,
  type: SyncConflict['type'],
  conflicts: SyncConflict[]
): T[] {
  const merged = new Map<unknown, T>()

  // Add all local items
  for (const item of local) {
    merged.set(item[idKey], item)
  }

  // Merge remote items
  for (const remoteItem of remote) {
    const id = remoteItem[idKey]
    const localItem = merged.get(id)

    if (!localItem) {
      // New item from remote
      merged.set(id, remoteItem)
    } else {
      // Item exists in both - check timestamp
      const localTime = localItem[timestampKey] as number
      const remoteTime = remoteItem[timestampKey] as number

      if (remoteTime > localTime) {
        // Remote is newer
        merged.set(id, remoteItem)
      } else if (localTime === remoteTime) {
        // Same timestamp - potential conflict if data differs
        if (JSON.stringify(localItem) !== JSON.stringify(remoteItem)) {
          conflicts.push({
            type,
            id: String(id),
            localData: localItem,
            remoteData: remoteItem,
            localTimestamp: localTime,
            remoteTimestamp: remoteTime,
          })
        }
      }
      // else: local is newer, keep local
    }
  }

  return Array.from(merged.values())
}

/**
 * Get current device info
 */
export function getCurrentDeviceInfo(): DeviceInfo {
  return {
    id: getDeviceId(),
    name: getDeviceName(),
    platform: process.platform as 'win32' | 'darwin' | 'linux',
    lastActiveAt: Date.now(),
    createdAt: Date.now(), // Will be overwritten from stored value
    isCurrentDevice: true,
  }
}

/**
 * Get sync salt for a user
 */
export function getUserSyncSalt(userId: string): string {
  return getSaltHex(userId)
}

/**
 * Set sync salt from cloud
 */
export function setUserSyncSalt(userId: string, saltHex: string): void {
  setSaltForUser(userId, saltHex)
}

// Note: Actual cloud sync operations (syncToCloud, syncFromCloud)
// will be implemented in syncHandlers.ts using Firebase Firestore
// since the main process doesn't have direct Firebase access in this stub implementation
