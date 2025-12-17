import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from './index'
import type {
  AutomationTask,
  AutomationLog,
  AutomationActionType,
  AutomationTargetType,
  ActionStatus
} from '../../shared/types'

interface AutomationTaskRow {
  id: string
  name: string
  action_type: string
  is_enabled: number
  account_ids: string
  target_type: string
  target_value: string | null
  interval_minutes: number
  daily_limit: number
  today_count: number
  last_run_at: number | null
  next_run_at: number | null
  created_at: number
  updated_at: number
}

interface AutomationLogRow {
  id: string
  task_id: string
  account_id: string
  action_type: string
  target_url: string | null
  status: string
  error_message: string | null
  created_at: number
}

function rowToTask(row: AutomationTaskRow): AutomationTask {
  return {
    id: row.id,
    name: row.name,
    actionType: row.action_type as AutomationActionType,
    isEnabled: row.is_enabled === 1,
    accountIds: JSON.parse(row.account_ids),
    targetType: row.target_type as AutomationTargetType,
    targetValue: row.target_value,
    intervalMinutes: row.interval_minutes,
    dailyLimit: row.daily_limit,
    todayCount: row.today_count,
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function rowToLog(row: AutomationLogRow): AutomationLog {
  return {
    id: row.id,
    taskId: row.task_id,
    accountId: row.account_id,
    actionType: row.action_type as AutomationActionType,
    targetUrl: row.target_url,
    status: row.status as ActionStatus,
    errorMessage: row.error_message,
    createdAt: row.created_at
  }
}

// Task CRUD Operations

export function getAllAutomationTasks(): AutomationTask[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM automation_tasks ORDER BY created_at DESC')
    .all() as AutomationTaskRow[]
  return rows.map(rowToTask)
}

export function getAutomationTaskById(id: string): AutomationTask | null {
  const db = getDatabase()
  const row = db
    .prepare('SELECT * FROM automation_tasks WHERE id = ?')
    .get(id) as AutomationTaskRow | undefined
  return row ? rowToTask(row) : null
}

export function getEnabledAutomationTasks(): AutomationTask[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM automation_tasks WHERE is_enabled = 1 ORDER BY next_run_at ASC')
    .all() as AutomationTaskRow[]
  return rows.map(rowToTask)
}

export function getDueAutomationTasks(): AutomationTask[] {
  const db = getDatabase()
  const now = Date.now()
  const rows = db
    .prepare(
      'SELECT * FROM automation_tasks WHERE is_enabled = 1 AND (next_run_at IS NULL OR next_run_at <= ?) ORDER BY next_run_at ASC'
    )
    .all(now) as AutomationTaskRow[]
  return rows.map(rowToTask)
}

interface CreateTaskInput {
  name: string
  actionType: AutomationActionType
  accountIds: string[]
  targetType: AutomationTargetType
  targetValue?: string | null
  intervalMinutes?: number
  dailyLimit?: number
}

export function createAutomationTask(input: CreateTaskInput): AutomationTask {
  const db = getDatabase()
  const id = uuidv4()
  const now = Date.now()

  db.prepare(`
    INSERT INTO automation_tasks (
      id, name, action_type, is_enabled, account_ids, target_type, target_value,
      interval_minutes, daily_limit, today_count, last_run_at, next_run_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.name,
    input.actionType,
    0, // disabled by default
    JSON.stringify(input.accountIds),
    input.targetType,
    input.targetValue ?? null,
    input.intervalMinutes ?? 60,
    input.dailyLimit ?? 50,
    0,
    null,
    null,
    now,
    now
  )

  return getAutomationTaskById(id)!
}

interface UpdateTaskInput {
  name?: string
  actionType?: AutomationActionType
  isEnabled?: boolean
  accountIds?: string[]
  targetType?: AutomationTargetType
  targetValue?: string | null
  intervalMinutes?: number
  dailyLimit?: number
}

export function updateAutomationTask(id: string, updates: UpdateTaskInput): AutomationTask | null {
  const db = getDatabase()
  const existing = getAutomationTaskById(id)
  if (!existing) return null

  const now = Date.now()
  const name = updates.name ?? existing.name
  const actionType = updates.actionType ?? existing.actionType
  const isEnabled = updates.isEnabled !== undefined ? (updates.isEnabled ? 1 : 0) : (existing.isEnabled ? 1 : 0)
  const accountIds = updates.accountIds !== undefined ? JSON.stringify(updates.accountIds) : JSON.stringify(existing.accountIds)
  const targetType = updates.targetType ?? existing.targetType
  const targetValue = updates.targetValue !== undefined ? updates.targetValue : existing.targetValue
  const intervalMinutes = updates.intervalMinutes ?? existing.intervalMinutes
  const dailyLimit = updates.dailyLimit ?? existing.dailyLimit

  // Calculate next run time if enabling
  let nextRunAt = existing.nextRunAt
  if (updates.isEnabled === true && !existing.isEnabled) {
    nextRunAt = now + intervalMinutes * 60 * 1000
  } else if (updates.isEnabled === false) {
    nextRunAt = null
  }

  db.prepare(`
    UPDATE automation_tasks
    SET name = ?, action_type = ?, is_enabled = ?, account_ids = ?, target_type = ?,
        target_value = ?, interval_minutes = ?, daily_limit = ?, next_run_at = ?, updated_at = ?
    WHERE id = ?
  `).run(
    name,
    actionType,
    isEnabled,
    accountIds,
    targetType,
    targetValue,
    intervalMinutes,
    dailyLimit,
    nextRunAt,
    now,
    id
  )

  return getAutomationTaskById(id)
}

export function updateTaskAfterRun(id: string, success: boolean): AutomationTask | null {
  const db = getDatabase()
  const existing = getAutomationTaskById(id)
  if (!existing) return null

  const now = Date.now()
  const nextRunAt = now + existing.intervalMinutes * 60 * 1000
  const todayCount = existing.todayCount + (success ? 1 : 0)

  db.prepare(`
    UPDATE automation_tasks
    SET last_run_at = ?, next_run_at = ?, today_count = ?, updated_at = ?
    WHERE id = ?
  `).run(now, nextRunAt, todayCount, now, id)

  return getAutomationTaskById(id)
}

export function resetDailyCounters(): void {
  const db = getDatabase()
  const now = Date.now()
  db.prepare('UPDATE automation_tasks SET today_count = 0, updated_at = ?').run(now)
}

export function deleteAutomationTask(id: string): boolean {
  const db = getDatabase()
  // Logs will be cascade deleted
  const result = db.prepare('DELETE FROM automation_tasks WHERE id = ?').run(id)
  return result.changes > 0
}

// Log Operations

export function getAutomationLogs(limit: number = 100, offset: number = 0): AutomationLog[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM automation_logs ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(limit, offset) as AutomationLogRow[]
  return rows.map(rowToLog)
}

export function getAutomationLogsByTask(taskId: string, limit: number = 50): AutomationLog[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM automation_logs WHERE task_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(taskId, limit) as AutomationLogRow[]
  return rows.map(rowToLog)
}

export function createAutomationLog(
  taskId: string,
  accountId: string,
  actionType: AutomationActionType,
  targetUrl: string | null,
  status: ActionStatus,
  errorMessage: string | null = null
): AutomationLog {
  const db = getDatabase()
  const id = uuidv4()
  const now = Date.now()

  db.prepare(`
    INSERT INTO automation_logs (id, task_id, account_id, action_type, target_url, status, error_message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, taskId, accountId, actionType, targetUrl, status, errorMessage, now)

  return {
    id,
    taskId,
    accountId,
    actionType,
    targetUrl,
    status,
    errorMessage,
    createdAt: now
  }
}

export function getAutomationStats(): {
  totalTasks: number
  enabledTasks: number
  totalActionsToday: number
  successRate: number
} {
  const db = getDatabase()

  const taskStats = db
    .prepare('SELECT COUNT(*) as total, SUM(is_enabled) as enabled, SUM(today_count) as today_total FROM automation_tasks')
    .get() as { total: number; enabled: number; today_total: number }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.getTime()

  const logStats = db
    .prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success
      FROM automation_logs
      WHERE created_at >= ?
    `)
    .get(todayStart) as { total: number; success: number }

  const successRate = logStats.total > 0 ? (logStats.success / logStats.total) * 100 : 0

  return {
    totalTasks: taskStats.total,
    enabledTasks: taskStats.enabled || 0,
    totalActionsToday: taskStats.today_total || 0,
    successRate: Math.round(successRate)
  }
}
