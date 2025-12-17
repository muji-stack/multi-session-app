import { createCipheriv, createDecipheriv, randomBytes, scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const SALT_LENGTH = 32
const AUTH_TAG_LENGTH = 16

// Derive key from password using scrypt
export async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
}

// Generate a random salt
export function generateSalt(): Buffer {
  return randomBytes(SALT_LENGTH)
}

// Generate a random IV
export function generateIV(): Buffer {
  return randomBytes(IV_LENGTH)
}

// Hash password for storage (returns hash and salt as hex strings)
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = generateSalt()
  const key = await deriveKey(password, salt)
  return {
    hash: key.toString('hex'),
    salt: salt.toString('hex')
  }
}

// Verify password against stored hash
export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  try {
    const salt = Buffer.from(storedSalt, 'hex')
    const key = await deriveKey(password, salt)
    const storedKeyBuffer = Buffer.from(storedHash, 'hex')

    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(key, storedKeyBuffer)
  } catch {
    return false
  }
}

// Encrypt data with a password-derived key
export async function encryptWithPassword(
  data: string,
  password: string,
  salt: Buffer
): Promise<{ encrypted: string; iv: string }> {
  const key = await deriveKey(password, salt)
  const iv = generateIV()

  const cipher = createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  // Append auth tag for GCM mode
  const authTag = cipher.getAuthTag()
  encrypted += authTag.toString('hex')

  return {
    encrypted,
    iv: iv.toString('hex')
  }
}

// Decrypt data with a password-derived key
export async function decryptWithPassword(
  encryptedData: string,
  iv: string,
  password: string,
  salt: Buffer
): Promise<string> {
  const key = await deriveKey(password, salt)
  const ivBuffer = Buffer.from(iv, 'hex')

  // Extract auth tag from encrypted data (last 32 hex chars = 16 bytes)
  const authTagHex = encryptedData.slice(-AUTH_TAG_LENGTH * 2)
  const encryptedHex = encryptedData.slice(0, -AUTH_TAG_LENGTH * 2)
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, ivBuffer)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

// Encrypt data with a raw key (for session encryption with derived key stored in memory)
export function encryptWithKey(data: string, key: Buffer): { encrypted: string; iv: string } {
  const iv = generateIV()

  const cipher = createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()
  encrypted += authTag.toString('hex')

  return {
    encrypted,
    iv: iv.toString('hex')
  }
}

// Decrypt data with a raw key
export function decryptWithKey(encryptedData: string, iv: string, key: Buffer): string {
  const ivBuffer = Buffer.from(iv, 'hex')

  const authTagHex = encryptedData.slice(-AUTH_TAG_LENGTH * 2)
  const encryptedHex = encryptedData.slice(0, -AUTH_TAG_LENGTH * 2)
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, ivBuffer)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

// Generate a secure random encryption key
export function generateEncryptionKey(): Buffer {
  return randomBytes(KEY_LENGTH)
}

// Session key management (stored in memory, never persisted)
let sessionKey: Buffer | null = null

export function setSessionKey(key: Buffer): void {
  sessionKey = key
}

export function getSessionKey(): Buffer | null {
  return sessionKey
}

export function clearSessionKey(): void {
  if (sessionKey) {
    // Overwrite the key buffer before clearing
    sessionKey.fill(0)
    sessionKey = null
  }
}

export function hasSessionKey(): boolean {
  return sessionKey !== null
}
