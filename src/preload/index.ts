import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Account, AccountStatus, SearchBanStatus } from '../shared/types'

interface CreateAccountInput {
  username: string
  displayName?: string | null
  profileImage?: string | null
  groupId?: string | null
  proxyId?: string | null
  memo?: string | null
}

interface UpdateAccountInput {
  username?: string
  displayName?: string | null
  profileImage?: string | null
  groupId?: string | null
  proxyId?: string | null
  memo?: string | null
  status?: AccountStatus
  searchBanStatus?: SearchBanStatus
  lastCheckedAt?: number | null
  sortOrder?: number
}

interface AccountStats {
  total: number
  normal: number
  locked: number
  suspended: number
}

const api = {
  // Window controls
  minimizeWindow: (): void => ipcRenderer.send('window:minimize'),
  maximizeWindow: (): void => ipcRenderer.send('window:maximize'),
  closeWindow: (): void => ipcRenderer.send('window:close'),

  // Account API
  account: {
    getAll: (): Promise<Account[]> => ipcRenderer.invoke('account:getAll'),
    getById: (id: string): Promise<Account | null> => ipcRenderer.invoke('account:getById', id),
    create: (input: CreateAccountInput): Promise<Account> => ipcRenderer.invoke('account:create', input),
    update: (id: string, input: UpdateAccountInput): Promise<Account | null> =>
      ipcRenderer.invoke('account:update', id, input),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('account:delete', id),
    getStats: (): Promise<AccountStats> => ipcRenderer.invoke('account:getStats'),
    updateSortOrders: (orders: { id: string; sortOrder: number }[]): Promise<boolean> =>
      ipcRenderer.invoke('account:updateSortOrders', orders)
  },

  // Browser API
  browser: {
    open: (accountId: string): Promise<{ success: boolean; windowId: number }> =>
      ipcRenderer.invoke('browser:open', accountId),
    close: (accountId: string): Promise<boolean> => ipcRenderer.invoke('browser:close', accountId),
    focus: (accountId: string): Promise<boolean> => ipcRenderer.invoke('browser:focus', accountId),
    getAll: (): Promise<{ accountId: string; title: string }[]> => ipcRenderer.invoke('browser:getAll'),
    clearSession: (accountId: string): Promise<boolean> => ipcRenderer.invoke('browser:clearSession', accountId)
  },

  // Post API
  post: {
    getTemplates: (): Promise<unknown[]> => ipcRenderer.invoke('post:getTemplates'),
    getTemplateById: (id: string): Promise<unknown> => ipcRenderer.invoke('post:getTemplateById', id),
    createTemplate: (name: string, content: string, imageCategory?: string): Promise<unknown> =>
      ipcRenderer.invoke('post:createTemplate', name, content, imageCategory),
    updateTemplate: (id: string, updates: { name?: string; content?: string; imageCategory?: string | null }): Promise<unknown> =>
      ipcRenderer.invoke('post:updateTemplate', id, updates),
    deleteTemplate: (id: string): Promise<boolean> => ipcRenderer.invoke('post:deleteTemplate', id),
    getActionLogs: (limit?: number, offset?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('post:getActionLogs', limit, offset),
    getActionLogsByAccount: (accountId: string): Promise<unknown[]> =>
      ipcRenderer.invoke('post:getActionLogsByAccount', accountId),
    executeBulk: (params: { accountIds: string[]; content: string; delayBetweenPosts?: number }): Promise<unknown[]> =>
      ipcRenderer.invoke('post:executeBulk', params),
    checkLoginStatus: (accountId: string): Promise<boolean> =>
      ipcRenderer.invoke('post:checkLoginStatus', accountId),
    checkMultipleLoginStatus: (accountIds: string[]): Promise<{ accountId: string; loggedIn: boolean }[]> =>
      ipcRenderer.invoke('post:checkMultipleLoginStatus', accountIds),
    onProgress: (callback: (data: { completed: number; total: number; result: unknown }) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { completed: number; total: number; result: unknown }): void => callback(data)
      ipcRenderer.on('post:progress', listener)
      return () => ipcRenderer.removeListener('post:progress', listener)
    }
  },

  // Engagement API
  engagement: {
    executeBulk: (params: { accountIds: string[]; targetUrl: string; actionType: string; delayBetweenActions?: number }): Promise<unknown[]> =>
      ipcRenderer.invoke('engagement:executeBulk', params),
    onProgress: (callback: (data: { completed: number; total: number; result: unknown }) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { completed: number; total: number; result: unknown }): void => callback(data)
      ipcRenderer.on('engagement:progress', listener)
      return () => ipcRenderer.removeListener('engagement:progress', listener)
    }
  },

  // Check API
  check: {
    single: (accountId: string): Promise<unknown> => ipcRenderer.invoke('check:single', accountId),
    multiple: (accountIds: string[]): Promise<unknown[]> => ipcRenderer.invoke('check:multiple', accountIds),
    onProgress: (callback: (data: { completed: number; total: number; result: unknown }) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { completed: number; total: number; result: unknown }): void => callback(data)
      ipcRenderer.on('check:progress', listener)
      return () => ipcRenderer.removeListener('check:progress', listener)
    },
    // Shadow ban checks
    shadowBan: (accountId: string): Promise<unknown> =>
      ipcRenderer.invoke('check:shadowBan', accountId),
    shadowBanMultiple: (accountIds: string[]): Promise<unknown[]> =>
      ipcRenderer.invoke('check:shadowBanMultiple', accountIds),
    onShadowBanProgress: (callback: (data: {
      step: string
      completed: number
      total: number
      currentAccount?: string
    }) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: {
        step: string
        completed: number
        total: number
        currentAccount?: string
      }): void => callback(data)
      ipcRenderer.on('check:shadowBanProgress', listener)
      return () => ipcRenderer.removeListener('check:shadowBanProgress', listener)
    }
  },

  // Scheduled Post API
  scheduledPost: {
    getAll: (): Promise<unknown[]> => ipcRenderer.invoke('scheduledPost:getAll'),
    getById: (id: string): Promise<unknown> => ipcRenderer.invoke('scheduledPost:getById', id),
    getByAccount: (accountId: string): Promise<unknown[]> =>
      ipcRenderer.invoke('scheduledPost:getByAccount', accountId),
    getByStatus: (status: string): Promise<unknown[]> =>
      ipcRenderer.invoke('scheduledPost:getByStatus', status),
    getUpcoming: (limit?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('scheduledPost:getUpcoming', limit),
    create: (input: {
      accountId: string
      content: string
      mediaIds?: string[]
      scheduledAt: number
    }): Promise<unknown> => ipcRenderer.invoke('scheduledPost:create', input),
    update: (
      id: string,
      updates: { content?: string; mediaIds?: string[] | null; scheduledAt?: number }
    ): Promise<unknown> => ipcRenderer.invoke('scheduledPost:update', id, updates),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('scheduledPost:delete', id),
    cancel: (id: string): Promise<unknown> => ipcRenderer.invoke('scheduledPost:cancel', id),
    getInRange: (startTime: number, endTime: number): Promise<unknown[]> =>
      ipcRenderer.invoke('scheduledPost:getInRange', startTime, endTime),
    getStats: (): Promise<{ pending: number; completed: number; failed: number; cancelled: number }> =>
      ipcRenderer.invoke('scheduledPost:getStats')
  },

  // Analytics API
  analytics: {
    getActionStats: (): Promise<{ total: number; success: number; failed: number; pending: number }> =>
      ipcRenderer.invoke('analytics:getActionStats'),
    getActionStatsByType: (): Promise<Record<string, { total: number; success: number; failed: number; pending: number }>> =>
      ipcRenderer.invoke('analytics:getActionStatsByType'),
    getDailyStats: (days?: number): Promise<{ date: string; posts: number; likes: number; reposts: number; follows: number }[]> =>
      ipcRenderer.invoke('analytics:getDailyStats', days),
    getAccountActionStats: (limit?: number): Promise<{ accountId: string; username: string; total: number; success: number; failed: number }[]> =>
      ipcRenderer.invoke('analytics:getAccountActionStats', limit)
  },

  // Data Export/Import API
  data: {
    export: (): Promise<{
      success: boolean
      cancelled?: boolean
      filePath?: string
      accountsExported?: number
      groupsExported?: number
      error?: string
    }> => ipcRenderer.invoke('data:export'),
    import: (): Promise<{
      success: boolean
      cancelled?: boolean
      accountsImported?: number
      groupsImported?: number
      errors?: string[]
    }> => ipcRenderer.invoke('data:import'),
    exportCSV: (): Promise<{
      success: boolean
      cancelled?: boolean
      filePath?: string
      accountsExported?: number
      error?: string
    }> => ipcRenderer.invoke('data:exportCSV'),
    importCSV: (): Promise<{
      success: boolean
      cancelled?: boolean
      accountsImported?: number
      errors?: string[]
    }> => ipcRenderer.invoke('data:importCSV')
  },

  // Group API
  group: {
    getAll: (): Promise<unknown[]> => ipcRenderer.invoke('group:getAll'),
    getById: (id: string): Promise<unknown> => ipcRenderer.invoke('group:getById', id),
    create: (name: string, color?: string): Promise<unknown> => ipcRenderer.invoke('group:create', name, color),
    update: (id: string, updates: { name?: string; color?: string }): Promise<unknown> =>
      ipcRenderer.invoke('group:update', id, updates),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('group:delete', id),
    updateSortOrders: (orders: { id: string; sortOrder: number }[]): Promise<boolean> =>
      ipcRenderer.invoke('group:updateSortOrders', orders),
    getStats: (): Promise<{ groupId: string; count: number }[]> => ipcRenderer.invoke('group:getStats')
  },

  // Proxy API
  proxy: {
    getAll: (): Promise<unknown[]> => ipcRenderer.invoke('proxy:getAll'),
    getById: (id: string): Promise<unknown> => ipcRenderer.invoke('proxy:getById', id),
    create: (input: {
      name: string
      host: string
      port: number
      username?: string | null
      password?: string | null
      protocol?: string
      groupId?: string | null
    }): Promise<unknown> => ipcRenderer.invoke('proxy:create', input),
    update: (
      id: string,
      updates: {
        name?: string
        host?: string
        port?: number
        username?: string | null
        password?: string | null
        protocol?: string
        groupId?: string | null
      }
    ): Promise<unknown> => ipcRenderer.invoke('proxy:update', id, updates),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('proxy:delete', id),
    getStats: (): Promise<{ proxyId: string; accountCount: number }[]> =>
      ipcRenderer.invoke('proxy:getStats'),
    check: (id: string): Promise<{ success: boolean; status?: string; error?: string }> =>
      ipcRenderer.invoke('proxy:check', id),
    checkMultiple: (ids: string[]): Promise<{ id: string; status: string; error?: string }[]> =>
      ipcRenderer.invoke('proxy:checkMultiple', ids)
  },

  // Automation API
  automation: {
    getTasks: (): Promise<unknown[]> => ipcRenderer.invoke('automation:getTasks'),
    getTaskById: (id: string): Promise<unknown> => ipcRenderer.invoke('automation:getTaskById', id),
    getEnabledTasks: (): Promise<unknown[]> => ipcRenderer.invoke('automation:getEnabledTasks'),
    createTask: (input: {
      name: string
      actionType: string
      accountIds: string[]
      targetType: string
      targetValue?: string | null
      intervalMinutes?: number
      dailyLimit?: number
    }): Promise<unknown> => ipcRenderer.invoke('automation:createTask', input),
    updateTask: (
      id: string,
      updates: {
        name?: string
        actionType?: string
        isEnabled?: boolean
        accountIds?: string[]
        targetType?: string
        targetValue?: string | null
        intervalMinutes?: number
        dailyLimit?: number
      }
    ): Promise<unknown> => ipcRenderer.invoke('automation:updateTask', id, updates),
    toggleTask: (id: string): Promise<unknown> => ipcRenderer.invoke('automation:toggleTask', id),
    deleteTask: (id: string): Promise<boolean> => ipcRenderer.invoke('automation:deleteTask', id),
    getLogs: (limit?: number, offset?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('automation:getLogs', limit, offset),
    getLogsByTask: (taskId: string, limit?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('automation:getLogsByTask', taskId, limit),
    getStats: (): Promise<{
      totalTasks: number
      enabledTasks: number
      totalActionsToday: number
      successRate: number
    }> => ipcRenderer.invoke('automation:getStats')
  },

  // Workflow API
  workflow: {
    getAll: (): Promise<unknown[]> => ipcRenderer.invoke('workflow:getAll'),
    getById: (id: string): Promise<unknown> => ipcRenderer.invoke('workflow:getById', id),
    getWithSteps: (id: string): Promise<unknown> => ipcRenderer.invoke('workflow:getWithSteps', id),
    getEnabled: (): Promise<unknown[]> => ipcRenderer.invoke('workflow:getEnabled'),
    create: (input: {
      name: string
      description?: string | null
      triggerType?: string
      triggerConfig?: unknown
    }): Promise<unknown> => ipcRenderer.invoke('workflow:create', input),
    update: (
      id: string,
      updates: {
        name?: string
        description?: string | null
        isEnabled?: boolean
        triggerType?: string
        triggerConfig?: unknown
      }
    ): Promise<unknown> => ipcRenderer.invoke('workflow:update', id, updates),
    toggle: (id: string): Promise<unknown> => ipcRenderer.invoke('workflow:toggle', id),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('workflow:delete', id),
    execute: (id: string): Promise<{ success: boolean; runId: string; error?: string }> =>
      ipcRenderer.invoke('workflow:execute', id),

    // Steps
    getSteps: (workflowId: string): Promise<unknown[]> => ipcRenderer.invoke('workflow:getSteps', workflowId),
    createStep: (input: {
      workflowId: string
      stepOrder: number
      stepType: string
      actionType?: string | null
      actionConfig?: unknown
      conditionType?: string | null
      conditionConfig?: unknown
      onSuccessStepId?: string | null
      onFailureStepId?: string | null
    }): Promise<unknown> => ipcRenderer.invoke('workflow:createStep', input),
    updateStep: (
      id: string,
      updates: {
        stepOrder?: number
        stepType?: string
        actionType?: string | null
        actionConfig?: unknown
        conditionType?: string | null
        conditionConfig?: unknown
        onSuccessStepId?: string | null
        onFailureStepId?: string | null
      }
    ): Promise<unknown> => ipcRenderer.invoke('workflow:updateStep', id, updates),
    deleteStep: (id: string): Promise<boolean> => ipcRenderer.invoke('workflow:deleteStep', id),
    deleteSteps: (workflowId: string): Promise<boolean> => ipcRenderer.invoke('workflow:deleteSteps', workflowId),
    reorderSteps: (workflowId: string, stepIds: string[]): Promise<unknown[]> =>
      ipcRenderer.invoke('workflow:reorderSteps', workflowId, stepIds),

    // Logs
    getLogs: (limit?: number, offset?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('workflow:getLogs', limit, offset),
    getLogsByWorkflow: (workflowId: string, limit?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('workflow:getLogsByWorkflow', workflowId, limit),
    getLogsByRunId: (runId: string): Promise<unknown[]> =>
      ipcRenderer.invoke('workflow:getLogsByRunId', runId),

    // Templates
    getTemplates: (): Promise<unknown[]> => ipcRenderer.invoke('workflow:getTemplates'),
    getTemplateById: (id: string): Promise<unknown> => ipcRenderer.invoke('workflow:getTemplateById', id),
    getTemplatesByCategory: (category: string): Promise<unknown[]> =>
      ipcRenderer.invoke('workflow:getTemplatesByCategory', category),
    createTemplate: (input: {
      name: string
      description?: string | null
      category?: string
      templateData: unknown
    }): Promise<unknown> => ipcRenderer.invoke('workflow:createTemplate', input),
    deleteTemplate: (id: string): Promise<boolean> => ipcRenderer.invoke('workflow:deleteTemplate', id),
    createFromTemplate: (templateId: string, name: string, description?: string | null): Promise<unknown> =>
      ipcRenderer.invoke('workflow:createFromTemplate', templateId, name, description),

    // Stats
    getStats: (): Promise<{
      totalWorkflows: number
      enabledWorkflows: number
      totalRuns: number
      successRate: number
    }> => ipcRenderer.invoke('workflow:getStats'),

    // Progress events
    onProgress: (callback: (data: { workflowId: string; runId: string; step: number; status: string }) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { workflowId: string; runId: string; step: number; status: string }): void => callback(data)
      ipcRenderer.on('workflow:progress', listener)
      return () => ipcRenderer.removeListener('workflow:progress', listener)
    }
  },

  // Monitoring API
  monitoring: {
    getAlerts: (limit?: number, offset?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('monitoring:getAlerts', limit, offset),
    getUnresolvedAlerts: (): Promise<unknown[]> =>
      ipcRenderer.invoke('monitoring:getUnresolvedAlerts'),
    getAlertsByAccount: (accountId: string, limit?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('monitoring:getAlertsByAccount', accountId, limit),
    getAlertsByType: (alertType: string, limit?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('monitoring:getAlertsByType', alertType, limit),
    getRecentAlerts: (hours?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('monitoring:getRecentAlerts', hours),
    createAlert: (input: {
      accountId: string
      alertType: string
      severity: string
      message: string
      details?: string | null
    }): Promise<unknown> => ipcRenderer.invoke('monitoring:createAlert', input),
    markAlertAsRead: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('monitoring:markAlertAsRead', id),
    markAllAlertsAsRead: (): Promise<number> =>
      ipcRenderer.invoke('monitoring:markAllAlertsAsRead'),
    resolveAlert: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('monitoring:resolveAlert', id),
    resolveAlertsByAccount: (accountId: string): Promise<number> =>
      ipcRenderer.invoke('monitoring:resolveAlertsByAccount', accountId),
    deleteAlert: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('monitoring:deleteAlert', id),
    deleteOldAlerts: (daysOld?: number): Promise<number> =>
      ipcRenderer.invoke('monitoring:deleteOldAlerts', daysOld),

    // Config
    getConfig: (): Promise<unknown> =>
      ipcRenderer.invoke('monitoring:getConfig'),
    updateConfig: (updates: {
      isEnabled?: boolean
      checkIntervalMinutes?: number
      autoCheckShadowBan?: boolean
      autoCheckLoginStatus?: boolean
      alertOnLock?: boolean
      alertOnSuspend?: boolean
      alertOnShadowBan?: boolean
      alertOnLoginFailure?: boolean
      notifyDesktop?: boolean
      notifySound?: boolean
    }): Promise<unknown> => ipcRenderer.invoke('monitoring:updateConfig', updates),

    // Reports
    getReports: (limit?: number, offset?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('monitoring:getReports', limit, offset),
    getReportById: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('monitoring:getReportById', id),
    getReportsByType: (reportType: string, limit?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('monitoring:getReportsByType', reportType, limit),
    createReport: (input: {
      reportType: string
      periodStart: number
      periodEnd: number
      data: unknown
    }): Promise<unknown> => ipcRenderer.invoke('monitoring:createReport', input),
    deleteReport: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('monitoring:deleteReport', id),
    deleteOldReports: (daysOld?: number): Promise<number> =>
      ipcRenderer.invoke('monitoring:deleteOldReports', daysOld),

    // Stats
    getStats: (): Promise<{
      totalAccounts: number
      normalAccounts: number
      lockedAccounts: number
      suspendedAccounts: number
      shadowBannedAccounts: number
      unresolvedAlerts: number
      recentAlerts: number
      lastCheckAt: number | null
    }> => ipcRenderer.invoke('monitoring:getStats'),
    getAlertStats: (days?: number): Promise<{
      total: number
      byType: Record<string, number>
      bySeverity: Record<string, number>
    }> => ipcRenderer.invoke('monitoring:getAlertStats', days),

    // Manual trigger
    triggerCheck: (): Promise<unknown[]> =>
      ipcRenderer.invoke('monitoring:triggerCheck'),

    // Events
    onAlert: (callback: (data: { accountId: string; type: string; severity: string; message: string }) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { accountId: string; type: string; severity: string; message: string }): void => callback(data)
      ipcRenderer.on('monitoring:alert', listener)
      return () => ipcRenderer.removeListener('monitoring:alert', listener)
    },
    onCheckComplete: (callback: (data: { timestamp: number; accountsChecked: number; issuesFound: number }) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { timestamp: number; accountsChecked: number; issuesFound: number }): void => callback(data)
      ipcRenderer.on('monitoring:checkComplete', listener)
      return () => ipcRenderer.removeListener('monitoring:checkComplete', listener)
    }
  },

  // Media API
  media: {
    getAll: (options?: {
      mediaType?: string
      tags?: string[]
      isFavorite?: boolean
      search?: string
      limit?: number
      offset?: number
      sortBy?: string
      sortOrder?: string
    }): Promise<unknown[]> => ipcRenderer.invoke('media:getAll', options),
    getById: (id: string): Promise<unknown> => ipcRenderer.invoke('media:getById', id),
    getByIds: (ids: string[]): Promise<unknown[]> => ipcRenderer.invoke('media:getByIds', ids),
    upload: (input?: { filePaths?: string[]; tags?: string[] }): Promise<{
      success: boolean
      uploaded: unknown[]
      errors?: string[]
    }> => ipcRenderer.invoke('media:upload', input),
    update: (id: string, updates: {
      fileName?: string
      tags?: string[]
      description?: string | null
      isFavorite?: boolean
    }): Promise<unknown> => ipcRenderer.invoke('media:update', id, updates),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('media:delete', id),
    deleteBatch: (ids: string[]): Promise<{ success: number; failed: number }> =>
      ipcRenderer.invoke('media:deleteBatch', ids),
    toggleFavorite: (id: string): Promise<unknown> => ipcRenderer.invoke('media:toggleFavorite', id),
    incrementUseCount: (id: string): Promise<boolean> => ipcRenderer.invoke('media:incrementUseCount', id),
    getTags: (): Promise<unknown[]> => ipcRenderer.invoke('media:getTags'),
    createTag: (name: string, color?: string): Promise<unknown> =>
      ipcRenderer.invoke('media:createTag', name, color),
    updateTag: (id: string, updates: { name?: string; color?: string }): Promise<unknown> =>
      ipcRenderer.invoke('media:updateTag', id, updates),
    deleteTag: (id: string): Promise<boolean> => ipcRenderer.invoke('media:deleteTag', id),
    getStats: (): Promise<{
      totalCount: number
      imageCount: number
      videoCount: number
      totalSize: number
      favoriteCount: number
    }> => ipcRenderer.invoke('media:getStats'),
    getStoragePath: (): Promise<string> => ipcRenderer.invoke('media:getStoragePath'),
    openStorageFolder: (): Promise<boolean> => ipcRenderer.invoke('media:openStorageFolder'),
    getFilePath: (id: string): Promise<string | null> => ipcRenderer.invoke('media:getFilePath', id)
  },

  // Security API
  security: {
    // Config
    getConfig: (): Promise<unknown> =>
      ipcRenderer.invoke('security:getConfig'),
    updateConfig: (updates: {
      autoLockMinutes?: number
      lockOnMinimize?: boolean
      lockOnSleep?: boolean
      encryptSessionData?: boolean
    }): Promise<unknown> => ipcRenderer.invoke('security:updateConfig', updates),
    hasMasterPassword: (): Promise<boolean> =>
      ipcRenderer.invoke('security:hasMasterPassword'),

    // Master password
    setMasterPassword: (password: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('security:setMasterPassword', password),
    changeMasterPassword: (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('security:changeMasterPassword', currentPassword, newPassword),
    removeMasterPassword: (password: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('security:removeMasterPassword', password),

    // Lock/Unlock
    getLockState: (): Promise<{
      isLocked: boolean
      lockedAt: number | null
      failedAttempts: number
      lastFailedAt: number | null
    }> => ipcRenderer.invoke('security:getLockState'),
    lock: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('security:lock'),
    unlock: (password: string): Promise<{
      success: boolean
      error?: string
      attemptsRemaining?: number
      locked?: boolean
    }> => ipcRenderer.invoke('security:unlock', password),

    // Credentials
    encryptCredential: (accountId: string, credentialType: string, data: string): Promise<{
      success: boolean
      credentialId?: string
      error?: string
    }> => ipcRenderer.invoke('security:encryptCredential', accountId, credentialType, data),
    decryptCredential: (accountId: string, credentialType: string): Promise<{
      success: boolean
      data?: string
      error?: string
    }> => ipcRenderer.invoke('security:decryptCredential', accountId, credentialType),
    deleteCredential: (accountId: string, credentialType: string): Promise<boolean> =>
      ipcRenderer.invoke('security:deleteCredential', accountId, credentialType),
    deleteCredentialsByAccount: (accountId: string): Promise<number> =>
      ipcRenderer.invoke('security:deleteCredentialsByAccount', accountId),
    hasCredential: (accountId: string, credentialType: string): Promise<boolean> =>
      ipcRenderer.invoke('security:hasCredential', accountId, credentialType),

    // Session key status
    hasSessionKey: (): Promise<boolean> =>
      ipcRenderer.invoke('security:hasSessionKey'),

    // Events
    onLocked: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('security:locked', listener)
      return () => ipcRenderer.removeListener('security:locked', listener)
    },
    onUnlocked: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('security:unlocked', listener)
      return () => ipcRenderer.removeListener('security:unlocked', listener)
    }
  },

  // Notification API
  notification: {
    // Get notifications
    getAll: (includeArchived?: boolean): Promise<unknown[]> =>
      ipcRenderer.invoke('notification:getAll', includeArchived),
    getUnread: (): Promise<unknown[]> =>
      ipcRenderer.invoke('notification:getUnread'),
    getByCategory: (category: string): Promise<unknown[]> =>
      ipcRenderer.invoke('notification:getByCategory', category),
    getByAccount: (accountId: string): Promise<unknown[]> =>
      ipcRenderer.invoke('notification:getByAccount', accountId),
    getById: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('notification:getById', id),

    // Create notification
    create: (input: {
      type: string
      category: string
      title: string
      message: string
      accountId?: string | null
      actionUrl?: string | null
      priority?: string
    }): Promise<unknown> => ipcRenderer.invoke('notification:create', input),

    // Mark as read
    markAsRead: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('notification:markAsRead', id),
    markAllAsRead: (): Promise<number> =>
      ipcRenderer.invoke('notification:markAllAsRead'),

    // Archive
    archive: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('notification:archive', id),
    archiveAllRead: (): Promise<number> =>
      ipcRenderer.invoke('notification:archiveAllRead'),

    // Delete
    delete: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('notification:delete', id),
    deleteAllArchived: (): Promise<number> =>
      ipcRenderer.invoke('notification:deleteAllArchived'),
    deleteOld: (olderThanDays: number): Promise<number> =>
      ipcRenderer.invoke('notification:deleteOld', olderThanDays),

    // Stats
    getStats: (): Promise<{
      total: number
      unread: number
      byCategory: Record<string, number>
      byPriority: Record<string, number>
      todayCount: number
    }> => ipcRenderer.invoke('notification:getStats'),
    getUnreadCount: (): Promise<number> =>
      ipcRenderer.invoke('notification:getUnreadCount'),

    // Settings
    getSettings: (): Promise<unknown> =>
      ipcRenderer.invoke('notification:getSettings'),
    updateSettings: (updates: {
      enableDesktopNotifications?: boolean
      enableSoundNotifications?: boolean
      enableInAppNotifications?: boolean
      soundVolume?: number
      showPreview?: boolean
      groupByCategory?: boolean
      autoMarkReadSeconds?: number | null
      quietHoursEnabled?: boolean
      quietHoursStart?: string | null
      quietHoursEnd?: string | null
      enabledCategories?: string[]
      enabledPriorities?: string[]
    }): Promise<unknown> => ipcRenderer.invoke('notification:updateSettings', updates),

    // Events
    onNew: (callback: (notification: unknown) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, notification: unknown): void => callback(notification)
      ipcRenderer.on('notification:new', listener)
      return () => ipcRenderer.removeListener('notification:new', listener)
    },
    onUnreadCountChanged: (callback: (count: number) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, count: number): void => callback(count)
      ipcRenderer.on('notification:unreadCountChanged', listener)
      return () => ipcRenderer.removeListener('notification:unreadCountChanged', listener)
    }
  },

  // Billing API
  billing: {
    getSubscription: (userId: string): Promise<{
      status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'none'
      plan: 'free' | 'starter' | 'basic' | 'pro' | 'business' | 'enterprise'
      maxAccounts: number
      currentPeriodEnd: number | null
      cancelAtPeriodEnd: boolean
      stripeCustomerId: string | null
      stripeSubscriptionId: string | null
    }> => ipcRenderer.invoke('billing:get-subscription', userId),

    createCheckout: (
      userId: string,
      email: string,
      plan: 'starter' | 'basic' | 'pro' | 'business',
      billingPeriod: 'monthly' | 'yearly'
    ): Promise<{ success: boolean; url?: string; error?: string }> =>
      ipcRenderer.invoke('billing:create-checkout', userId, email, plan, billingPeriod),

    createPortal: (userId: string): Promise<{ success: boolean; url?: string; error?: string }> =>
      ipcRenderer.invoke('billing:create-portal', userId),

    checkLicense: (userId: string): Promise<boolean> =>
      ipcRenderer.invoke('billing:check-license', userId),

    getPlans: (): Promise<Record<string, {
      id: string
      name: string
      description: string
      maxAccounts: number
      priceMonthly: number
      priceYearly: number
      features: string[]
      popular?: boolean
    }>> => ipcRenderer.invoke('billing:get-plans'),

    getPriceId: (
      plan: 'starter' | 'basic' | 'pro' | 'business',
      billingPeriod: 'monthly' | 'yearly'
    ): Promise<string | null> => ipcRenderer.invoke('billing:get-price-id', plan, billingPeriod)
  },

  // License API
  license: {
    validate: (userId: string): Promise<{
      isValid: boolean
      plan: string
      maxAccounts: number
      currentAccounts: number
      expiresAt: number | null
      trialEndsAt: number | null
      status: string
      subscriptionStatus: string
      message: string
      daysRemaining: number | null
      gracePeriodEndsAt: number | null
    }> => ipcRenderer.invoke('license:validate', userId),

    checkAccountLimit: (userId: string): Promise<{
      allowed: boolean
      reason?: string
      upgradeRequired?: boolean
      currentLimit?: number
      requiredPlan?: string
    }> => ipcRenderer.invoke('license:checkAccountLimit', userId),

    getFeatureAccess: (userId: string): Promise<{
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
    }> => ipcRenderer.invoke('license:getFeatureAccess', userId),

    checkAction: (
      userId: string,
      action: 'post' | 'schedule' | 'automation' | 'workflow' | 'monitoring' | 'addAccount'
    ): Promise<{
      allowed: boolean
      reason?: string
      upgradeRequired?: boolean
      requiredPlan?: string
      currentLimit?: number
    }> => ipcRenderer.invoke('license:checkAction', userId, action),

    clearCache: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('license:clearCache'),

    // Events
    onStatusChanged: (callback: (license: {
      isValid: boolean
      plan: string
      maxAccounts: number
      currentAccounts: number
      expiresAt: number | null
      trialEndsAt: number | null
      status: string
      subscriptionStatus: string
      message: string
      daysRemaining: number | null
      gracePeriodEndsAt: number | null
    }) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, license: unknown): void => callback(license as {
        isValid: boolean
        plan: string
        maxAccounts: number
        currentAccounts: number
        expiresAt: number | null
        trialEndsAt: number | null
        status: string
        subscriptionStatus: string
        message: string
        daysRemaining: number | null
        gracePeriodEndsAt: number | null
      })
      ipcRenderer.on('license:statusChanged', listener)
      return () => ipcRenderer.removeListener('license:statusChanged', listener)
    }
  },

  // Updater API
  updater: {
    checkForUpdates: (): Promise<{
      version: string
      releaseDate: string
      releaseNotes: string | null
      releaseName: string | null
    } | null> => ipcRenderer.invoke('updater:check'),

    downloadUpdate: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('updater:download'),

    installUpdate: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('updater:install'),

    getVersion: (): Promise<string> =>
      ipcRenderer.invoke('updater:get-version'),

    getStatus: (): Promise<{
      checking: boolean
      available: boolean
      downloading: boolean
      downloaded: boolean
      error: string | null
      updateInfo: {
        version: string
        releaseDate: string
        releaseNotes: string | null
        releaseName: string | null
      } | null
      progress: {
        bytesPerSecond: number
        percent: number
        transferred: number
        total: number
      } | null
    }> => ipcRenderer.invoke('updater:get-status'),

    getConfig: (): Promise<{
      autoCheck: boolean
      autoDownload: boolean
      checkIntervalHours: number
      lastCheckedAt: number | null
    }> => ipcRenderer.invoke('updater:get-config'),

    setConfig: (updates: {
      autoCheck?: boolean
      autoDownload?: boolean
      checkIntervalHours?: number
    }): Promise<{
      autoCheck: boolean
      autoDownload: boolean
      checkIntervalHours: number
      lastCheckedAt: number | null
    }> => ipcRenderer.invoke('updater:set-config', updates),

    // Events
    onChecking: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('updater:checking', listener)
      return () => ipcRenderer.removeListener('updater:checking', listener)
    },

    onAvailable: (callback: (info: {
      version: string
      releaseDate: string
      releaseNotes: string | null
      releaseName: string | null
    }) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, info: {
        version: string
        releaseDate: string
        releaseNotes: string | null
        releaseName: string | null
      }): void => callback(info)
      ipcRenderer.on('updater:available', listener)
      return () => ipcRenderer.removeListener('updater:available', listener)
    },

    onNotAvailable: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('updater:not-available', listener)
      return () => ipcRenderer.removeListener('updater:not-available', listener)
    },

    onProgress: (callback: (progress: {
      bytesPerSecond: number
      percent: number
      transferred: number
      total: number
    }) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, progress: {
        bytesPerSecond: number
        percent: number
        transferred: number
        total: number
      }): void => callback(progress)
      ipcRenderer.on('updater:progress', listener)
      return () => ipcRenderer.removeListener('updater:progress', listener)
    },

    onDownloaded: (callback: (info: {
      version: string
      releaseDate: string
      releaseNotes: string | null
      releaseName: string | null
    }) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, info: {
        version: string
        releaseDate: string
        releaseNotes: string | null
        releaseName: string | null
      }): void => callback(info)
      ipcRenderer.on('updater:downloaded', listener)
      return () => ipcRenderer.removeListener('updater:downloaded', listener)
    },

    onError: (callback: (error: string) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, error: string): void => callback(error)
      ipcRenderer.on('updater:error', listener)
      return () => ipcRenderer.removeListener('updater:error', listener)
    }
  },

  // Sync API
  sync: {
    // Get device ID
    getDeviceId: (): Promise<string> =>
      ipcRenderer.invoke('sync:get-device-id'),

    // Get current device info
    getCurrentDevice: (): Promise<{
      id: string
      name: string
      platform: 'win32' | 'darwin' | 'linux'
      lastActiveAt: number
      createdAt: number
      isCurrentDevice: boolean
    }> => ipcRenderer.invoke('sync:get-current-device'),

    // Set sync password
    setPassword: (password: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('sync:set-password', password),

    // Check if sync password is set
    hasPassword: (): Promise<boolean> =>
      ipcRenderer.invoke('sync:has-password'),

    // Clear sync password
    clearPassword: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('sync:clear-password'),

    // Register device
    registerDevice: (userId: string): Promise<{
      success: boolean
      device?: {
        id: string
        name: string
        platform: 'win32' | 'darwin' | 'linux'
        lastActiveAt: number
        createdAt: number
        isCurrentDevice: boolean
      }
      error?: string
    }> => ipcRenderer.invoke('sync:register-device', userId),

    // Get registered devices
    getDevices: (userId: string): Promise<{
      id: string
      name: string
      platform: 'win32' | 'darwin' | 'linux'
      lastActiveAt: number
      createdAt: number
      isCurrentDevice: boolean
    }[]> => ipcRenderer.invoke('sync:get-devices', userId),

    // Remove device
    removeDevice: (userId: string, deviceId: string): Promise<{
      success: boolean
      error?: string
    }> => ipcRenderer.invoke('sync:remove-device', userId, deviceId),

    // Sync to cloud
    toCloud: (userId: string): Promise<{
      success: boolean
      syncedAt?: number
      itemsSynced?: {
        accounts: number
        groups: number
        proxies: number
        templates: number
        automationTasks: number
      }
      conflicts?: unknown[]
      error?: string
    }> => ipcRenderer.invoke('sync:to-cloud', userId),

    // Sync from cloud
    fromCloud: (userId: string): Promise<{
      success: boolean
      syncedAt?: number
      itemsSynced?: {
        accounts: number
        groups: number
        proxies: number
        templates: number
        automationTasks: number
      }
      conflicts?: unknown[]
      error?: string
    }> => ipcRenderer.invoke('sync:from-cloud', userId),

    // Get last sync time
    getLastSync: (userId: string): Promise<number | null> =>
      ipcRenderer.invoke('sync:get-last-sync', userId),

    // Get sync status
    getStatus: (userId: string): Promise<{
      lastSyncAt: number | null
      hasCloudData: boolean
      isSyncing: boolean
      lastError: string | null
    }> => ipcRenderer.invoke('sync:get-status', userId),

    // Export local data
    exportData: (): Promise<{
      success: boolean
      data?: unknown
      error?: string
    }> => ipcRenderer.invoke('sync:export-data'),

    // Import data
    importData: (data: unknown): Promise<{
      success: boolean
      error?: string
    }> => ipcRenderer.invoke('sync:import-data', data),
  },

  // Auth API
  auth: {
    // Check if auth service is available
    isAvailable: (): Promise<boolean> =>
      ipcRenderer.invoke('auth:isAvailable'),

    // Sign up with email and password
    signUp: (email: string, password: string): Promise<{
      success: boolean
      user?: {
        uid: string
        email: string | null
        displayName: string | null
        photoURL: string | null
        emailVerified: boolean
        createdAt: number | null
        lastLoginAt: number | null
      }
      error?: string
    }> => ipcRenderer.invoke('auth:signUp', email, password),

    // Sign in with email and password
    signIn: (email: string, password: string): Promise<{
      success: boolean
      user?: {
        uid: string
        email: string | null
        displayName: string | null
        photoURL: string | null
        emailVerified: boolean
        createdAt: number | null
        lastLoginAt: number | null
      }
      error?: string
    }> => ipcRenderer.invoke('auth:signIn', email, password),

    // Sign out
    signOut: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('auth:signOut'),

    // Reset password
    resetPassword: (email: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('auth:resetPassword', email),

    // Get current user
    getCurrentUser: (): Promise<{
      uid: string
      email: string | null
      displayName: string | null
      photoURL: string | null
      emailVerified: boolean
      createdAt: number | null
      lastLoginAt: number | null
    } | null> => ipcRenderer.invoke('auth:getCurrentUser'),

    // Try restore session from stored token
    tryRestoreSession: (): Promise<{
      success: boolean
      user?: {
        uid: string
        email: string | null
        displayName: string | null
        photoURL: string | null
        emailVerified: boolean
        createdAt: number | null
        lastLoginAt: number | null
      }
      error?: string
    }> => ipcRenderer.invoke('auth:tryRestoreSession'),

    // Listen for auth state changes
    onAuthStateChanged: (callback: (user: {
      uid: string
      email: string | null
      displayName: string | null
      photoURL: string | null
      emailVerified: boolean
      createdAt: number | null
      lastLoginAt: number | null
    } | null) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, user: unknown): void => callback(user as {
        uid: string
        email: string | null
        displayName: string | null
        photoURL: string | null
        emailVerified: boolean
        createdAt: number | null
        lastLoginAt: number | null
      } | null)
      ipcRenderer.on('auth:stateChanged', listener)
      return () => ipcRenderer.removeListener('auth:stateChanged', listener)
    }
  },

  // General IPC
  send: (channel: string, ...args: unknown[]): void => {
    ipcRenderer.send(channel, ...args)
  },
  invoke: (channel: string, ...args: unknown[]): Promise<unknown> => {
    return ipcRenderer.invoke(channel, ...args)
  },
  on: (channel: string, callback: (...args: unknown[]) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void => callback(...args)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
