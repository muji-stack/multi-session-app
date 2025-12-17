import { BrowserWindow } from 'electron'
import {
  getDueAutomationTasks,
  updateTaskAfterRun,
  createAutomationLog,
  resetDailyCounters
} from '../database/automationRepository'
import { getAccountById } from '../database/accountRepository'
import { getProxyById } from '../database/proxyRepository'
import { createAccountWindow, getAccountWindow } from '../browser/sessionManager'
import type { AutomationTask, AutomationActionType } from '../../shared/types'

let schedulerInterval: ReturnType<typeof setInterval> | null = null
let dailyResetInterval: ReturnType<typeof setInterval> | null = null
let isRunning = false

const SCHEDULER_INTERVAL = 60 * 1000 // Check every minute
const DAILY_RESET_HOUR = 0 // Reset at midnight

export function startAutomationScheduler(): void {
  if (schedulerInterval) {
    console.log('[AutomationScheduler] Already running')
    return
  }

  console.log('[AutomationScheduler] Starting...')

  // Run immediately on start
  runScheduledTasks()

  // Set up periodic check
  schedulerInterval = setInterval(runScheduledTasks, SCHEDULER_INTERVAL)

  // Set up daily counter reset
  setupDailyReset()
}

export function stopAutomationScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
  }
  if (dailyResetInterval) {
    clearInterval(dailyResetInterval)
    dailyResetInterval = null
  }
  console.log('[AutomationScheduler] Stopped')
}

function setupDailyReset(): void {
  // Calculate time until next midnight
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(DAILY_RESET_HOUR, 0, 0, 0)
  const msUntilReset = tomorrow.getTime() - now.getTime()

  // Set timeout for first reset, then interval for subsequent resets
  setTimeout(() => {
    resetDailyCounters()
    console.log('[AutomationScheduler] Daily counters reset')

    // Set up daily interval
    dailyResetInterval = setInterval(() => {
      resetDailyCounters()
      console.log('[AutomationScheduler] Daily counters reset')
    }, 24 * 60 * 60 * 1000)
  }, msUntilReset)
}

async function runScheduledTasks(): Promise<void> {
  if (isRunning) {
    console.log('[AutomationScheduler] Previous run still in progress, skipping')
    return
  }

  isRunning = true

  try {
    const dueTasks = getDueAutomationTasks()

    if (dueTasks.length === 0) {
      return
    }

    console.log(`[AutomationScheduler] Found ${dueTasks.length} due tasks`)

    for (const task of dueTasks) {
      // Check daily limit
      if (task.todayCount >= task.dailyLimit) {
        console.log(`[AutomationScheduler] Task ${task.name} reached daily limit (${task.dailyLimit})`)
        continue
      }

      await executeTask(task)
    }
  } catch (error) {
    console.error('[AutomationScheduler] Error running scheduled tasks:', error)
  } finally {
    isRunning = false
  }
}

async function executeTask(task: AutomationTask): Promise<void> {
  console.log(`[AutomationScheduler] Executing task: ${task.name}`)

  // Pick a random account from the task's account list
  const accountId = task.accountIds[Math.floor(Math.random() * task.accountIds.length)]
  const account = getAccountById(accountId)

  if (!account) {
    console.error(`[AutomationScheduler] Account ${accountId} not found`)
    createAutomationLog(task.id, accountId, task.actionType, null, 'failed', 'Account not found')
    updateTaskAfterRun(task.id, false)
    return
  }

  // Get or create browser window for the account
  let window = getAccountWindow(accountId)
  let windowWasCreated = false

  if (!window) {
    // Create window if needed
    const proxy = account.proxyId ? getProxyById(account.proxyId) : null
    window = createAccountWindow(accountId, account.username, proxy)
    windowWasCreated = true

    // Wait for window to load
    await waitForWindowLoad(window)
  }

  try {
    // Execute the action
    const targetUrl = buildTargetUrl(task)
    const result = await executeAction(window, task.actionType, targetUrl)

    if (result.success) {
      createAutomationLog(task.id, accountId, task.actionType, targetUrl, 'success', null)
      updateTaskAfterRun(task.id, true)
      console.log(`[AutomationScheduler] Task ${task.name} completed successfully`)
    } else {
      createAutomationLog(task.id, accountId, task.actionType, targetUrl, 'failed', result.error)
      updateTaskAfterRun(task.id, false)
      console.error(`[AutomationScheduler] Task ${task.name} failed: ${result.error}`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    createAutomationLog(task.id, accountId, task.actionType, null, 'failed', errorMessage)
    updateTaskAfterRun(task.id, false)
    console.error(`[AutomationScheduler] Task ${task.name} error:`, error)
  } finally {
    // Close window if we created it just for this task
    if (windowWasCreated && window && !window.isDestroyed()) {
      // Wait a bit before closing to allow action to complete
      setTimeout(() => {
        if (!window.isDestroyed()) {
          window.close()
        }
      }, 5000)
    }
  }
}

function waitForWindowLoad(window: BrowserWindow): Promise<void> {
  return new Promise((resolve) => {
    if (window.webContents.isLoading()) {
      window.webContents.once('did-finish-load', () => {
        // Additional wait for X to fully render
        setTimeout(resolve, 3000)
      })
    } else {
      setTimeout(resolve, 1000)
    }
  })
}

function buildTargetUrl(task: AutomationTask): string {
  switch (task.targetType) {
    case 'keyword':
      return `https://x.com/search?q=${encodeURIComponent(task.targetValue || '')}&src=typed_query&f=live`
    case 'hashtag':
      const tag = task.targetValue?.startsWith('#') ? task.targetValue.slice(1) : task.targetValue
      return `https://x.com/search?q=%23${encodeURIComponent(tag || '')}&src=hashtag_click&f=live`
    case 'timeline':
      return 'https://x.com/home'
    case 'user_list':
      // For user list, targetValue contains a username
      return `https://x.com/${task.targetValue}`
    default:
      return 'https://x.com/home'
  }
}

async function executeAction(
  window: BrowserWindow,
  actionType: AutomationActionType,
  targetUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Navigate to target URL
    await window.loadURL(targetUrl)
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Execute action based on type
    switch (actionType) {
      case 'like':
        return await executeLikeAction(window)
      case 'repost':
        return await executeRepostAction(window)
      case 'follow':
        return await executeFollowAction(window)
      case 'unfollow':
        return await executeUnfollowAction(window)
      default:
        return { success: false, error: `Unknown action type: ${actionType}` }
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function executeLikeAction(window: BrowserWindow): Promise<{ success: boolean; error?: string }> {
  const result = await window.webContents.executeJavaScript(`
    (function() {
      // Find the first unliked tweet's like button
      const likeButtons = document.querySelectorAll('[data-testid="like"]');
      if (likeButtons.length > 0) {
        // Click a random like button from the first 5
        const maxIndex = Math.min(5, likeButtons.length);
        const randomIndex = Math.floor(Math.random() * maxIndex);
        likeButtons[randomIndex].click();
        return { success: true };
      }
      return { success: false, error: 'No likeable tweets found' };
    })()
  `)
  return result
}

async function executeRepostAction(window: BrowserWindow): Promise<{ success: boolean; error?: string }> {
  const result = await window.webContents.executeJavaScript(`
    (function() {
      // Find the first unreposted tweet's repost button
      const repostButtons = document.querySelectorAll('[data-testid="retweet"]');
      if (repostButtons.length > 0) {
        // Click a random repost button from the first 5
        const maxIndex = Math.min(5, repostButtons.length);
        const randomIndex = Math.floor(Math.random() * maxIndex);
        repostButtons[randomIndex].click();

        // Wait for menu and click repost option
        setTimeout(() => {
          const confirmRepost = document.querySelector('[data-testid="retweetConfirm"]');
          if (confirmRepost) {
            confirmRepost.click();
          }
        }, 500);

        return { success: true };
      }
      return { success: false, error: 'No repostable tweets found' };
    })()
  `)
  return result
}

async function executeFollowAction(window: BrowserWindow): Promise<{ success: boolean; error?: string }> {
  const result = await window.webContents.executeJavaScript(`
    (function() {
      // Find follow buttons (not following state)
      const followButtons = Array.from(document.querySelectorAll('[data-testid$="-follow"]'))
        .filter(btn => btn.textContent?.includes('フォロー') || btn.textContent?.includes('Follow'));

      if (followButtons.length > 0) {
        followButtons[0].click();
        return { success: true };
      }
      return { success: false, error: 'No followable users found' };
    })()
  `)
  return result
}

async function executeUnfollowAction(window: BrowserWindow): Promise<{ success: boolean; error?: string }> {
  const result = await window.webContents.executeJavaScript(`
    (function() {
      // Find unfollow buttons (following state)
      const unfollowButtons = Array.from(document.querySelectorAll('[data-testid$="-unfollow"]'));

      if (unfollowButtons.length > 0) {
        unfollowButtons[0].click();

        // Confirm unfollow in dialog
        setTimeout(() => {
          const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
          if (confirmBtn) {
            confirmBtn.click();
          }
        }, 500);

        return { success: true };
      }
      return { success: false, error: 'No unfollowable users found' };
    })()
  `)
  return result
}
