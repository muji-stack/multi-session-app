import { ElectronAPI } from '@electron-toolkit/preload'
import type { Account, AccountStatus, SearchBanStatus, Group } from '../shared/types'

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

interface AccountApi {
  getAll: () => Promise<Account[]>
  getById: (id: string) => Promise<Account | null>
  create: (input: CreateAccountInput) => Promise<Account>
  update: (id: string, input: UpdateAccountInput) => Promise<Account | null>
  delete: (id: string) => Promise<boolean>
  getStats: () => Promise<AccountStats>
  updateSortOrders: (orders: { id: string; sortOrder: number }[]) => Promise<boolean>
}

interface BrowserApi {
  open: (accountId: string) => Promise<{ success: boolean; windowId: number }>
  close: (accountId: string) => Promise<boolean>
  focus: (accountId: string) => Promise<boolean>
  getAll: () => Promise<{ accountId: string; title: string }[]>
  clearSession: (accountId: string) => Promise<boolean>
}

interface PostTemplate {
  id: string
  name: string
  content: string
  imageCategory: string | null
  createdAt: number
}

interface ActionLog {
  id: string
  accountId: string
  actionType: 'post' | 'like' | 'retweet' | 'follow' | 'reply'
  targetUrl: string | null
  status: 'pending' | 'success' | 'failed'
  errorMessage: string | null
  createdAt: number
}

interface PostResult {
  accountId: string
  success: boolean
  error?: string
}

interface PostProgressData {
  completed: number
  total: number
  result: PostResult
}

interface PostApi {
  getTemplates: () => Promise<PostTemplate[]>
  getTemplateById: (id: string) => Promise<PostTemplate | null>
  createTemplate: (name: string, content: string, imageCategory?: string) => Promise<PostTemplate>
  updateTemplate: (id: string, updates: { name?: string; content?: string; imageCategory?: string | null }) => Promise<PostTemplate | null>
  deleteTemplate: (id: string) => Promise<boolean>
  getActionLogs: (limit?: number, offset?: number) => Promise<ActionLog[]>
  getActionLogsByAccount: (accountId: string) => Promise<ActionLog[]>
  executeBulk: (params: { accountIds: string[]; content: string; delayBetweenPosts?: number }) => Promise<PostResult[]>
  checkLoginStatus: (accountId: string) => Promise<boolean>
  checkMultipleLoginStatus: (accountIds: string[]) => Promise<{ accountId: string; loggedIn: boolean }[]>
  onProgress: (callback: (data: PostProgressData) => void) => () => void
}

interface EngagementResult {
  accountId: string
  success: boolean
  error?: string
}

interface EngagementProgressData {
  completed: number
  total: number
  result: EngagementResult
}

interface EngagementApi {
  executeBulk: (params: { accountIds: string[]; targetUrl: string; actionType: string; delayBetweenActions?: number }) => Promise<EngagementResult[]>
  onProgress: (callback: (data: EngagementProgressData) => void) => () => void
}

interface CheckResult {
  accountId: string
  username: string
  status: AccountStatus
  searchBanStatus: SearchBanStatus
  isLoggedIn: boolean
  error?: string
}

interface CheckProgressData {
  completed: number
  total: number
  result: CheckResult
}

interface CheckApi {
  single: (accountId: string) => Promise<CheckResult>
  multiple: (accountIds: string[]) => Promise<CheckResult[]>
  onProgress: (callback: (data: CheckProgressData) => void) => () => void
}

interface GroupApi {
  getAll: () => Promise<Group[]>
  getById: (id: string) => Promise<Group | null>
  create: (name: string, color?: string) => Promise<Group>
  update: (id: string, updates: { name?: string; color?: string }) => Promise<Group | null>
  delete: (id: string) => Promise<boolean>
  updateSortOrders: (orders: { id: string; sortOrder: number }[]) => Promise<boolean>
  getStats: () => Promise<{ groupId: string; count: number }[]>
}

interface ProxyApi {
  getAll: () => Promise<unknown[]>
  getById: (id: string) => Promise<unknown>
  create: (input: {
    name: string
    host: string
    port: number
    username?: string | null
    password?: string | null
    protocol?: string
    groupId?: string | null
  }) => Promise<unknown>
  update: (id: string, updates: {
    name?: string
    host?: string
    port?: number
    username?: string | null
    password?: string | null
    protocol?: string
    groupId?: string | null
  }) => Promise<unknown>
  delete: (id: string) => Promise<boolean>
  getStats: () => Promise<{ proxyId: string; accountCount: number }[]>
  check: (id: string) => Promise<{ success: boolean; status?: string; error?: string }>
  checkMultiple: (ids: string[]) => Promise<{ id: string; status: string; error?: string }[]>
}

interface ScheduledPostApi {
  getAll: () => Promise<unknown[]>
  getById: (id: string) => Promise<unknown>
  getByAccount: (accountId: string) => Promise<unknown[]>
  getByStatus: (status: string) => Promise<unknown[]>
  getUpcoming: (limit?: number) => Promise<unknown[]>
  create: (input: {
    accountId: string
    content: string
    mediaIds?: string[]
    scheduledAt: number
  }) => Promise<unknown>
  update: (id: string, updates: { content?: string; mediaIds?: string[] | null; scheduledAt?: number }) => Promise<unknown>
  delete: (id: string) => Promise<boolean>
  cancel: (id: string) => Promise<unknown>
  getInRange: (startTime: number, endTime: number) => Promise<unknown[]>
  getStats: () => Promise<{ pending: number; completed: number; failed: number; cancelled: number }>
}

interface AnalyticsApi {
  getActionStats: () => Promise<{ total: number; success: number; failed: number; pending: number }>
  getActionStatsByType: () => Promise<Record<string, { total: number; success: number; failed: number; pending: number }>>
  getDailyStats: (days?: number) => Promise<{ date: string; posts: number; likes: number; reposts: number; follows: number }[]>
  getAccountActionStats: (limit?: number) => Promise<{ accountId: string; username: string; total: number; success: number; failed: number }[]>
}

interface DataApi {
  export: () => Promise<{
    success: boolean
    cancelled?: boolean
    filePath?: string
    accountsExported?: number
    groupsExported?: number
    error?: string
  }>
  import: () => Promise<{
    success: boolean
    cancelled?: boolean
    accountsImported?: number
    groupsImported?: number
    errors?: string[]
  }>
  exportCSV: () => Promise<{
    success: boolean
    cancelled?: boolean
    filePath?: string
    accountsExported?: number
    error?: string
  }>
  importCSV: () => Promise<{
    success: boolean
    cancelled?: boolean
    accountsImported?: number
    errors?: string[]
  }>
}

interface AutomationApi {
  getTasks: () => Promise<unknown[]>
  getTaskById: (id: string) => Promise<unknown>
  getEnabledTasks: () => Promise<unknown[]>
  createTask: (input: {
    name: string
    actionType: string
    accountIds: string[]
    targetType: string
    targetValue?: string | null
    intervalMinutes?: number
    dailyLimit?: number
  }) => Promise<unknown>
  updateTask: (id: string, updates: {
    name?: string
    actionType?: string
    isEnabled?: boolean
    accountIds?: string[]
    targetType?: string
    targetValue?: string | null
    intervalMinutes?: number
    dailyLimit?: number
  }) => Promise<unknown>
  toggleTask: (id: string) => Promise<unknown>
  deleteTask: (id: string) => Promise<boolean>
  getLogs: (limit?: number, offset?: number) => Promise<unknown[]>
  getLogsByTask: (taskId: string, limit?: number) => Promise<unknown[]>
  getStats: () => Promise<{
    totalTasks: number
    enabledTasks: number
    totalActionsToday: number
    successRate: number
  }>
}

interface MediaApi {
  getAll: (options?: {
    mediaType?: string
    tags?: string[]
    isFavorite?: boolean
    search?: string
    limit?: number
    offset?: number
    sortBy?: string
    sortOrder?: string
  }) => Promise<unknown[]>
  getById: (id: string) => Promise<unknown>
  getByIds: (ids: string[]) => Promise<unknown[]>
  upload: (input?: { filePaths?: string[]; tags?: string[] }) => Promise<{
    success: boolean
    uploaded: unknown[]
    errors?: string[]
  }>
  update: (id: string, updates: {
    fileName?: string
    tags?: string[]
    description?: string | null
    isFavorite?: boolean
  }) => Promise<unknown>
  delete: (id: string) => Promise<boolean>
  deleteBatch: (ids: string[]) => Promise<{ success: number; failed: number }>
  toggleFavorite: (id: string) => Promise<unknown>
  incrementUseCount: (id: string) => Promise<boolean>
  getTags: () => Promise<unknown[]>
  createTag: (name: string, color?: string) => Promise<unknown>
  updateTag: (id: string, updates: { name?: string; color?: string }) => Promise<unknown>
  deleteTag: (id: string) => Promise<boolean>
  getStats: () => Promise<{
    totalCount: number
    imageCount: number
    videoCount: number
    totalSize: number
    favoriteCount: number
  }>
  getStoragePath: () => Promise<string>
  openStorageFolder: () => Promise<boolean>
  getFilePath: (id: string) => Promise<string | null>
}

interface WorkflowApi {
  getAll: () => Promise<unknown[]>
  getById: (id: string) => Promise<unknown>
  getWithSteps: (id: string) => Promise<unknown>
  getEnabled: () => Promise<unknown[]>
  create: (input: {
    name: string
    description?: string | null
    triggerType?: string
    triggerConfig?: unknown
  }) => Promise<unknown>
  update: (id: string, updates: {
    name?: string
    description?: string | null
    isEnabled?: boolean
    triggerType?: string
    triggerConfig?: unknown
  }) => Promise<unknown>
  toggle: (id: string) => Promise<unknown>
  delete: (id: string) => Promise<boolean>
  execute: (id: string) => Promise<{ success: boolean; runId: string; error?: string }>
  getSteps: (workflowId: string) => Promise<unknown[]>
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
  }) => Promise<unknown>
  updateStep: (id: string, updates: {
    stepOrder?: number
    stepType?: string
    actionType?: string | null
    actionConfig?: unknown
    conditionType?: string | null
    conditionConfig?: unknown
    onSuccessStepId?: string | null
    onFailureStepId?: string | null
  }) => Promise<unknown>
  deleteStep: (id: string) => Promise<boolean>
  deleteSteps: (workflowId: string) => Promise<boolean>
  reorderSteps: (workflowId: string, stepIds: string[]) => Promise<unknown[]>
  getLogs: (limit?: number, offset?: number) => Promise<unknown[]>
  getLogsByWorkflow: (workflowId: string, limit?: number) => Promise<unknown[]>
  getLogsByRunId: (runId: string) => Promise<unknown[]>
  getTemplates: () => Promise<unknown[]>
  getTemplateById: (id: string) => Promise<unknown>
  getTemplatesByCategory: (category: string) => Promise<unknown[]>
  createTemplate: (input: {
    name: string
    description?: string | null
    category?: string
    templateData: unknown
  }) => Promise<unknown>
  deleteTemplate: (id: string) => Promise<boolean>
  createFromTemplate: (templateId: string, name: string, description?: string | null) => Promise<unknown>
  getStats: () => Promise<{
    totalWorkflows: number
    enabledWorkflows: number
    totalRuns: number
    successRate: number
  }>
  onProgress: (callback: (data: { workflowId: string; runId: string; step: number; status: string }) => void) => () => void
}

interface Api {
  // Platform info
  platform: 'win32' | 'darwin' | 'linux'
  isMac: boolean
  isWindows: boolean
  isLinux: boolean

  // Window controls
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
  account: AccountApi
  browser: BrowserApi
  post: PostApi
  engagement: EngagementApi
  check: CheckApi
  group: GroupApi
  proxy: ProxyApi
  scheduledPost: ScheduledPostApi
  analytics: AnalyticsApi
  data: DataApi
  automation: AutomationApi
  workflow: WorkflowApi
  media: MediaApi
  send: (channel: string, ...args: unknown[]) => void
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}

export type { CreateAccountInput, UpdateAccountInput, AccountStats }
