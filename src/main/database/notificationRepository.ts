import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from './index'
import type {
  AppNotification,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationSettings,
  NotificationStats
} from '../../shared/types'

interface NotificationRow {
  id: string
  type: string
  category: string
  title: string
  message: string
  account_id: string | null
  action_url: string | null
  is_read: number
  is_archived: number
  priority: string
  created_at: number
  read_at: number | null
}

interface SettingsRow {
  id: string
  enable_desktop_notifications: number
  enable_sound_notifications: number
  enable_in_app_notifications: number
  sound_volume: number
  show_preview: number
  group_by_category: number
  auto_mark_read_seconds: number | null
  quiet_hours_enabled: number
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  enabled_categories: string
  enabled_priorities: string
  created_at: number
  updated_at: number
}

function rowToNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type as NotificationType,
    category: row.category as NotificationCategory,
    title: row.title,
    message: row.message,
    accountId: row.account_id,
    actionUrl: row.action_url,
    isRead: row.is_read === 1,
    isArchived: row.is_archived === 1,
    priority: row.priority as NotificationPriority,
    createdAt: row.created_at,
    readAt: row.read_at
  }
}

function rowToSettings(row: SettingsRow): NotificationSettings {
  return {
    id: row.id,
    enableDesktopNotifications: row.enable_desktop_notifications === 1,
    enableSoundNotifications: row.enable_sound_notifications === 1,
    enableInAppNotifications: row.enable_in_app_notifications === 1,
    soundVolume: row.sound_volume,
    showPreview: row.show_preview === 1,
    groupByCategory: row.group_by_category === 1,
    autoMarkReadSeconds: row.auto_mark_read_seconds,
    quietHoursEnabled: row.quiet_hours_enabled === 1,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
    enabledCategories: JSON.parse(row.enabled_categories),
    enabledPriorities: JSON.parse(row.enabled_priorities),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Notification CRUD
export function getAllNotifications(includeArchived = false): AppNotification[] {
  const db = getDatabase()
  const sql = includeArchived
    ? `SELECT * FROM app_notifications ORDER BY created_at DESC`
    : `SELECT * FROM app_notifications WHERE is_archived = 0 ORDER BY created_at DESC`
  const rows = db.prepare(sql).all() as NotificationRow[]
  return rows.map(rowToNotification)
}

export function getUnreadNotifications(): AppNotification[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT * FROM app_notifications WHERE is_read = 0 AND is_archived = 0 ORDER BY created_at DESC`
    )
    .all() as NotificationRow[]
  return rows.map(rowToNotification)
}

export function getNotificationsByCategory(category: NotificationCategory): AppNotification[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT * FROM app_notifications WHERE category = ? AND is_archived = 0 ORDER BY created_at DESC`
    )
    .all(category) as NotificationRow[]
  return rows.map(rowToNotification)
}

export function getNotificationsByAccount(accountId: string): AppNotification[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT * FROM app_notifications WHERE account_id = ? AND is_archived = 0 ORDER BY created_at DESC`
    )
    .all(accountId) as NotificationRow[]
  return rows.map(rowToNotification)
}

export function getNotificationById(id: string): AppNotification | null {
  const db = getDatabase()
  const row = db
    .prepare(`SELECT * FROM app_notifications WHERE id = ?`)
    .get(id) as NotificationRow | undefined
  return row ? rowToNotification(row) : null
}

export function createNotification(input: {
  type: NotificationType
  category: NotificationCategory
  title: string
  message: string
  accountId?: string | null
  actionUrl?: string | null
  priority?: NotificationPriority
}): AppNotification {
  const db = getDatabase()
  const now = Date.now()
  const id = uuidv4()

  db.prepare(
    `INSERT INTO app_notifications
     (id, type, category, title, message, account_id, action_url, is_read, is_archived, priority, created_at, read_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, NULL)`
  ).run(
    id,
    input.type,
    input.category,
    input.title,
    input.message,
    input.accountId ?? null,
    input.actionUrl ?? null,
    input.priority ?? 'normal',
    now
  )

  return {
    id,
    type: input.type,
    category: input.category,
    title: input.title,
    message: input.message,
    accountId: input.accountId ?? null,
    actionUrl: input.actionUrl ?? null,
    isRead: false,
    isArchived: false,
    priority: input.priority ?? 'normal',
    createdAt: now,
    readAt: null
  }
}

export function markAsRead(id: string): boolean {
  const db = getDatabase()
  const now = Date.now()
  const result = db
    .prepare(`UPDATE app_notifications SET is_read = 1, read_at = ? WHERE id = ?`)
    .run(now, id)
  return result.changes > 0
}

export function markAllAsRead(): number {
  const db = getDatabase()
  const now = Date.now()
  const result = db
    .prepare(`UPDATE app_notifications SET is_read = 1, read_at = ? WHERE is_read = 0`)
    .run(now)
  return result.changes
}

export function markAsArchived(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare(`UPDATE app_notifications SET is_archived = 1 WHERE id = ?`).run(id)
  return result.changes > 0
}

export function archiveAllRead(): number {
  const db = getDatabase()
  const result = db
    .prepare(`UPDATE app_notifications SET is_archived = 1 WHERE is_read = 1 AND is_archived = 0`)
    .run()
  return result.changes
}

export function deleteNotification(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare(`DELETE FROM app_notifications WHERE id = ?`).run(id)
  return result.changes > 0
}

export function deleteAllArchived(): number {
  const db = getDatabase()
  const result = db.prepare(`DELETE FROM app_notifications WHERE is_archived = 1`).run()
  return result.changes
}

export function deleteOldNotifications(olderThanDays: number): number {
  const db = getDatabase()
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000
  const result = db.prepare(`DELETE FROM app_notifications WHERE created_at < ?`).run(cutoff)
  return result.changes
}

// Notification Stats
export function getNotificationStats(): NotificationStats {
  const db = getDatabase()

  const totalRow = db
    .prepare(`SELECT COUNT(*) as count FROM app_notifications WHERE is_archived = 0`)
    .get() as { count: number }

  const unreadRow = db
    .prepare(
      `SELECT COUNT(*) as count FROM app_notifications WHERE is_read = 0 AND is_archived = 0`
    )
    .get() as { count: number }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayRow = db
    .prepare(`SELECT COUNT(*) as count FROM app_notifications WHERE created_at >= ?`)
    .get(todayStart.getTime()) as { count: number }

  const categoryRows = db
    .prepare(
      `SELECT category, COUNT(*) as count FROM app_notifications WHERE is_archived = 0 GROUP BY category`
    )
    .all() as { category: string; count: number }[]

  const priorityRows = db
    .prepare(
      `SELECT priority, COUNT(*) as count FROM app_notifications WHERE is_archived = 0 GROUP BY priority`
    )
    .all() as { priority: string; count: number }[]

  const byCategory: Record<NotificationCategory, number> = {
    account: 0,
    post: 0,
    automation: 0,
    workflow: 0,
    system: 0,
    security: 0
  }
  categoryRows.forEach((row) => {
    byCategory[row.category as NotificationCategory] = row.count
  })

  const byPriority: Record<NotificationPriority, number> = {
    low: 0,
    normal: 0,
    high: 0,
    urgent: 0
  }
  priorityRows.forEach((row) => {
    byPriority[row.priority as NotificationPriority] = row.count
  })

  return {
    total: totalRow.count,
    unread: unreadRow.count,
    byCategory,
    byPriority,
    todayCount: todayRow.count
  }
}

// Notification Settings
export function getNotificationSettings(): NotificationSettings | null {
  const db = getDatabase()
  const row = db.prepare(`SELECT * FROM notification_settings LIMIT 1`).get() as
    | SettingsRow
    | undefined
  return row ? rowToSettings(row) : null
}

export function getOrCreateNotificationSettings(): NotificationSettings {
  let settings = getNotificationSettings()
  if (!settings) {
    settings = createDefaultNotificationSettings()
  }
  return settings
}

export function createDefaultNotificationSettings(): NotificationSettings {
  const db = getDatabase()
  const now = Date.now()
  const id = uuidv4()

  db.prepare(
    `INSERT INTO notification_settings
     (id, enable_desktop_notifications, enable_sound_notifications, enable_in_app_notifications,
      sound_volume, show_preview, group_by_category, auto_mark_read_seconds,
      quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
      enabled_categories, enabled_priorities, created_at, updated_at)
     VALUES (?, 1, 0, 1, 50, 1, 0, NULL, 0, NULL, NULL, ?, ?, ?, ?)`
  ).run(
    id,
    JSON.stringify(['account', 'post', 'automation', 'workflow', 'system', 'security']),
    JSON.stringify(['low', 'normal', 'high', 'urgent']),
    now,
    now
  )

  return {
    id,
    enableDesktopNotifications: true,
    enableSoundNotifications: false,
    enableInAppNotifications: true,
    soundVolume: 50,
    showPreview: true,
    groupByCategory: false,
    autoMarkReadSeconds: null,
    quietHoursEnabled: false,
    quietHoursStart: null,
    quietHoursEnd: null,
    enabledCategories: ['account', 'post', 'automation', 'workflow', 'system', 'security'],
    enabledPriorities: ['low', 'normal', 'high', 'urgent'],
    createdAt: now,
    updatedAt: now
  }
}

export function updateNotificationSettings(
  updates: Partial<Omit<NotificationSettings, 'id' | 'createdAt' | 'updatedAt'>>
): NotificationSettings | null {
  const db = getDatabase()
  const settings = getOrCreateNotificationSettings()
  const now = Date.now()

  const fields: string[] = []
  const values: (string | number | null)[] = []

  if (updates.enableDesktopNotifications !== undefined) {
    fields.push('enable_desktop_notifications = ?')
    values.push(updates.enableDesktopNotifications ? 1 : 0)
  }
  if (updates.enableSoundNotifications !== undefined) {
    fields.push('enable_sound_notifications = ?')
    values.push(updates.enableSoundNotifications ? 1 : 0)
  }
  if (updates.enableInAppNotifications !== undefined) {
    fields.push('enable_in_app_notifications = ?')
    values.push(updates.enableInAppNotifications ? 1 : 0)
  }
  if (updates.soundVolume !== undefined) {
    fields.push('sound_volume = ?')
    values.push(updates.soundVolume)
  }
  if (updates.showPreview !== undefined) {
    fields.push('show_preview = ?')
    values.push(updates.showPreview ? 1 : 0)
  }
  if (updates.groupByCategory !== undefined) {
    fields.push('group_by_category = ?')
    values.push(updates.groupByCategory ? 1 : 0)
  }
  if (updates.autoMarkReadSeconds !== undefined) {
    fields.push('auto_mark_read_seconds = ?')
    values.push(updates.autoMarkReadSeconds)
  }
  if (updates.quietHoursEnabled !== undefined) {
    fields.push('quiet_hours_enabled = ?')
    values.push(updates.quietHoursEnabled ? 1 : 0)
  }
  if (updates.quietHoursStart !== undefined) {
    fields.push('quiet_hours_start = ?')
    values.push(updates.quietHoursStart)
  }
  if (updates.quietHoursEnd !== undefined) {
    fields.push('quiet_hours_end = ?')
    values.push(updates.quietHoursEnd)
  }
  if (updates.enabledCategories !== undefined) {
    fields.push('enabled_categories = ?')
    values.push(JSON.stringify(updates.enabledCategories))
  }
  if (updates.enabledPriorities !== undefined) {
    fields.push('enabled_priorities = ?')
    values.push(JSON.stringify(updates.enabledPriorities))
  }

  if (fields.length === 0) {
    return settings
  }

  fields.push('updated_at = ?')
  values.push(now)
  values.push(settings.id)

  db.prepare(`UPDATE notification_settings SET ${fields.join(', ')} WHERE id = ?`).run(...values)

  return getNotificationSettings()
}

export function getUnreadCount(): number {
  const db = getDatabase()
  const row = db
    .prepare(
      `SELECT COUNT(*) as count FROM app_notifications WHERE is_read = 0 AND is_archived = 0`
    )
    .get() as { count: number }
  return row.count
}
