import { BrowserWindow, Notification } from 'electron'
import { getAllAccounts, updateAccount } from '../database/accountRepository'
import { getProxyById } from '../database/proxyRepository'
import {
  getOrCreateConfig,
  createAlert,
  deleteOldAlerts,
  deleteOldReports
} from '../database/monitoringRepository'
import { createAccountWindow, getAccountWindow, closeAccountWindow } from '../browser/sessionManager'
import type {
  Account,
  AccountStatus,
  SearchBanStatus,
  MonitoringAlertType,
  AlertSeverity,
  MonitoringCheckResult
} from '../../shared/types'

let schedulerInterval: ReturnType<typeof setInterval> | null = null
let cleanupInterval: ReturnType<typeof setInterval> | null = null
let isRunning = false
let mainWindow: BrowserWindow | null = null

const DEFAULT_INTERVAL = 30 * 60 * 1000 // 30 minutes
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours

export function startMonitoringScheduler(): void {
  if (schedulerInterval) {
    console.log('[MonitoringScheduler] Already running')
    return
  }

  console.log('[MonitoringScheduler] Starting...')

  // Get main window reference
  const windows = BrowserWindow.getAllWindows()
  mainWindow = windows.find((w) => !w.isDestroyed()) || null

  // Get config and set up interval
  const config = getOrCreateConfig()
  const interval = config.checkIntervalMinutes * 60 * 1000

  if (config.isEnabled) {
    // Run initial check after a delay to let app fully load
    setTimeout(() => runMonitoringCheck(), 60000)
  }

  // Set up periodic check
  schedulerInterval = setInterval(() => {
    const currentConfig = getOrCreateConfig()
    if (currentConfig.isEnabled) {
      runMonitoringCheck()
    }
  }, interval || DEFAULT_INTERVAL)

  // Set up cleanup interval
  cleanupInterval = setInterval(runCleanup, CLEANUP_INTERVAL)
}

export function stopMonitoringScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
  }
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
  console.log('[MonitoringScheduler] Stopped')
}

async function runMonitoringCheck(): Promise<void> {
  if (isRunning) {
    console.log('[MonitoringScheduler] Previous check still in progress, skipping')
    return
  }

  isRunning = true
  console.log('[MonitoringScheduler] Starting monitoring check...')

  try {
    const config = getOrCreateConfig()
    const accounts = getAllAccounts()

    if (accounts.length === 0) {
      console.log('[MonitoringScheduler] No accounts to monitor')
      return
    }

    const results: MonitoringCheckResult[] = []

    for (const account of accounts) {
      try {
        const result = await checkAccount(account, config)
        results.push(result)

        // Create alerts if needed
        await processCheckResult(result, account, config)

        // Small delay between checks to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`[MonitoringScheduler] Error checking account ${account.username}:`, error)
      }
    }

    console.log(`[MonitoringScheduler] Completed check for ${results.length} accounts`)

    // Send summary to renderer if main window exists
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('monitoring:checkComplete', {
        timestamp: Date.now(),
        accountsChecked: results.length,
        issuesFound: results.filter((r) => r.statusChanged || r.searchBanChanged).length
      })
    }
  } catch (error) {
    console.error('[MonitoringScheduler] Error running monitoring check:', error)
  } finally {
    isRunning = false
  }
}

async function checkAccount(
  account: Account,
  config: { autoCheckShadowBan: boolean; autoCheckLoginStatus: boolean }
): Promise<MonitoringCheckResult> {
  const previousStatus = account.status
  const previousSearchBanStatus = account.searchBanStatus
  let newStatus: AccountStatus = previousStatus
  let newSearchBanStatus: SearchBanStatus = previousSearchBanStatus
  let isLoggedIn = true

  // Get or create browser window for checking
  let window = getAccountWindow(account.id)
  let windowWasCreated = false

  if (!window) {
    const proxy = account.proxyId ? getProxyById(account.proxyId) : null
    window = createAccountWindow(account.id, account.username, proxy)
    windowWasCreated = true
    window.hide() // Hide window during check

    // Wait for window to load
    await waitForWindowLoad(window)
  }

  try {
    // Check login status
    if (config.autoCheckLoginStatus) {
      const loginResult = await checkLoginStatus(window)
      isLoggedIn = loginResult.loggedIn

      if (!loginResult.loggedIn) {
        // Not logged in, might indicate session expired
        newStatus = 'unknown'
      }
    }

    // Check account status (locked/suspended)
    if (isLoggedIn) {
      const statusResult = await checkAccountStatus(window, account.username)
      newStatus = statusResult.status
    }

    // Check shadow ban status
    if (config.autoCheckShadowBan && isLoggedIn && newStatus === 'normal') {
      const shadowBanResult = await checkShadowBan(window, account.username)
      newSearchBanStatus = shadowBanResult.status
    }

    // Update account in database
    const now = Date.now()
    updateAccount(account.id, {
      status: newStatus,
      searchBanStatus: newSearchBanStatus,
      lastCheckedAt: now
    })

    return {
      accountId: account.id,
      username: account.username,
      status: newStatus,
      previousStatus,
      searchBanStatus: newSearchBanStatus,
      previousSearchBanStatus,
      isLoggedIn,
      statusChanged: newStatus !== previousStatus,
      searchBanChanged: newSearchBanStatus !== previousSearchBanStatus,
      checkedAt: now
    }
  } finally {
    // Close window if we created it
    if (windowWasCreated) {
      closeAccountWindow(account.id)
    }
  }
}

async function checkLoginStatus(window: BrowserWindow): Promise<{ loggedIn: boolean }> {
  try {
    await window.loadURL('https://x.com/home')
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const result = await window.webContents.executeJavaScript(`
      (function() {
        // Check for login indicators
        const isLoggedIn = !!(
          document.querySelector('[data-testid="SideNav_NewTweet_Button"]') ||
          document.querySelector('[data-testid="primaryColumn"]') ||
          document.querySelector('[aria-label="アカウントメニュー"]') ||
          document.querySelector('[aria-label="Account menu"]')
        );
        return { loggedIn: isLoggedIn };
      })()
    `)

    return result
  } catch {
    return { loggedIn: false }
  }
}

async function checkAccountStatus(
  window: BrowserWindow,
  username: string
): Promise<{ status: AccountStatus }> {
  try {
    await window.loadURL(`https://x.com/${username}`)
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const result = await window.webContents.executeJavaScript(`
      (function() {
        const pageContent = document.body.innerText || '';

        // Check for suspension
        if (pageContent.includes('アカウントは凍結されています') ||
            pageContent.includes('Account suspended') ||
            pageContent.includes('This account has been suspended')) {
          return { status: 'suspended' };
        }

        // Check for lock
        if (pageContent.includes('アカウントがロックされています') ||
            pageContent.includes('Your account has been locked') ||
            pageContent.includes('Account locked')) {
          return { status: 'locked' };
        }

        // Check if profile loads normally
        const profileHeader = document.querySelector('[data-testid="UserName"]');
        if (profileHeader) {
          return { status: 'normal' };
        }

        return { status: 'unknown' };
      })()
    `)

    return result
  } catch {
    return { status: 'unknown' }
  }
}

async function checkShadowBan(
  window: BrowserWindow,
  username: string
): Promise<{ status: SearchBanStatus }> {
  try {
    // Search for the user's recent tweets
    await window.loadURL(
      `https://x.com/search?q=from%3A${username}&src=typed_query&f=live`
    )
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const result = await window.webContents.executeJavaScript(`
      (function() {
        // Check if tweets are visible in search
        const tweets = document.querySelectorAll('[data-testid="tweet"]');
        const noResults = document.body.innerText.includes('結果はありません') ||
                         document.body.innerText.includes('No results');

        if (noResults || tweets.length === 0) {
          return { status: 'hidden' };
        }

        return { status: 'visible' };
      })()
    `)

    return result
  } catch {
    return { status: 'unknown' }
  }
}

async function processCheckResult(
  result: MonitoringCheckResult,
  account: Account,
  config: {
    alertOnLock: boolean
    alertOnSuspend: boolean
    alertOnShadowBan: boolean
    alertOnLoginFailure: boolean
    notifyDesktop: boolean
    notifySound: boolean
  }
): Promise<void> {
  const alerts: { type: MonitoringAlertType; severity: AlertSeverity; message: string }[] = []

  // Check for status changes
  if (result.statusChanged) {
    if (result.status === 'locked' && config.alertOnLock) {
      alerts.push({
        type: 'account_locked',
        severity: 'high',
        message: `アカウント @${account.username} がロックされました`
      })
    } else if (result.status === 'suspended' && config.alertOnSuspend) {
      alerts.push({
        type: 'account_suspended',
        severity: 'critical',
        message: `アカウント @${account.username} が凍結されました`
      })
    }
  }

  // Check for shadow ban
  if (
    result.searchBanChanged &&
    result.searchBanStatus === 'hidden' &&
    config.alertOnShadowBan
  ) {
    alerts.push({
      type: 'shadow_ban_detected',
      severity: 'medium',
      message: `アカウント @${account.username} がシャドウBANの可能性があります`
    })
  }

  // Check for login failure
  if (!result.isLoggedIn && config.alertOnLoginFailure) {
    alerts.push({
      type: 'login_failed',
      severity: 'high',
      message: `アカウント @${account.username} のログイン状態を確認できません`
    })
  }

  // Create alerts and send notifications
  for (const alert of alerts) {
    createAlert({
      accountId: account.id,
      alertType: alert.type,
      severity: alert.severity,
      message: alert.message,
      details: JSON.stringify({
        previousStatus: result.previousStatus,
        newStatus: result.status,
        previousSearchBanStatus: result.previousSearchBanStatus,
        newSearchBanStatus: result.searchBanStatus,
        checkedAt: result.checkedAt
      })
    })

    // Send desktop notification
    if (config.notifyDesktop && Notification.isSupported()) {
      const notification = new Notification({
        title: 'MultiSession アラート',
        body: alert.message,
        silent: !config.notifySound
      })
      notification.show()
    }

    // Send to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('monitoring:alert', {
        accountId: account.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message
      })
    }
  }
}

function waitForWindowLoad(window: BrowserWindow): Promise<void> {
  return new Promise((resolve) => {
    if (window.webContents.isLoading()) {
      window.webContents.once('did-finish-load', () => {
        setTimeout(resolve, 2000)
      })
    } else {
      setTimeout(resolve, 1000)
    }
  })
}

function runCleanup(): void {
  console.log('[MonitoringScheduler] Running cleanup...')
  try {
    const deletedAlerts = deleteOldAlerts(30)
    const deletedReports = deleteOldReports(90)
    console.log(`[MonitoringScheduler] Cleanup complete: ${deletedAlerts} alerts, ${deletedReports} reports deleted`)
  } catch (error) {
    console.error('[MonitoringScheduler] Cleanup error:', error)
  }
}

// Manual trigger function for immediate check
export async function triggerManualCheck(): Promise<MonitoringCheckResult[]> {
  if (isRunning) {
    throw new Error('Check already in progress')
  }

  const results: MonitoringCheckResult[] = []
  isRunning = true

  try {
    const config = getOrCreateConfig()
    const accounts = getAllAccounts()

    for (const account of accounts) {
      try {
        const result = await checkAccount(account, config)
        results.push(result)
        await processCheckResult(result, account, config)
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`[MonitoringScheduler] Error checking account ${account.username}:`, error)
      }
    }

    return results
  } finally {
    isRunning = false
  }
}
