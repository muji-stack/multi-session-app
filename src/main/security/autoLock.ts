import { powerMonitor, BrowserWindow } from 'electron'
import { getOrCreateSecurityConfig } from '../database/securityRepository'
import { lockApp, isLocked } from '../ipc/securityHandlers'
import { hasSessionKey } from './crypto'

let autoLockTimer: ReturnType<typeof setTimeout> | null = null
let lastActivityTime: number = Date.now()

export function startAutoLockWatcher(): void {
  // Monitor system idle and power state
  setupPowerMonitor()

  // Start activity monitor
  startActivityMonitor()

  console.log('[AutoLock] Watcher started')
}

export function stopAutoLockWatcher(): void {
  if (autoLockTimer) {
    clearTimeout(autoLockTimer)
    autoLockTimer = null
  }
  console.log('[AutoLock] Watcher stopped')
}

function setupPowerMonitor(): void {
  // Lock on system sleep/suspend
  powerMonitor.on('suspend', () => {
    const config = getOrCreateSecurityConfig()
    if (config.isLockEnabled && config.lockOnSleep && hasSessionKey()) {
      console.log('[AutoLock] System suspended, locking app')
      lockApp()
    }
  })

  // Lock on screen lock (Windows/macOS)
  powerMonitor.on('lock-screen', () => {
    const config = getOrCreateSecurityConfig()
    if (config.isLockEnabled && config.lockOnSleep && hasSessionKey()) {
      console.log('[AutoLock] Screen locked, locking app')
      lockApp()
    }
  })
}

function startActivityMonitor(): void {
  // Check for inactivity every minute
  setInterval(() => {
    checkAutoLock()
  }, 60 * 1000)
}

function checkAutoLock(): void {
  if (isLocked()) {
    return
  }

  const config = getOrCreateSecurityConfig()
  if (!config.isLockEnabled || !hasSessionKey()) {
    return
  }

  const idleTime = Date.now() - lastActivityTime
  const autoLockMs = config.autoLockMinutes * 60 * 1000

  if (idleTime >= autoLockMs) {
    console.log(`[AutoLock] Idle for ${config.autoLockMinutes} minutes, locking app`)
    lockApp()
  }
}

// Call this function whenever user activity is detected
export function resetActivityTimer(): void {
  lastActivityTime = Date.now()

  // Clear any pending auto-lock
  if (autoLockTimer) {
    clearTimeout(autoLockTimer)
    autoLockTimer = null
  }
}

// Monitor window minimize
export function setupWindowMonitor(window: BrowserWindow): void {
  window.on('minimize', () => {
    const config = getOrCreateSecurityConfig()
    if (config.isLockEnabled && config.lockOnMinimize && hasSessionKey()) {
      console.log('[AutoLock] Window minimized, locking app')
      lockApp()
    }
  })

  // Track activity through window focus
  window.on('focus', () => {
    resetActivityTimer()
  })

  // Track mouse/keyboard activity
  window.webContents.on('before-input-event', () => {
    resetActivityTimer()
  })
}

export function getLastActivityTime(): number {
  return lastActivityTime
}
