import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from './index'
import type { Proxy, ProxyProtocol, ProxyStatus } from '../../shared/types'

interface ProxyRow {
  id: string
  name: string
  host: string
  port: number
  username: string | null
  password: string | null
  protocol: string
  group_id: string | null
  status: string
  last_checked_at: number | null
  created_at: number
}

function rowToProxy(row: ProxyRow): Proxy {
  return {
    id: row.id,
    name: row.name,
    host: row.host,
    port: row.port,
    username: row.username,
    password: row.password,
    protocol: row.protocol as ProxyProtocol,
    groupId: row.group_id,
    status: (row.status as ProxyStatus) || 'unknown',
    lastCheckedAt: row.last_checked_at,
    createdAt: row.created_at
  }
}

export function getAllProxies(): Proxy[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM proxies ORDER BY created_at ASC').all() as ProxyRow[]
  return rows.map(rowToProxy)
}

export function getProxyById(id: string): Proxy | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM proxies WHERE id = ?').get(id) as ProxyRow | undefined
  return row ? rowToProxy(row) : null
}

export function getProxiesByGroupId(groupId: string): Proxy[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM proxies WHERE group_id = ? ORDER BY created_at ASC')
    .all(groupId) as ProxyRow[]
  return rows.map(rowToProxy)
}

interface CreateProxyInput {
  name: string
  host: string
  port: number
  username?: string | null
  password?: string | null
  protocol?: ProxyProtocol
  groupId?: string | null
}

export function createProxy(input: CreateProxyInput): Proxy {
  const db = getDatabase()
  const id = uuidv4()
  const now = Date.now()

  db.prepare(`
    INSERT INTO proxies (id, name, host, port, username, password, protocol, group_id, status, last_checked_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.name,
    input.host,
    input.port,
    input.username ?? null,
    input.password ?? null,
    input.protocol ?? 'http',
    input.groupId ?? null,
    'unknown',
    null,
    now
  )

  return getProxyById(id)!
}

interface UpdateProxyInput {
  name?: string
  host?: string
  port?: number
  username?: string | null
  password?: string | null
  protocol?: ProxyProtocol
  groupId?: string | null
}

export function updateProxy(id: string, updates: UpdateProxyInput): Proxy | null {
  const db = getDatabase()
  const existing = getProxyById(id)
  if (!existing) return null

  const name = updates.name ?? existing.name
  const host = updates.host ?? existing.host
  const port = updates.port ?? existing.port
  const username = updates.username !== undefined ? updates.username : existing.username
  const password = updates.password !== undefined ? updates.password : existing.password
  const protocol = updates.protocol ?? existing.protocol
  const groupId = updates.groupId !== undefined ? updates.groupId : existing.groupId

  db.prepare(`
    UPDATE proxies
    SET name = ?, host = ?, port = ?, username = ?, password = ?, protocol = ?, group_id = ?
    WHERE id = ?
  `).run(name, host, port, username, password, protocol, groupId, id)

  return getProxyById(id)
}

export function updateProxyStatus(id: string, status: ProxyStatus): Proxy | null {
  const db = getDatabase()
  const now = Date.now()

  db.prepare(`
    UPDATE proxies SET status = ?, last_checked_at = ? WHERE id = ?
  `).run(status, now, id)

  return getProxyById(id)
}

export function deleteProxy(id: string): boolean {
  const db = getDatabase()

  // Set proxy_id to null for accounts using this proxy
  db.prepare('UPDATE accounts SET proxy_id = NULL WHERE proxy_id = ?').run(id)

  const result = db.prepare('DELETE FROM proxies WHERE id = ?').run(id)
  return result.changes > 0
}

export function getProxyStats(): { proxyId: string; accountCount: number }[] {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT proxy_id, COUNT(*) as count
    FROM accounts
    WHERE proxy_id IS NOT NULL
    GROUP BY proxy_id
  `).all() as { proxy_id: string; count: number }[]

  return rows.map((row) => ({
    proxyId: row.proxy_id,
    accountCount: row.count
  }))
}
