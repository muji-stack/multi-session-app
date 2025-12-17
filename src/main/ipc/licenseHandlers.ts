// License IPC Handlers

import { ipcMain, BrowserWindow } from 'electron'
import {
  validateLicense,
  checkAccountLimit,
  getFeatureAccess,
  checkActionAllowed,
  clearLicenseCache,
} from '../services/licenseService'

// License check interval (1 hour)
const LICENSE_CHECK_INTERVAL = 60 * 60 * 1000
let licenseCheckTimer: NodeJS.Timeout | null = null

export function registerLicenseHandlers(): void {
  // Get license status
  ipcMain.handle('license:validate', async (_event, userId: string) => {
    return validateLicense(userId)
  })

  // Check account limit
  ipcMain.handle('license:checkAccountLimit', async (_event, userId: string) => {
    return checkAccountLimit(userId)
  })

  // Get feature access
  ipcMain.handle('license:getFeatureAccess', async (_event, userId: string) => {
    return getFeatureAccess(userId)
  })

  // Check if specific action is allowed
  ipcMain.handle(
    'license:checkAction',
    async (
      _event,
      userId: string,
      action: 'post' | 'schedule' | 'automation' | 'workflow' | 'monitoring' | 'addAccount'
    ) => {
      return checkActionAllowed(userId, action)
    }
  )

  // Clear license cache (called when subscription changes)
  ipcMain.handle('license:clearCache', async () => {
    clearLicenseCache()
    return { success: true }
  })
}

/**
 * Start periodic license validation
 */
export function startLicenseWatcher(mainWindow: BrowserWindow | null, userId: string): void {
  // Clear existing timer
  if (licenseCheckTimer) {
    clearInterval(licenseCheckTimer)
  }

  // Perform initial check
  performLicenseCheck(mainWindow, userId)

  // Set up periodic check
  licenseCheckTimer = setInterval(() => {
    performLicenseCheck(mainWindow, userId)
  }, LICENSE_CHECK_INTERVAL)

  console.log('[License] Watcher started')
}

/**
 * Stop license watcher
 */
export function stopLicenseWatcher(): void {
  if (licenseCheckTimer) {
    clearInterval(licenseCheckTimer)
    licenseCheckTimer = null
  }
  console.log('[License] Watcher stopped')
}

/**
 * Perform license check and notify renderer
 */
async function performLicenseCheck(
  mainWindow: BrowserWindow | null,
  userId: string
): Promise<void> {
  try {
    const license = await validateLicense(userId)

    // Send license status to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('license:statusChanged', license)
    }

    // Log status
    console.log(`[License] Check completed: ${license.status} - ${license.message}`)
  } catch (error) {
    console.error('[License] Check failed:', error)
  }
}
