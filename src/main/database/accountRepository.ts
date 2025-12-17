import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from './index'
import type { Account, AccountStatus, SearchBanStatus } from '../../shared/types'

interface AccountRow {
  id: string
  username: string
  display_name: string | null
  profile_image: string | null
  group_id: string | null
  proxy_id: string | null
  memo: string | null
  status: string
  search_ban_status: string
  last_checked_at: number | null
  sort_order: number
  created_at: number
  updated_at: number
}

function rowToAccount(row: AccountRow): Account {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    profileImage: row.profile_image,
    groupId: row.group_id,
    proxyId: row.proxy_id,
    memo: row.memo,
    status: row.status as AccountStatus,
    searchBanStatus: row.search_ban_status as SearchBanStatus,
    lastCheckedAt: row.last_checked_at,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export interface CreateAccountInput {
  username: string
  displayName?: string | null
  profileImage?: string | null
  groupId?: string | null
  proxyId?: string | null
  memo?: string | null
}

export interface UpdateAccountInput {
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

export function getAllAccounts(): Account[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM accounts ORDER BY sort_order ASC, created_at DESC').all() as AccountRow[]
  return rows.map(rowToAccount)
}

export function getAccountById(id: string): Account | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as AccountRow | undefined
  return row ? rowToAccount(row) : null
}

export function getAccountByUsername(username: string): Account | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(username) as AccountRow | undefined
  return row ? rowToAccount(row) : null
}

export function getAccountsByGroupId(groupId: string): Account[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM accounts WHERE group_id = ? ORDER BY sort_order ASC').all(groupId) as AccountRow[]
  return rows.map(rowToAccount)
}

export function getAccountsByStatus(status: AccountStatus): Account[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM accounts WHERE status = ? ORDER BY sort_order ASC').all(status) as AccountRow[]
  return rows.map(rowToAccount)
}

export function createAccount(input: CreateAccountInput): Account {
  const db = getDatabase()
  const now = Date.now()
  const id = uuidv4()

  const maxSortOrder = db.prepare('SELECT MAX(sort_order) as max FROM accounts').get() as { max: number | null }
  const sortOrder = (maxSortOrder.max ?? -1) + 1

  const stmt = db.prepare(`
    INSERT INTO accounts (id, username, display_name, profile_image, group_id, proxy_id, memo, status, search_ban_status, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'unknown', 'unknown', ?, ?, ?)
  `)

  stmt.run(
    id,
    input.username,
    input.displayName ?? null,
    input.profileImage ?? null,
    input.groupId ?? null,
    input.proxyId ?? null,
    input.memo ?? null,
    sortOrder,
    now,
    now
  )

  return getAccountById(id)!
}

export function updateAccount(id: string, input: UpdateAccountInput): Account | null {
  const db = getDatabase()
  const existing = getAccountById(id)
  if (!existing) return null

  const updates: string[] = []
  const values: (string | number | null)[] = []

  if (input.username !== undefined) {
    updates.push('username = ?')
    values.push(input.username)
  }
  if (input.displayName !== undefined) {
    updates.push('display_name = ?')
    values.push(input.displayName)
  }
  if (input.profileImage !== undefined) {
    updates.push('profile_image = ?')
    values.push(input.profileImage)
  }
  if (input.groupId !== undefined) {
    updates.push('group_id = ?')
    values.push(input.groupId)
  }
  if (input.proxyId !== undefined) {
    updates.push('proxy_id = ?')
    values.push(input.proxyId)
  }
  if (input.memo !== undefined) {
    updates.push('memo = ?')
    values.push(input.memo)
  }
  if (input.status !== undefined) {
    updates.push('status = ?')
    values.push(input.status)
  }
  if (input.searchBanStatus !== undefined) {
    updates.push('search_ban_status = ?')
    values.push(input.searchBanStatus)
  }
  if (input.lastCheckedAt !== undefined) {
    updates.push('last_checked_at = ?')
    values.push(input.lastCheckedAt)
  }
  if (input.sortOrder !== undefined) {
    updates.push('sort_order = ?')
    values.push(input.sortOrder)
  }

  if (updates.length === 0) return existing

  updates.push('updated_at = ?')
  values.push(Date.now())
  values.push(id)

  const stmt = db.prepare(`UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`)
  stmt.run(...values)

  return getAccountById(id)
}

export function deleteAccount(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM accounts WHERE id = ?').run(id)
  return result.changes > 0
}

export function getAccountStats(): { total: number; normal: number; locked: number; suspended: number } {
  const db = getDatabase()
  const total = (db.prepare('SELECT COUNT(*) as count FROM accounts').get() as { count: number }).count
  const normal = (db.prepare("SELECT COUNT(*) as count FROM accounts WHERE status = 'normal'").get() as { count: number }).count
  const locked = (db.prepare("SELECT COUNT(*) as count FROM accounts WHERE status = 'locked'").get() as { count: number }).count
  const suspended = (db.prepare("SELECT COUNT(*) as count FROM accounts WHERE status = 'suspended'").get() as { count: number }).count

  return { total, normal, locked, suspended }
}

export function updateAccountSortOrders(orders: { id: string; sortOrder: number }[]): void {
  const db = getDatabase()
  const stmt = db.prepare('UPDATE accounts SET sort_order = ?, updated_at = ? WHERE id = ?')
  const now = Date.now()

  const transaction = db.transaction(() => {
    for (const order of orders) {
      stmt.run(order.sortOrder, now, order.id)
    }
  })

  transaction()
}
