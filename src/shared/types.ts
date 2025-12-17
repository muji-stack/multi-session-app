// Account Types
export interface Account {
  id: string
  username: string
  displayName: string | null
  profileImage: string | null
  groupId: string | null
  proxyId: string | null
  memo: string | null
  status: AccountStatus
  searchBanStatus: SearchBanStatus
  lastCheckedAt: number | null
  sortOrder: number
  createdAt: number
  updatedAt: number
}

export type AccountStatus = 'normal' | 'locked' | 'suspended' | 'unknown'
export type SearchBanStatus = 'visible' | 'hidden' | 'unknown'

// Group Types
export interface Group {
  id: string
  name: string
  color: string
  sortOrder: number
  createdAt: number
}

// Proxy Types
export interface Proxy {
  id: string
  name: string
  host: string
  port: number
  username: string | null
  password: string | null
  protocol: ProxyProtocol
  groupId: string | null
  status: ProxyStatus
  lastCheckedAt: number | null
  createdAt: number
}

export type ProxyProtocol = 'http' | 'https' | 'socks5'
export type ProxyStatus = 'unknown' | 'active' | 'inactive' | 'error'

// Proxy Group Types
export interface ProxyGroup {
  id: string
  name: string
  createdAt: number
}

// Image Pool Types
export interface ImagePoolItem {
  id: string
  filePath: string
  fileName: string
  category: string | null
  createdAt: number
}

// Post Template Types
export interface PostTemplate {
  id: string
  name: string
  content: string
  imageCategory: string | null
  createdAt: number
}

// Action Log Types
export interface ActionLog {
  id: string
  accountId: string | null
  actionType: ActionType
  targetUrl: string | null
  status: ActionStatus
  errorMessage: string | null
  createdAt: number
}

export type ActionType = 'post' | 'like' | 'repost' | 'bookmark' | 'follow'
export type ActionStatus = 'pending' | 'success' | 'failed'

// Scheduled Post Types
export interface ScheduledPost {
  id: string
  accountId: string
  content: string
  mediaIds: string[] | null
  scheduledAt: number
  status: ScheduledPostStatus
  errorMessage: string | null
  executedAt: number | null
  createdAt: number
  updatedAt: number
}

export type ScheduledPostStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

// Automation Task Types
export interface AutomationTask {
  id: string
  name: string
  actionType: AutomationActionType
  isEnabled: boolean
  accountIds: string[] // Target accounts
  targetType: AutomationTargetType
  targetValue: string | null // keyword, hashtag, or user list
  intervalMinutes: number // Interval between actions
  dailyLimit: number // Max actions per day per account
  todayCount: number // Actions performed today
  lastRunAt: number | null
  nextRunAt: number | null
  createdAt: number
  updatedAt: number
}

export type AutomationActionType = 'like' | 'repost' | 'follow' | 'unfollow'
export type AutomationTargetType = 'keyword' | 'hashtag' | 'timeline' | 'user_list'

// Automation Log Types
export interface AutomationLog {
  id: string
  taskId: string
  accountId: string
  actionType: AutomationActionType
  targetUrl: string | null
  status: ActionStatus
  errorMessage: string | null
  createdAt: number
}

// Workflow Types
export interface Workflow {
  id: string
  name: string
  description: string | null
  isEnabled: boolean
  triggerType: WorkflowTriggerType
  triggerConfig: WorkflowTriggerConfig | null
  lastRunAt: number | null
  nextRunAt: number | null
  runCount: number
  createdAt: number
  updatedAt: number
}

export type WorkflowTriggerType = 'manual' | 'schedule' | 'event'

export interface WorkflowTriggerConfig {
  // Schedule trigger
  cronExpression?: string
  intervalMinutes?: number
  // Event trigger
  eventType?: 'account_added' | 'post_completed' | 'engagement_completed'
}

export interface WorkflowStep {
  id: string
  workflowId: string
  stepOrder: number
  stepType: WorkflowStepType
  actionType: WorkflowActionType | null
  actionConfig: WorkflowActionConfig | null
  conditionType: WorkflowConditionType | null
  conditionConfig: WorkflowConditionConfig | null
  onSuccessStepId: string | null
  onFailureStepId: string | null
  createdAt: number
  updatedAt: number
}

export type WorkflowStepType = 'action' | 'condition' | 'loop' | 'delay' | 'parallel'

export type WorkflowActionType =
  | 'post'
  | 'like'
  | 'repost'
  | 'follow'
  | 'unfollow'
  | 'check_status'
  | 'send_notification'

export interface WorkflowActionConfig {
  // Post action
  content?: string
  templateId?: string
  // Engagement actions
  targetUrl?: string
  targetKeyword?: string
  targetHashtag?: string
  targetCount?: number
  // Account selection
  accountIds?: string[]
  accountGroupId?: string
  // Delay action
  delayMinutes?: number
  delaySeconds?: number
  // Loop action
  loopCount?: number
  loopAccountIds?: string[]
  // Notification
  notificationMessage?: string
}

export type WorkflowConditionType =
  | 'account_status'
  | 'time_range'
  | 'action_count'
  | 'random_chance'
  | 'account_has_proxy'

export interface WorkflowConditionConfig {
  // Account status condition
  expectedStatus?: AccountStatus
  // Time range condition
  startHour?: number
  endHour?: number
  daysOfWeek?: number[]
  // Action count condition
  minCount?: number
  maxCount?: number
  // Random chance condition
  probability?: number
}

export interface WorkflowLog {
  id: string
  workflowId: string
  runId: string
  stepId: string | null
  status: WorkflowLogStatus
  startedAt: number
  completedAt: number | null
  errorMessage: string | null
  resultData: WorkflowResultData | null
}

export type WorkflowLogStatus = 'running' | 'completed' | 'failed' | 'skipped'

export interface WorkflowResultData {
  accountsProcessed?: number
  actionsExecuted?: number
  successCount?: number
  failureCount?: number
  details?: string
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string | null
  category: WorkflowTemplateCategory
  templateData: WorkflowTemplateData
  createdAt: number
}

export type WorkflowTemplateCategory = 'general' | 'engagement' | 'posting' | 'monitoring'

export interface WorkflowTemplateData {
  steps: Omit<WorkflowStep, 'id' | 'workflowId' | 'createdAt' | 'updatedAt'>[]
  triggerType: WorkflowTriggerType
  triggerConfig?: WorkflowTriggerConfig
}

// Workflow with steps (joined)
export interface WorkflowWithSteps extends Workflow {
  steps: WorkflowStep[]
}

// Media Types
export interface MediaItem {
  id: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  mediaType: MediaType
  width: number | null
  height: number | null
  duration: number | null
  thumbnailPath: string | null
  tags: string[]
  description: string | null
  isFavorite: boolean
  useCount: number
  lastUsedAt: number | null
  createdAt: number
  updatedAt: number
}

export type MediaType = 'image' | 'video' | 'gif'

export interface MediaTag {
  id: string
  name: string
  color: string
  useCount: number
  createdAt: number
}

export interface MediaUploadResult {
  success: boolean
  media?: MediaItem
  error?: string
}

export interface MediaStats {
  totalItems: number
  totalImages: number
  totalVideos: number
  totalGifs: number
  totalSize: number
  favoriteCount: number
}

// Monitoring Types
export interface MonitoringAlert {
  id: string
  accountId: string
  alertType: MonitoringAlertType
  severity: AlertSeverity
  message: string
  details: string | null
  isRead: boolean
  isResolved: boolean
  createdAt: number
  resolvedAt: number | null
}

export type MonitoringAlertType =
  | 'account_locked'
  | 'account_suspended'
  | 'shadow_ban_detected'
  | 'login_failed'
  | 'rate_limit'
  | 'action_failed'
  | 'proxy_error'
  | 'session_expired'

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface MonitoringConfig {
  id: string
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
  createdAt: number
  updatedAt: number
}

export interface MonitoringCheckResult {
  accountId: string
  username: string
  status: AccountStatus
  previousStatus: AccountStatus
  searchBanStatus: SearchBanStatus
  previousSearchBanStatus: SearchBanStatus
  isLoggedIn: boolean
  statusChanged: boolean
  searchBanChanged: boolean
  checkedAt: number
}

export interface MonitoringReport {
  id: string
  reportType: ReportType
  periodStart: number
  periodEnd: number
  data: MonitoringReportData
  createdAt: number
}

export type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom'

export interface MonitoringReportData {
  accountStats: {
    total: number
    normal: number
    locked: number
    suspended: number
    shadowBanned: number
  }
  alertStats: {
    total: number
    byType: Record<MonitoringAlertType, number>
    bySeverity: Record<AlertSeverity, number>
  }
  actionStats: {
    totalActions: number
    successfulActions: number
    failedActions: number
    successRate: number
    byType: Record<string, { total: number; success: number; failed: number }>
  }
  topIssueAccounts: {
    accountId: string
    username: string
    alertCount: number
    failedActions: number
  }[]
  trends: {
    date: string
    alerts: number
    issues: number
    actions: number
  }[]
}

export interface MonitoringStats {
  totalAccounts: number
  normalAccounts: number
  lockedAccounts: number
  suspendedAccounts: number
  shadowBannedAccounts: number
  unresolvedAlerts: number
  recentAlerts: number
  lastCheckAt: number | null
}

// Security Types
export interface SecurityConfig {
  id: string
  masterPasswordHash: string | null
  masterPasswordSalt: string | null
  isLockEnabled: boolean
  autoLockMinutes: number
  lockOnMinimize: boolean
  lockOnSleep: boolean
  encryptSessionData: boolean
  lastUnlockedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface SecureCredential {
  id: string
  accountId: string
  credentialType: CredentialType
  encryptedData: string
  iv: string
  createdAt: number
  updatedAt: number
}

export type CredentialType = 'session' | 'cookie' | 'token' | 'api_key'

export interface LockState {
  isLocked: boolean
  lockedAt: number | null
  failedAttempts: number
  lastFailedAt: number | null
}

// Notification Types
export interface AppNotification {
  id: string
  type: NotificationType
  category: NotificationCategory
  title: string
  message: string
  accountId: string | null
  actionUrl: string | null
  isRead: boolean
  isArchived: boolean
  priority: NotificationPriority
  createdAt: number
  readAt: number | null
}

export type NotificationType =
  | 'account_status_change'
  | 'shadow_ban_detected'
  | 'scheduled_post_executed'
  | 'scheduled_post_failed'
  | 'automation_completed'
  | 'automation_failed'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'system_update'
  | 'security_alert'
  | 'rate_limit_warning'
  | 'action_required'

export type NotificationCategory = 'account' | 'post' | 'automation' | 'workflow' | 'system' | 'security'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface NotificationSettings {
  id: string
  enableDesktopNotifications: boolean
  enableSoundNotifications: boolean
  enableInAppNotifications: boolean
  soundVolume: number
  showPreview: boolean
  groupByCategory: boolean
  autoMarkReadSeconds: number | null
  quietHoursEnabled: boolean
  quietHoursStart: string | null
  quietHoursEnd: string | null
  enabledCategories: NotificationCategory[]
  enabledPriorities: NotificationPriority[]
  createdAt: number
  updatedAt: number
}

export interface NotificationStats {
  total: number
  unread: number
  byCategory: Record<NotificationCategory, number>
  byPriority: Record<NotificationPriority, number>
  todayCount: number
}

// Shadow Ban Types
export interface ShadowBanResult {
  accountId: string
  username: string
  searchSuggestion: boolean // 検索候補に表示
  searchTop: boolean // 話題タブに表示
  searchLatest: boolean // 最新タブに表示
  ghostBan: GhostBanStatus
  checkedAt: number
  overallStatus: ShadowBanOverallStatus
  error?: string
}

export type GhostBanStatus = 'none' | 'partial' | 'full' | 'unknown'

export type ShadowBanOverallStatus =
  | 'clean'
  | 'suggestion_ban'
  | 'search_ban'
  | 'ghost_ban'
  | 'multiple'
  | 'error'

export interface ShadowBanCheckProgress {
  step: ShadowBanCheckStep
  completed: number
  total: number
  currentAccount?: string
}

export type ShadowBanCheckStep =
  | 'initializing'
  | 'search_suggestion'
  | 'search_top'
  | 'search_latest'
  | 'ghost_ban'
  | 'complete'

// UI Types
export interface NavItem {
  id: string
  label: string
  icon: string
  path: string
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}
