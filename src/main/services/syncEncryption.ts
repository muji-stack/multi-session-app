// Sync Encryption Service
// Handles encryption/decryption of sync data using AES-256-GCM

import crypto from 'crypto'
import type { SyncData, EncryptedSyncData } from '../../shared/syncTypes'
import { SYNC_DATA_VERSION } from '../../shared/syncTypes'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits
const SALT_LENGTH = 32
const ITERATIONS = 100000

// Store salt per user (in production, this would be stored securely)
const userSalts = new Map<string, Buffer>()

/**
 * Derive encryption key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256')
}

/**
 * Get or create salt for a user
 */
function getOrCreateSalt(userId: string): Buffer {
  let salt = userSalts.get(userId)
  if (!salt) {
    salt = crypto.randomBytes(SALT_LENGTH)
    userSalts.set(userId, salt)
  }
  return salt
}

/**
 * Set salt for a user (when loading from cloud)
 */
export function setSaltForUser(userId: string, saltHex: string): void {
  userSalts.set(userId, Buffer.from(saltHex, 'hex'))
}

/**
 * Get salt hex for a user
 */
export function getSaltHex(userId: string): string {
  const salt = getOrCreateSalt(userId)
  return salt.toString('hex')
}

/**
 * Encrypt sync data
 */
export function encryptSyncData(
  data: SyncData,
  password: string,
  userId: string
): EncryptedSyncData {
  const salt = getOrCreateSalt(userId)
  const key = deriveKey(password, salt)
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const jsonData = JSON.stringify(data)

  let encrypted = cipher.update(jsonData, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return {
    iv: iv.toString('hex'),
    data: encrypted,
    authTag: authTag.toString('hex'),
    version: SYNC_DATA_VERSION,
  }
}

/**
 * Decrypt sync data
 */
export function decryptSyncData(
  encryptedData: EncryptedSyncData,
  password: string,
  userId: string
): SyncData | null {
  try {
    const salt = getOrCreateSalt(userId)
    const key = deriveKey(password, salt)
    const iv = Buffer.from(encryptedData.iv, 'hex')
    const authTag = Buffer.from(encryptedData.authTag, 'hex')

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return JSON.parse(decrypted) as SyncData
  } catch (error) {
    console.error('[SyncEncryption] Decryption failed:', error)
    return null
  }
}

/**
 * Encrypt a single sensitive value (e.g., proxy password)
 */
export function encryptValue(value: string, password: string, userId: string): string {
  if (!value) return ''

  const salt = getOrCreateSalt(userId)
  const key = deriveKey(password, salt)
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(value, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Combine iv:authTag:data
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypt a single sensitive value
 */
export function decryptValue(
  encryptedValue: string,
  password: string,
  userId: string
): string | null {
  if (!encryptedValue) return null

  try {
    const [ivHex, authTagHex, data] = encryptedValue.split(':')
    if (!ivHex || !authTagHex || !data) return null

    const salt = getOrCreateSalt(userId)
    const key = deriveKey(password, salt)
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(data, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('[SyncEncryption] Value decryption failed:', error)
    return null
  }
}

/**
 * Hash a password for verification (not encryption)
 */
export function hashPassword(password: string, userId: string): string {
  const salt = getOrCreateSalt(userId)
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256').toString('hex')
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, hash: string, userId: string): boolean {
  const computedHash = hashPassword(password, userId)
  return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(hash, 'hex'))
}
