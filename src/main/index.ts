import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { initializeDatabase, closeDatabase } from './database'
import { registerAccountHandlers } from './ipc/accountHandlers'
import { registerBrowserHandlers } from './ipc/browserHandlers'
import { registerPostHandlers } from './ipc/postHandlers'
import { registerEngagementHandlers } from './ipc/engagementHandlers'
import { registerCheckHandlers } from './ipc/checkHandlers'
import { registerGroupHandlers } from './ipc/groupHandlers'
import { registerScheduledPostHandlers } from './ipc/scheduledPostHandlers'
import { registerDataHandlers } from './ipc/dataHandlers'
import { registerProxyHandlers } from './ipc/proxyHandlers'
import { registerAutomationHandlers } from './ipc/automationHandlers'
import { registerWorkflowHandlers } from './ipc/workflowHandlers'
import { registerMediaHandlers } from './ipc/mediaHandlers'
import { registerMonitoringHandlers } from './ipc/monitoringHandlers'
import { registerSecurityHandlers } from './ipc/securityHandlers'
import { registerNotificationHandlers } from './ipc/notificationHandlers'
import { registerAuthHandlers, setupAuthStateListener, cleanupAuthStateListener } from './ipc/authHandlers'
import { registerBillingHandlers } from './ipc/billingHandlers'
import { registerLicenseHandlers, startLicenseWatcher, stopLicenseWatcher } from './ipc/licenseHandlers'
import { registerSyncHandlers } from './ipc/syncHandlers'
import { registerUpdaterHandlers } from './ipc/updaterHandlers'
import { initializeUpdater, cleanupUpdater } from './services/updater'
import { closeAllAccountWindows } from './browser/sessionManager'
import { startAutoLockWatcher, stopAutoLockWatcher, setupWindowMonitor } from './security/autoLock'
import { startScheduler, stopScheduler } from './scheduler/postScheduler'
import { startAutomationScheduler, stopAutomationScheduler } from './scheduler/automationScheduler'
import { startWorkflowScheduler, stopWorkflowScheduler } from './scheduler/workflowScheduler'
import { startMonitoringScheduler, stopMonitoringScheduler } from './scheduler/monitoringScheduler'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f0f0f',
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 15, y: 10 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    // Open DevTools in development mode
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      mainWindow?.webContents.openDevTools()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the renderer
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] || 'http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.multisession')

  // Initialize database
  initializeDatabase()

  // Register IPC handlers
  registerAccountHandlers()
  registerBrowserHandlers()
  registerPostHandlers()
  registerEngagementHandlers()
  registerCheckHandlers()
  registerGroupHandlers()
  registerScheduledPostHandlers()
  registerDataHandlers()
  registerProxyHandlers()
  registerAutomationHandlers()
  registerWorkflowHandlers()
  registerMediaHandlers()
  registerMonitoringHandlers()
  registerSecurityHandlers()
  registerNotificationHandlers()
  registerAuthHandlers()
  registerBillingHandlers()
  registerLicenseHandlers()
  registerSyncHandlers()
  registerUpdaterHandlers()

  // Setup auth state listener
  setupAuthStateListener()

  // Window control IPC handlers
  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })

  ipcMain.on('window:close', () => {
    mainWindow?.close()
  })

  createWindow()

  // Setup security monitor for main window
  if (mainWindow) {
    setupWindowMonitor(mainWindow)
  }

  // Start schedulers
  startScheduler()
  startAutomationScheduler()
  startWorkflowScheduler()
  startMonitoringScheduler()

  // Start auto-lock watcher
  startAutoLockWatcher()

  // Start license watcher (with default local user)
  startLicenseWatcher(mainWindow, 'local-user')

  // Initialize updater
  initializeUpdater(mainWindow)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopScheduler()
  stopAutomationScheduler()
  stopWorkflowScheduler()
  stopMonitoringScheduler()
  stopAutoLockWatcher()
  stopLicenseWatcher()
  cleanupAuthStateListener()
  cleanupUpdater()
  closeAllAccountWindows()
  closeDatabase()
})
