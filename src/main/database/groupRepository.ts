import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from './index'
import type { Group } from '../../shared/types'

interface GroupRow {
  id: string
  name: string
  color: string
  sort_order: number
  created_at: number
}

function rowToGroup(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    createdAt: row.created_at
  }
}

export function getAllGroups(): Group[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM groups ORDER BY sort_order ASC, created_at ASC').all() as GroupRow[]
  return rows.map(rowToGroup)
}

export function getGroupById(id: string): Group | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM groups WHERE id = ?').get(id) as GroupRow | undefined
  return row ? rowToGroup(row) : null
}

export function createGroup(name: string, color: string = '#6366f1'): Group {
  const db = getDatabase()
  const id = uuidv4()
  const now = Date.now()

  // Get max sort_order
  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM groups').get() as { max: number | null }
  const sortOrder = (maxOrder?.max ?? -1) + 1

  db.prepare(`
    INSERT INTO groups (id, name, color, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, color, sortOrder, now)

  return getGroupById(id)!
}

export function updateGroup(id: string, updates: { name?: string; color?: string }): Group | null {
  const db = getDatabase()
  const existing = getGroupById(id)
  if (!existing) return null

  const name = updates.name ?? existing.name
  const color = updates.color ?? existing.color

  db.prepare(`
    UPDATE groups SET name = ?, color = ? WHERE id = ?
  `).run(name, color, id)

  return getGroupById(id)
}

export function deleteGroup(id: string): boolean {
  const db = getDatabase()

  // Set group_id to null for accounts in this group
  db.prepare('UPDATE accounts SET group_id = NULL WHERE group_id = ?').run(id)

  const result = db.prepare('DELETE FROM groups WHERE id = ?').run(id)
  return result.changes > 0
}

export function updateGroupSortOrders(orders: { id: string; sortOrder: number }[]): boolean {
  const db = getDatabase()
  const stmt = db.prepare('UPDATE groups SET sort_order = ? WHERE id = ?')

  const transaction = db.transaction(() => {
    for (const order of orders) {
      stmt.run(order.sortOrder, order.id)
    }
  })

  try {
    transaction()
    return true
  } catch (error) {
    console.error('Failed to update group sort orders:', error)
    return false
  }
}

export function getGroupStats(): { groupId: string; count: number }[] {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT group_id, COUNT(*) as count
    FROM accounts
    WHERE group_id IS NOT NULL
    GROUP BY group_id
  `).all() as { group_id: string; count: number }[]

  return rows.map(row => ({
    groupId: row.group_id,
    count: row.count
  }))
}
