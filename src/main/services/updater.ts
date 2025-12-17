// Auto Updater Service
// Handles checking, downloading, and installing updates

import { app, BrowserWindow } from 'electron'
import { autoUpdater, UpdateInfo as ElectronUpdateInfo } from 'electron-updater'
import type { UpdateInfo, UpdateProgress, UpdateStatus, UpdateConfig } from '../../shared/updaterTypes'
import { DEFAULT_UPDATE_CONFIG, UPDATE_CHECK_INTERVAL } from '../../shared/updaterTypes'

// State
let mainWindow: BrowserWindow | null = null
let updateCheckTimer: NodeJS.Timeout | null = null
let currentStatus: UpdateStatus = {
  checking: false,
  available: false,
  downloading: false,
  downloaded: false,
  error: null,
  updateInfo: null,
  progress: null,
}
let config: UpdateConfig = { ...DEFAULT_UPDATE_CONFIG }

/**
 * Initialize the updater service
 */
export function initializeUpdater(window: BrowserWindow | null): void {
  mainWindow = window

  // Configure auto-updater
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Disable auto-updater in development
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    console.log('[Updater] Disabled in development mode')
    return
  }

  // Setup event listeners
  setupEventListeners()

  // Start auto-check timer if enabled
  if (config.autoCheck) {
    startAutoCheckTimer()
  }

  console.log('[Updater] Initialized')
}

/**
 * Setup auto-updater event listeners
 */
function setupEventListeners(): void {
  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for updates...')
    updateStatus({
      checking: true,
      error: null,
    })
    notifyRenderer('updater:checking')
  })

  autoUpdater.on('update-available', (info: ElectronUpdateInfo) => {
    console.log('[Updater] Update available:', info.version)
    const updateInfo: UpdateInfo = {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null,
      releaseName: info.releaseName || null,
    }
    updateStatus({
      checking: false,
      available: true,
      updateInfo,
    })
    notifyRenderer('updater:available', updateInfo)

    // Auto-download if enabled
    if (config.autoDownload) {
      downloadUpdate()
    }
  })

  autoUpdater.on('update-not-available', (info: ElectronUpdateInfo) => {
    console.log('[Updater] No update available. Current version:', info.version)
    updateStatus({
      checking: false,
      available: false,
    })
    notifyRenderer('updater:not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    const updateProgress: UpdateProgress = {
      bytesPerSecond: progress.bytesPerSecond,
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    }
    updateStatus({
      progress: updateProgress,
    })
    notifyRenderer('updater:progress', updateProgress)
  })

  autoUpdater.on('update-downloaded', (info: ElectronUpdateInfo) => {
    console.log('[Updater] Update downloaded:', info.version)
    const updateInfo: UpdateInfo = {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null,
      releaseName: info.releaseName || null,
    }
    updateStatus({
      downloading: false,
      downloaded: true,
      updateInfo,
      progress: null,
    })
    notifyRenderer('updater:downloaded', updateInfo)
  })

  autoUpdater.on('error', (error) => {
    console.error('[Updater] Error:', error.message)
    updateStatus({
      checking: false,
      downloading: false,
      error: error.message,
    })
    notifyRenderer('updater:error', error.message)
  })
}

/**
 * Update status state
 */
function updateStatus(partial: Partial<UpdateStatus>): void {
  currentStatus = { ...currentStatus, ...partial }
}

/**
 * Send notification to renderer
 */
function notifyRenderer(channel: string, data?: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

/**
 * Check for updates
 */
export async function checkForUpdates(): Promise<UpdateInfo | null> {
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    console.log('[Updater] Skipping update check in development')
    return null
  }

  try {
    updateStatus({ checking: true, error: null })
    config.lastCheckedAt = Date.now()

    const result = await autoUpdater.checkForUpdates()
    if (result?.updateInfo) {
      return {
        version: result.updateInfo.version,
        releaseDate: result.updateInfo.releaseDate,
        releaseNotes: typeof result.updateInfo.releaseNotes === 'string'
          ? result.updateInfo.releaseNotes
          : null,
        releaseName: result.updateInfo.releaseName || null,
      }
    }
    return null
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Update check failed'
    updateStatus({ checking: false, error: errorMessage })
    throw error
  }
}

/**
 * Download the available update
 */
export async function downloadUpdate(): Promise<void> {
  if (!currentStatus.available) {
    throw new Error('No update available to download')
  }

  if (currentStatus.downloading) {
    console.log('[Updater] Download already in progress')
    return
  }

  console.log('[Updater] Starting download...')
  updateStatus({ downloading: true, error: null, progress: null })

  try {
    await autoUpdater.downloadUpdate()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Download failed'
    updateStatus({ downloading: false, error: errorMessage })
    throw error
  }
}

/**
 * Install the downloaded update (quits and restarts app)
 */
export function installUpdate(): void {
  if (!currentStatus.downloaded) {
    throw new Error('No update downloaded to install')
  }

  console.log('[Updater] Installing update...')
  autoUpdater.quitAndInstall(false, true)
}

/**
 * Get current update status
 */
export function getUpdateStatus(): UpdateStatus {
  return { ...currentStatus }
}

/**
 * Get current app version
 */
export function getCurrentVersion(): string {
  return app.getVersion()
}

/**
 * Get update config
 */
export function getUpdateConfig(): UpdateConfig {
  return { ...config }
}

/**
 * Update config
 */
export function setUpdateConfig(updates: Partial<UpdateConfig>): UpdateConfig {
  config = { ...config, ...updates }

  // Handle auto-check timer
  if (updates.autoCheck !== undefined) {
    if (updates.autoCheck) {
      startAutoCheckTimer()
    } else {
      stopAutoCheckTimer()
    }
  }

  return { ...config }
}

/**
 * Start auto-check timer
 */
function startAutoCheckTimer(): void {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer)
  }

  // Check immediately if it's been more than the interval since last check
  const timeSinceLastCheck = config.lastCheckedAt
    ? Date.now() - config.lastCheckedAt
    : Infinity

  if (timeSinceLastCheck >= UPDATE_CHECK_INTERVAL) {
    // Delay initial check to not block startup
    setTimeout(() => {
      checkForUpdates().catch((err) => {
        console.error('[Updater] Auto-check failed:', err)
      })
    }, 10000) // 10 seconds after startup
  }

  // Setup periodic check
  updateCheckTimer = setInterval(() => {
    checkForUpdates().catch((err) => {
      console.error('[Updater] Periodic check failed:', err)
    })
  }, UPDATE_CHECK_INTERVAL)

  console.log('[Updater] Auto-check timer started')
}

/**
 * Stop auto-check timer
 */
function stopAutoCheckTimer(): void {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer)
    updateCheckTimer = null
  }
  console.log('[Updater] Auto-check timer stopped')
}

/**
 * Cleanup updater
 */
export function cleanupUpdater(): void {
  stopAutoCheckTimer()
  console.log('[Updater] Cleaned up')
}

/**
 * Set feed URL (for testing or custom server)
 */
export function setFeedURL(url: string): void {
  autoUpdater.setFeedURL({
    provider: 'generic',
    url,
  })
  console.log('[Updater] Feed URL set to:', url)
}
