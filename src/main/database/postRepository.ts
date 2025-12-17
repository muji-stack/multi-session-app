import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from './index'
import type { PostTemplate, ActionLog, ActionType, ActionStatus } from '../../shared/types'

// Post Template types
interface PostTemplateRow {
  id: string
  name: string
  content: string
  image_category: string | null
  created_at: number
}

function rowToTemplate(row: PostTemplateRow): PostTemplate {
  return {
    id: row.id,
    name: row.name,
    content: row.content,
    imageCategory: row.image_category,
    createdAt: row.created_at
  }
}

// Action Log types
interface ActionLogRow {
  id: string
  account_id: string | null
  action_type: string
  target_url: string | null
  status: string
  error_message: string | null
  created_at: number
}

function rowToActionLog(row: ActionLogRow): ActionLog {
  return {
    id: row.id,
    accountId: row.account_id,
    actionType: row.action_type as ActionType,
    targetUrl: row.target_url,
    status: row.status as ActionStatus,
    errorMessage: row.error_message,
    createdAt: row.created_at
  }
}

// Post Template CRUD
export function getAllTemplates(): PostTemplate[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM post_templates ORDER BY created_at DESC').all() as PostTemplateRow[]
  return rows.map(rowToTemplate)
}

export function getTemplateById(id: string): PostTemplate | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM post_templates WHERE id = ?').get(id) as PostTemplateRow | undefined
  return row ? rowToTemplate(row) : null
}

export function createTemplate(name: string, content: string, imageCategory?: string): PostTemplate {
  const db = getDatabase()
  const id = uuidv4()
  const now = Date.now()

  db.prepare(`
    INSERT INTO post_templates (id, name, content, image_category, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, content, imageCategory ?? null, now)

  return getTemplateById(id)!
}

export function updateTemplate(id: string, name: string, content: string, imageCategory?: string | null): PostTemplate | null {
  const db = getDatabase()
  const existing = getTemplateById(id)
  if (!existing) return null

  db.prepare(`
    UPDATE post_templates SET name = ?, content = ?, image_category = ? WHERE id = ?
  `).run(name, content, imageCategory ?? null, id)

  return getTemplateById(id)
}

export function deleteTemplate(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM post_templates WHERE id = ?').run(id)
  return result.changes > 0
}

// Action Log CRUD
export function createActionLog(
  accountId: string,
  actionType: ActionType,
  targetUrl?: string,
  status: ActionStatus = 'pending'
): ActionLog {
  const db = getDatabase()
  const id = uuidv4()
  const now = Date.now()

  db.prepare(`
    INSERT INTO action_logs (id, account_id, action_type, target_url, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, accountId, actionType, targetUrl ?? null, status, now)

  return {
    id,
    accountId,
    actionType,
    targetUrl: targetUrl ?? null,
    status,
    errorMessage: null,
    createdAt: now
  }
}

export function updateActionLogStatus(id: string, status: ActionStatus, errorMessage?: string): void {
  const db = getDatabase()
  db.prepare(`
    UPDATE action_logs SET status = ?, error_message = ? WHERE id = ?
  `).run(status, errorMessage ?? null, id)
}

export function getActionLogsByAccountId(accountId: string, limit = 50): ActionLog[] {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT * FROM action_logs WHERE account_id = ? ORDER BY created_at DESC LIMIT ?
  `).all(accountId, limit) as ActionLogRow[]
  return rows.map(rowToActionLog)
}

export function getRecentActionLogs(limit = 100): ActionLog[] {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT * FROM action_logs ORDER BY created_at DESC LIMIT ?
  `).all(limit) as ActionLogRow[]
  return rows.map(rowToActionLog)
}

export function deleteOldActionLogs(daysOld = 30): number {
  const db = getDatabase()
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000
  const result = db.prepare('DELETE FROM action_logs WHERE created_at < ?').run(cutoff)
  return result.changes
}

// Analytics functions
export interface ActionStats {
  total: number
  success: number
  failed: number
  pending: number
}

export interface DailyStats {
  date: string
  posts: number
  likes: number
  reposts: number
  follows: number
}

export interface AccountActionStats {
  accountId: string
  username: string
  total: number
  success: number
  failed: number
}

export function getActionStats(): ActionStats {
  const db = getDatabase()
  const result = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM action_logs
  `).get() as { total: number; success: number; failed: number; pending: number }

  return {
    total: result.total || 0,
    success: result.success || 0,
    failed: result.failed || 0,
    pending: result.pending || 0
  }
}

export function getActionStatsByType(): Record<string, ActionStats> {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT
      action_type,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM action_logs
    GROUP BY action_type
  `).all() as { action_type: string; total: number; success: number; failed: number; pending: number }[]

  const result: Record<string, ActionStats> = {}
  for (const row of rows) {
    result[row.action_type] = {
      total: row.total || 0,
      success: row.success || 0,
      failed: row.failed || 0,
      pending: row.pending || 0
    }
  }
  return result
}

export function getDailyStats(days = 7): DailyStats[] {
  const db = getDatabase()
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000

  const rows = db.prepare(`
    SELECT
      date(created_at / 1000, 'unixepoch', 'localtime') as date,
      SUM(CASE WHEN action_type = 'post' THEN 1 ELSE 0 END) as posts,
      SUM(CASE WHEN action_type = 'like' THEN 1 ELSE 0 END) as likes,
      SUM(CASE WHEN action_type = 'repost' THEN 1 ELSE 0 END) as reposts,
      SUM(CASE WHEN action_type = 'follow' THEN 1 ELSE 0 END) as follows
    FROM action_logs
    WHERE created_at >= ?
    GROUP BY date(created_at / 1000, 'unixepoch', 'localtime')
    ORDER BY date ASC
  `).all(startTime) as { date: string; posts: number; likes: number; reposts: number; follows: number }[]

  return rows.map(row => ({
    date: row.date,
    posts: row.posts || 0,
    likes: row.likes || 0,
    reposts: row.reposts || 0,
    follows: row.follows || 0
  }))
}

export function getAccountActionStats(limit = 10): AccountActionStats[] {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT
      al.account_id as accountId,
      a.username,
      COUNT(*) as total,
      SUM(CASE WHEN al.status = 'success' THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN al.status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM action_logs al
    LEFT JOIN accounts a ON al.account_id = a.id
    WHERE al.account_id IS NOT NULL
    GROUP BY al.account_id
    ORDER BY total DESC
    LIMIT ?
  `).all(limit) as { accountId: string; username: string | null; total: number; success: number; failed: number }[]

  return rows.map(row => ({
    accountId: row.accountId,
    username: row.username || '削除済み',
    total: row.total || 0,
    success: row.success || 0,
    failed: row.failed || 0
  }))
}
