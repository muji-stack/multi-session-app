// Sync Types
// Types for cross-device data synchronization

export interface DeviceInfo {
  id: string
  name: string
  platform: 'win32' | 'darwin' | 'linux'
  lastActiveAt: number
  createdAt: number
  isCurrentDevice: boolean
}

export interface SyncData {
  version: number
  timestamp: number
  deviceId: string
  accounts: SyncAccount[]
  groups: SyncGroup[]
  proxies: SyncProxy[]
  templates: SyncTemplate[]
  automationTasks: SyncAutomationTask[]
  settings: SyncSettings
}

export interface SyncAccount {
  id: string
  username: string
  displayName: string | null
  profileImage: string | null
  groupId: string | null
  proxyId: string | null
  memo: string | null
  status: string
  sortOrder: number
  createdAt: number
  updatedAt: number
}

export interface SyncGroup {
  id: string
  name: string
  color: string
  sortOrder: number
  createdAt: number
}

export interface SyncProxy {
  id: string
  name: string
  host: string
  port: number
  username: string | null
  password: string | null // Encrypted
  protocol: string
  groupId: string | null
  createdAt: number
  updatedAt: number
}

export interface SyncTemplate {
  id: string
  name: string
  content: string
  imageCategory: string | null
  usageCount: number
  createdAt: number
  updatedAt: number
}

export interface SyncAutomationTask {
  id: string
  name: string
  actionType: string
  isEnabled: boolean
  accountIds: string
  targetType: string
  targetValue: string | null
  intervalMinutes: number
  dailyLimit: number
  createdAt: number
  updatedAt: number
}

export interface SyncSettings {
  autoLockMinutes: number
  lockOnMinimize: boolean
  lockOnSleep: boolean
  encryptSessionData: boolean
  notificationSettings: {
    enableDesktopNotifications: boolean
    enableSoundNotifications: boolean
    enableInAppNotifications: boolean
    soundVolume: number
    showPreview: boolean
    groupByCategory: boolean
  }
  monitoringConfig: {
    isEnabled: boolean
    checkIntervalMinutes: number
    autoCheckShadowBan: boolean
    autoCheckLoginStatus: boolean
    alertOnLock: boolean
    alertOnSuspend: boolean
    alertOnShadowBan: boolean
    alertOnLoginFailure: boolean
    notifyDesktop: boolean
    notifySound: boolean
  }
}

export interface EncryptedSyncData {
  iv: string
  data: string
  authTag: string
  version: number
}

export interface SyncStatus {
  lastSyncAt: number | null
  isSyncing: boolean
  lastError: string | null
  conflictCount: number
}

export interface SyncConflict {
  type: 'account' | 'group' | 'proxy' | 'template' | 'automation'
  id: string
  localData: unknown
  remoteData: unknown
  localTimestamp: number
  remoteTimestamp: number
}

export interface SyncResult {
  success: boolean
  syncedAt: number
  itemsSynced: {
    accounts: number
    groups: number
    proxies: number
    templates: number
    automationTasks: number
  }
  conflicts: SyncConflict[]
  error?: string
}

export interface ConflictResolution {
  conflictId: string
  resolution: 'local' | 'remote' | 'merge'
  mergedData?: unknown
}

// Sync data version for migration support
export const SYNC_DATA_VERSION = 1

// Default sync settings
export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  autoLockMinutes: 15,
  lockOnMinimize: false,
  lockOnSleep: true,
  encryptSessionData: false,
  notificationSettings: {
    enableDesktopNotifications: true,
    enableSoundNotifications: true,
    enableInAppNotifications: true,
    soundVolume: 50,
    showPreview: true,
    groupByCategory: true,
  },
  monitoringConfig: {
    isEnabled: true,
    checkIntervalMinutes: 30,
    autoCheckShadowBan: false,
    autoCheckLoginStatus: true,
    alertOnLock: true,
    alertOnSuspend: true,
    alertOnShadowBan: true,
    alertOnLoginFailure: true,
    notifyDesktop: true,
    notifySound: true,
  },
}
