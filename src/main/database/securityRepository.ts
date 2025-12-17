import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from './index'
import type { SecurityConfig, SecureCredential, CredentialType } from '../../shared/types'

interface ConfigRow {
  id: string
  master_password_hash: string | null
  master_password_salt: string | null
  is_lock_enabled: number
  auto_lock_minutes: number
  lock_on_minimize: number
  lock_on_sleep: number
  encrypt_session_data: number
  last_unlocked_at: number | null
  created_at: number
  updated_at: number
}

interface CredentialRow {
  id: string
  account_id: string
  credential_type: string
  encrypted_data: string
  iv: string
  created_at: number
  updated_at: number
}

function rowToConfig(row: ConfigRow): SecurityConfig {
  return {
    id: row.id,
    masterPasswordHash: row.master_password_hash,
    masterPasswordSalt: row.master_password_salt,
    isLockEnabled: row.is_lock_enabled === 1,
    autoLockMinutes: row.auto_lock_minutes,
    lockOnMinimize: row.lock_on_minimize === 1,
    lockOnSleep: row.lock_on_sleep === 1,
    encryptSessionData: row.encrypt_session_data === 1,
    lastUnlockedAt: row.last_unlocked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function rowToCredential(row: CredentialRow): SecureCredential {
  return {
    id: row.id,
    accountId: row.account_id,
    credentialType: row.credential_type as CredentialType,
    encryptedData: row.encrypted_data,
    iv: row.iv,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Security Config functions
export function getSecurityConfig(): SecurityConfig | null {
  const db = getDatabase()
  const row = db.prepare(`SELECT * FROM security_config LIMIT 1`).get() as ConfigRow | undefined
  return row ? rowToConfig(row) : null
}

export function getOrCreateSecurityConfig(): SecurityConfig {
  let config = getSecurityConfig()
  if (!config) {
    config = createDefaultSecurityConfig()
  }
  return config
}

export function createDefaultSecurityConfig(): SecurityConfig {
  const db = getDatabase()
  const now = Date.now()
  const id = uuidv4()

  db.prepare(
    `INSERT INTO security_config
     (id, master_password_hash, master_password_salt, is_lock_enabled, auto_lock_minutes,
      lock_on_minimize, lock_on_sleep, encrypt_session_data, last_unlocked_at, created_at, updated_at)
     VALUES (?, NULL, NULL, 0, 5, 0, 1, 0, NULL, ?, ?)`
  ).run(id, now, now)

  return {
    id,
    masterPasswordHash: null,
    masterPasswordSalt: null,
    isLockEnabled: false,
    autoLockMinutes: 5,
    lockOnMinimize: false,
    lockOnSleep: true,
    encryptSessionData: false,
    lastUnlockedAt: null,
    createdAt: now,
    updatedAt: now
  }
}

export function updateSecurityConfig(
  updates: Partial<Omit<SecurityConfig, 'id' | 'createdAt' | 'updatedAt'>>
): SecurityConfig | null {
  const db = getDatabase()
  const config = getOrCreateSecurityConfig()
  const now = Date.now()

  const fields: string[] = []
  const values: (string | number | null)[] = []

  if (updates.masterPasswordHash !== undefined) {
    fields.push('master_password_hash = ?')
    values.push(updates.masterPasswordHash)
  }
  if (updates.masterPasswordSalt !== undefined) {
    fields.push('master_password_salt = ?')
    values.push(updates.masterPasswordSalt)
  }
  if (updates.isLockEnabled !== undefined) {
    fields.push('is_lock_enabled = ?')
    values.push(updates.isLockEnabled ? 1 : 0)
  }
  if (updates.autoLockMinutes !== undefined) {
    fields.push('auto_lock_minutes = ?')
    values.push(updates.autoLockMinutes)
  }
  if (updates.lockOnMinimize !== undefined) {
    fields.push('lock_on_minimize = ?')
    values.push(updates.lockOnMinimize ? 1 : 0)
  }
  if (updates.lockOnSleep !== undefined) {
    fields.push('lock_on_sleep = ?')
    values.push(updates.lockOnSleep ? 1 : 0)
  }
  if (updates.encryptSessionData !== undefined) {
    fields.push('encrypt_session_data = ?')
    values.push(updates.encryptSessionData ? 1 : 0)
  }
  if (updates.lastUnlockedAt !== undefined) {
    fields.push('last_unlocked_at = ?')
    values.push(updates.lastUnlockedAt)
  }

  if (fields.length === 0) {
    return config
  }

  fields.push('updated_at = ?')
  values.push(now)
  values.push(config.id)

  db.prepare(`UPDATE security_config SET ${fields.join(', ')} WHERE id = ?`).run(...values)

  return getSecurityConfig()
}

export function setMasterPassword(hash: string, salt: string): boolean {
  const config = getOrCreateSecurityConfig()
  const db = getDatabase()
  const now = Date.now()

  db.prepare(
    `UPDATE security_config
     SET master_password_hash = ?, master_password_salt = ?, is_lock_enabled = 1, updated_at = ?
     WHERE id = ?`
  ).run(hash, salt, now, config.id)

  return true
}

export function removeMasterPassword(): boolean {
  const config = getOrCreateSecurityConfig()
  const db = getDatabase()
  const now = Date.now()

  db.prepare(
    `UPDATE security_config
     SET master_password_hash = NULL, master_password_salt = NULL, is_lock_enabled = 0, updated_at = ?
     WHERE id = ?`
  ).run(now, config.id)

  return true
}

export function hasMasterPassword(): boolean {
  const config = getSecurityConfig()
  return !!(config?.masterPasswordHash && config?.masterPasswordSalt)
}

export function updateLastUnlockedAt(): void {
  const config = getOrCreateSecurityConfig()
  const db = getDatabase()
  const now = Date.now()

  db.prepare(`UPDATE security_config SET last_unlocked_at = ?, updated_at = ? WHERE id = ?`).run(
    now,
    now,
    config.id
  )
}

// Secure Credentials functions
export function getAllCredentials(): SecureCredential[] {
  const db = getDatabase()
  const rows = db.prepare(`SELECT * FROM secure_credentials ORDER BY created_at DESC`).all() as CredentialRow[]
  return rows.map(rowToCredential)
}

export function getCredentialsByAccount(accountId: string): SecureCredential[] {
  const db = getDatabase()
  const rows = db
    .prepare(`SELECT * FROM secure_credentials WHERE account_id = ? ORDER BY credential_type`)
    .all(accountId) as CredentialRow[]
  return rows.map(rowToCredential)
}

export function getCredentialByType(accountId: string, credentialType: CredentialType): SecureCredential | null {
  const db = getDatabase()
  const row = db
    .prepare(`SELECT * FROM secure_credentials WHERE account_id = ? AND credential_type = ?`)
    .get(accountId, credentialType) as CredentialRow | undefined
  return row ? rowToCredential(row) : null
}

export function createCredential(input: {
  accountId: string
  credentialType: CredentialType
  encryptedData: string
  iv: string
}): SecureCredential {
  const db = getDatabase()
  const now = Date.now()
  const id = uuidv4()

  // Remove existing credential of same type for this account
  db.prepare(
    `DELETE FROM secure_credentials WHERE account_id = ? AND credential_type = ?`
  ).run(input.accountId, input.credentialType)

  db.prepare(
    `INSERT INTO secure_credentials
     (id, account_id, credential_type, encrypted_data, iv, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, input.accountId, input.credentialType, input.encryptedData, input.iv, now, now)

  return {
    id,
    accountId: input.accountId,
    credentialType: input.credentialType,
    encryptedData: input.encryptedData,
    iv: input.iv,
    createdAt: now,
    updatedAt: now
  }
}

export function updateCredential(
  id: string,
  updates: { encryptedData: string; iv: string }
): SecureCredential | null {
  const db = getDatabase()
  const now = Date.now()

  db.prepare(
    `UPDATE secure_credentials SET encrypted_data = ?, iv = ?, updated_at = ? WHERE id = ?`
  ).run(updates.encryptedData, updates.iv, now, id)

  const row = db.prepare(`SELECT * FROM secure_credentials WHERE id = ?`).get(id) as
    | CredentialRow
    | undefined
  return row ? rowToCredential(row) : null
}

export function deleteCredential(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare(`DELETE FROM secure_credentials WHERE id = ?`).run(id)
  return result.changes > 0
}

export function deleteCredentialsByAccount(accountId: string): number {
  const db = getDatabase()
  const result = db.prepare(`DELETE FROM secure_credentials WHERE account_id = ?`).run(accountId)
  return result.changes
}

export function deleteAllCredentials(): number {
  const db = getDatabase()
  const result = db.prepare(`DELETE FROM secure_credentials`).run()
  return result.changes
}
