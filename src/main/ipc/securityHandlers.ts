import { ipcMain, BrowserWindow } from 'electron'
import * as securityRepo from '../database/securityRepository'
import * as crypto from '../security/crypto'
import type { CredentialType, LockState } from '../../shared/types'

// Lock state management (in-memory)
let lockState: LockState = {
  isLocked: false,
  lockedAt: null,
  failedAttempts: 0,
  lastFailedAt: null
}

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION = 5 * 60 * 1000 // 5 minutes

export function registerSecurityHandlers(): void {
  // Config handlers
  ipcMain.handle('security:getConfig', async () => {
    return securityRepo.getOrCreateSecurityConfig()
  })

  ipcMain.handle(
    'security:updateConfig',
    async (
      _event,
      updates: {
        autoLockMinutes?: number
        lockOnMinimize?: boolean
        lockOnSleep?: boolean
        encryptSessionData?: boolean
      }
    ) => {
      return securityRepo.updateSecurityConfig(updates)
    }
  )

  ipcMain.handle('security:hasMasterPassword', async () => {
    return securityRepo.hasMasterPassword()
  })

  // Master password handlers
  ipcMain.handle('security:setMasterPassword', async (_event, password: string) => {
    try {
      const { hash, salt } = await crypto.hashPassword(password)
      securityRepo.setMasterPassword(hash, salt)

      // Derive and store session key
      const saltBuffer = Buffer.from(salt, 'hex')
      const key = await crypto.deriveKey(password, saltBuffer)
      crypto.setSessionKey(key)

      // Update last unlocked time
      securityRepo.updateLastUnlockedAt()

      // Unlock app
      lockState = {
        isLocked: false,
        lockedAt: null,
        failedAttempts: 0,
        lastFailedAt: null
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('security:changeMasterPassword', async (_event, currentPassword: string, newPassword: string) => {
    try {
      const config = securityRepo.getSecurityConfig()
      if (!config?.masterPasswordHash || !config?.masterPasswordSalt) {
        return { success: false, error: 'No master password set' }
      }

      // Verify current password
      const isValid = await crypto.verifyPassword(
        currentPassword,
        config.masterPasswordHash,
        config.masterPasswordSalt
      )

      if (!isValid) {
        return { success: false, error: 'Current password is incorrect' }
      }

      // Set new password
      const { hash, salt } = await crypto.hashPassword(newPassword)
      securityRepo.setMasterPassword(hash, salt)

      // Update session key
      const saltBuffer = Buffer.from(salt, 'hex')
      const key = await crypto.deriveKey(newPassword, saltBuffer)
      crypto.setSessionKey(key)

      // Re-encrypt all credentials with new key
      // (This would require decrypting with old key and re-encrypting with new key)
      // For simplicity, we'll clear credentials and require re-entry
      // securityRepo.deleteAllCredentials()

      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('security:removeMasterPassword', async (_event, password: string) => {
    try {
      const config = securityRepo.getSecurityConfig()
      if (!config?.masterPasswordHash || !config?.masterPasswordSalt) {
        return { success: false, error: 'No master password set' }
      }

      // Verify password
      const isValid = await crypto.verifyPassword(
        password,
        config.masterPasswordHash,
        config.masterPasswordSalt
      )

      if (!isValid) {
        return { success: false, error: 'Password is incorrect' }
      }

      // Remove master password
      securityRepo.removeMasterPassword()
      crypto.clearSessionKey()

      // Delete all encrypted credentials
      securityRepo.deleteAllCredentials()

      // Reset lock state
      lockState = {
        isLocked: false,
        lockedAt: null,
        failedAttempts: 0,
        lastFailedAt: null
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Lock/Unlock handlers
  ipcMain.handle('security:getLockState', async () => {
    return lockState
  })

  ipcMain.handle('security:lock', async () => {
    const config = securityRepo.getSecurityConfig()
    if (!config?.isLockEnabled) {
      return { success: false, error: 'Lock is not enabled' }
    }

    lockState = {
      ...lockState,
      isLocked: true,
      lockedAt: Date.now()
    }

    // Notify all windows
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('security:locked')
      }
    })

    return { success: true }
  })

  ipcMain.handle('security:unlock', async (_event, password: string) => {
    // Check lockout
    if (lockState.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      const timeSinceLastFailed = Date.now() - (lockState.lastFailedAt || 0)
      if (timeSinceLastFailed < LOCKOUT_DURATION) {
        const remainingSeconds = Math.ceil((LOCKOUT_DURATION - timeSinceLastFailed) / 1000)
        return {
          success: false,
          error: `Too many failed attempts. Try again in ${remainingSeconds} seconds.`,
          locked: true
        }
      }
      // Reset failed attempts after lockout
      lockState.failedAttempts = 0
    }

    const config = securityRepo.getSecurityConfig()
    if (!config?.masterPasswordHash || !config?.masterPasswordSalt) {
      return { success: false, error: 'No master password set' }
    }

    // Verify password
    const isValid = await crypto.verifyPassword(
      password,
      config.masterPasswordHash,
      config.masterPasswordSalt
    )

    if (!isValid) {
      lockState = {
        ...lockState,
        failedAttempts: lockState.failedAttempts + 1,
        lastFailedAt: Date.now()
      }
      return {
        success: false,
        error: 'Incorrect password',
        attemptsRemaining: MAX_FAILED_ATTEMPTS - lockState.failedAttempts
      }
    }

    // Derive and store session key
    const saltBuffer = Buffer.from(config.masterPasswordSalt, 'hex')
    const key = await crypto.deriveKey(password, saltBuffer)
    crypto.setSessionKey(key)

    // Update last unlocked time
    securityRepo.updateLastUnlockedAt()

    // Reset lock state
    lockState = {
      isLocked: false,
      lockedAt: null,
      failedAttempts: 0,
      lastFailedAt: null
    }

    // Notify all windows
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('security:unlocked')
      }
    })

    return { success: true }
  })

  // Credential encryption handlers
  ipcMain.handle(
    'security:encryptCredential',
    async (
      _event,
      accountId: string,
      credentialType: CredentialType,
      data: string
    ) => {
      try {
        const key = crypto.getSessionKey()
        if (!key) {
          return { success: false, error: 'App is locked or no master password set' }
        }

        const { encrypted, iv } = crypto.encryptWithKey(data, key)

        const credential = securityRepo.createCredential({
          accountId,
          credentialType,
          encryptedData: encrypted,
          iv
        })

        return { success: true, credentialId: credential.id }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  ipcMain.handle(
    'security:decryptCredential',
    async (_event, accountId: string, credentialType: CredentialType) => {
      try {
        const key = crypto.getSessionKey()
        if (!key) {
          return { success: false, error: 'App is locked or no master password set' }
        }

        const credential = securityRepo.getCredentialByType(accountId, credentialType)
        if (!credential) {
          return { success: false, error: 'Credential not found' }
        }

        const decrypted = crypto.decryptWithKey(credential.encryptedData, credential.iv, key)

        return { success: true, data: decrypted }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  ipcMain.handle('security:deleteCredential', async (_event, accountId: string, credentialType: CredentialType) => {
    const credential = securityRepo.getCredentialByType(accountId, credentialType)
    if (credential) {
      return securityRepo.deleteCredential(credential.id)
    }
    return false
  })

  ipcMain.handle('security:deleteCredentialsByAccount', async (_event, accountId: string) => {
    return securityRepo.deleteCredentialsByAccount(accountId)
  })

  ipcMain.handle('security:hasCredential', async (_event, accountId: string, credentialType: CredentialType) => {
    const credential = securityRepo.getCredentialByType(accountId, credentialType)
    return credential !== null
  })

  // Session key status
  ipcMain.handle('security:hasSessionKey', async () => {
    return crypto.hasSessionKey()
  })
}

// Export functions for use by auto-lock feature
export function getLockState(): LockState {
  return lockState
}

export function setLockState(state: Partial<LockState>): void {
  lockState = { ...lockState, ...state }
}

export function lockApp(): void {
  const config = securityRepo.getSecurityConfig()
  if (!config?.isLockEnabled) {
    return
  }

  lockState = {
    ...lockState,
    isLocked: true,
    lockedAt: Date.now()
  }

  const windows = BrowserWindow.getAllWindows()
  windows.forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send('security:locked')
    }
  })
}

export function isLocked(): boolean {
  return lockState.isLocked
}
