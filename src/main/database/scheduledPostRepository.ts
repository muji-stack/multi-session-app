import { getDatabase } from './index'
import { v4 as uuidv4 } from 'uuid'
import type { ScheduledPost, ScheduledPostStatus } from '../../shared/types'

interface ScheduledPostRow {
  id: string
  account_id: string
  content: string
  media_ids: string | null
  scheduled_at: number
  status: string
  error_message: string | null
  executed_at: number | null
  created_at: number
  updated_at: number
}

function rowToScheduledPost(row: ScheduledPostRow): ScheduledPost {
  return {
    id: row.id,
    accountId: row.account_id,
    content: row.content,
    mediaIds: row.media_ids ? JSON.parse(row.media_ids) : null,
    scheduledAt: row.scheduled_at,
    status: row.status as ScheduledPostStatus,
    errorMessage: row.error_message,
    executedAt: row.executed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function getAllScheduledPosts(): ScheduledPost[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT * FROM scheduled_posts
       ORDER BY scheduled_at ASC`
    )
    .all() as ScheduledPostRow[]
  return rows.map(rowToScheduledPost)
}

export function getScheduledPostById(id: string): ScheduledPost | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM scheduled_posts WHERE id = ?').get(id) as
    | ScheduledPostRow
    | undefined
  return row ? rowToScheduledPost(row) : null
}

export function getScheduledPostsByAccount(accountId: string): ScheduledPost[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT * FROM scheduled_posts
       WHERE account_id = ?
       ORDER BY scheduled_at ASC`
    )
    .all(accountId) as ScheduledPostRow[]
  return rows.map(rowToScheduledPost)
}

export function getScheduledPostsByStatus(status: ScheduledPostStatus): ScheduledPost[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT * FROM scheduled_posts
       WHERE status = ?
       ORDER BY scheduled_at ASC`
    )
    .all(status) as ScheduledPostRow[]
  return rows.map(rowToScheduledPost)
}

export function getPendingScheduledPosts(): ScheduledPost[] {
  const db = getDatabase()
  const now = Date.now()
  const rows = db
    .prepare(
      `SELECT * FROM scheduled_posts
       WHERE status = 'pending' AND scheduled_at <= ?
       ORDER BY scheduled_at ASC`
    )
    .all(now) as ScheduledPostRow[]
  return rows.map(rowToScheduledPost)
}

export function getUpcomingScheduledPosts(limit = 50): ScheduledPost[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT * FROM scheduled_posts
       WHERE status = 'pending'
       ORDER BY scheduled_at ASC
       LIMIT ?`
    )
    .all(limit) as ScheduledPostRow[]
  return rows.map(rowToScheduledPost)
}

interface CreateScheduledPostInput {
  accountId: string
  content: string
  mediaIds?: string[]
  scheduledAt: number
}

export function createScheduledPost(input: CreateScheduledPostInput): ScheduledPost {
  const db = getDatabase()
  const now = Date.now()
  const id = uuidv4()

  db.prepare(
    `INSERT INTO scheduled_posts (id, account_id, content, media_ids, scheduled_at, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).run(
    id,
    input.accountId,
    input.content,
    input.mediaIds ? JSON.stringify(input.mediaIds) : null,
    input.scheduledAt,
    now,
    now
  )

  return getScheduledPostById(id)!
}

interface UpdateScheduledPostInput {
  content?: string
  mediaIds?: string[] | null
  scheduledAt?: number
  status?: ScheduledPostStatus
  errorMessage?: string | null
  executedAt?: number | null
}

export function updateScheduledPost(
  id: string,
  updates: UpdateScheduledPostInput
): ScheduledPost | null {
  const db = getDatabase()
  const existing = getScheduledPostById(id)

  if (!existing) return null

  const now = Date.now()
  const newContent = updates.content ?? existing.content
  const newMediaIds =
    updates.mediaIds !== undefined ? updates.mediaIds : existing.mediaIds
  const newScheduledAt = updates.scheduledAt ?? existing.scheduledAt
  const newStatus = updates.status ?? existing.status
  const newErrorMessage =
    updates.errorMessage !== undefined ? updates.errorMessage : existing.errorMessage
  const newExecutedAt =
    updates.executedAt !== undefined ? updates.executedAt : existing.executedAt

  db.prepare(
    `UPDATE scheduled_posts
     SET content = ?, media_ids = ?, scheduled_at = ?, status = ?, error_message = ?, executed_at = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    newContent,
    newMediaIds ? JSON.stringify(newMediaIds) : null,
    newScheduledAt,
    newStatus,
    newErrorMessage,
    newExecutedAt,
    now,
    id
  )

  return getScheduledPostById(id)
}

export function deleteScheduledPost(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM scheduled_posts WHERE id = ?').run(id)
  return result.changes > 0
}

export function cancelScheduledPost(id: string): ScheduledPost | null {
  return updateScheduledPost(id, { status: 'cancelled' })
}

export function markAsProcessing(id: string): ScheduledPost | null {
  return updateScheduledPost(id, { status: 'processing' })
}

export function markAsCompleted(id: string): ScheduledPost | null {
  return updateScheduledPost(id, {
    status: 'completed',
    executedAt: Date.now()
  })
}

export function markAsFailed(id: string, errorMessage: string): ScheduledPost | null {
  return updateScheduledPost(id, {
    status: 'failed',
    errorMessage,
    executedAt: Date.now()
  })
}

export function getScheduledPostsInRange(startTime: number, endTime: number): ScheduledPost[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT * FROM scheduled_posts
       WHERE scheduled_at >= ? AND scheduled_at <= ?
       ORDER BY scheduled_at ASC`
    )
    .all(startTime, endTime) as ScheduledPostRow[]
  return rows.map(rowToScheduledPost)
}

export function getScheduledPostStats(): {
  pending: number
  completed: number
  failed: number
  cancelled: number
} {
  const db = getDatabase()
  const result = db
    .prepare(
      `SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
       FROM scheduled_posts`
    )
    .get() as { pending: number; completed: number; failed: number; cancelled: number }

  return {
    pending: result.pending || 0,
    completed: result.completed || 0,
    failed: result.failed || 0,
    cancelled: result.cancelled || 0
  }
}
