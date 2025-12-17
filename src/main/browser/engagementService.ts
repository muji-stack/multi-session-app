import { BrowserWindow, session } from 'electron'
import { getPartitionForAccount } from './sessionManager'
import { createActionLog, updateActionLogStatus } from '../database/postRepository'
import { getAccountById } from '../database/accountRepository'
import type { ActionType } from '../../shared/types'

interface EngagementResult {
  accountId: string
  success: boolean
  error?: string
}

interface EngagementJob {
  accountId: string
  targetUrl: string
  actionType: ActionType
  logId: string
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const randomDelay = (min: number, max: number): Promise<void> => {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min
  return delay(ms)
}

// Extract tweet ID from URL
function extractTweetId(url: string): string | null {
  const match = url.match(/status\/(\d+)/)
  return match ? match[1] : null
}

// Extract username from URL
function extractUsername(url: string): string | null {
  const match = url.match(/x\.com\/([^\/\?]+)/) || url.match(/twitter\.com\/([^\/\?]+)/)
  if (match && !['status', 'i', 'home', 'explore', 'search', 'settings'].includes(match[1])) {
    return match[1]
  }
  return null
}

async function executeEngagement(job: EngagementJob): Promise<EngagementResult> {
  const { accountId, targetUrl, actionType, logId } = job

  const account = getAccountById(accountId)
  if (!account) {
    updateActionLogStatus(logId, 'failed', 'Account not found')
    return { accountId, success: false, error: 'Account not found' }
  }

  const partition = getPartitionForAccount(accountId)
  const ses = session.fromPartition(partition, { cache: true })

  const cookies = await ses.cookies.get({ domain: '.x.com' })
  const authCookie = cookies.find((c) => c.name === 'auth_token' || c.name === 'ct0')

  if (!authCookie) {
    updateActionLogStatus(logId, 'failed', 'Not logged in')
    return { accountId, success: false, error: 'Not logged in' }
  }

  const engagementWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    skipTaskbar: true,
    webPreferences: {
      partition,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  try {
    await engagementWindow.loadURL(targetUrl)
    await delay(2000)

    let result: { success: boolean; error?: string }

    switch (actionType) {
      case 'like':
        result = await executeLike(engagementWindow)
        break
      case 'retweet':
        result = await executeRetweet(engagementWindow)
        break
      case 'follow':
        result = await executeFollow(engagementWindow)
        break
      default:
        result = { success: false, error: 'Unknown action type' }
    }

    if (result.success) {
      updateActionLogStatus(logId, 'success')
      return { accountId, success: true }
    } else {
      updateActionLogStatus(logId, 'failed', result.error)
      return { accountId, success: false, error: result.error }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    updateActionLogStatus(logId, 'failed', errorMessage)
    return { accountId, success: false, error: errorMessage }
  } finally {
    if (!engagementWindow.isDestroyed()) {
      engagementWindow.destroy()
    }
  }
}

async function executeLike(window: BrowserWindow): Promise<{ success: boolean; error?: string }> {
  return window.webContents.executeJavaScript(`
    (async () => {
      const waitForElement = (selector, maxAttempts = 30) => {
        return new Promise((resolve, reject) => {
          let attempts = 0;
          const check = () => {
            attempts++;
            const element = document.querySelector(selector);
            if (element) {
              resolve(element);
            } else if (attempts > maxAttempts) {
              reject(new Error('Element not found: ' + selector));
            } else {
              setTimeout(check, 500);
            }
          };
          check();
        });
      };

      try {
        // Find like button
        const likeButton = await waitForElement('[data-testid="like"]');

        // Check if already liked
        const isLiked = likeButton.getAttribute('data-testid') === 'unlike';
        if (isLiked) {
          return { success: true, error: 'Already liked' };
        }

        likeButton.click();
        await new Promise(r => setTimeout(r, 1000));

        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    })()
  `)
}

async function executeRetweet(window: BrowserWindow): Promise<{ success: boolean; error?: string }> {
  return window.webContents.executeJavaScript(`
    (async () => {
      const waitForElement = (selector, maxAttempts = 30) => {
        return new Promise((resolve, reject) => {
          let attempts = 0;
          const check = () => {
            attempts++;
            const element = document.querySelector(selector);
            if (element) {
              resolve(element);
            } else if (attempts > maxAttempts) {
              reject(new Error('Element not found: ' + selector));
            } else {
              setTimeout(check, 500);
            }
          };
          check();
        });
      };

      try {
        // Find retweet button
        const retweetButton = await waitForElement('[data-testid="retweet"]');
        retweetButton.click();

        await new Promise(r => setTimeout(r, 500));

        // Click "Repost" option in the menu
        const repostOption = await waitForElement('[data-testid="retweetConfirm"]');
        repostOption.click();

        await new Promise(r => setTimeout(r, 1000));

        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    })()
  `)
}

async function executeFollow(window: BrowserWindow): Promise<{ success: boolean; error?: string }> {
  return window.webContents.executeJavaScript(`
    (async () => {
      const waitForElement = (selector, maxAttempts = 30) => {
        return new Promise((resolve, reject) => {
          let attempts = 0;
          const check = () => {
            attempts++;
            const element = document.querySelector(selector);
            if (element) {
              resolve(element);
            } else if (attempts > maxAttempts) {
              reject(new Error('Element not found: ' + selector));
            } else {
              setTimeout(check, 500);
            }
          };
          check();
        });
      };

      try {
        // Find follow button - look for button with specific attributes
        const buttons = document.querySelectorAll('[role="button"]');
        let followButton = null;

        for (const btn of buttons) {
          const text = btn.textContent?.toLowerCase() || '';
          if (text.includes('follow') && !text.includes('following') && !text.includes('unfollow')) {
            followButton = btn;
            break;
          }
        }

        // Also try data-testid
        if (!followButton) {
          followButton = document.querySelector('[data-testid$="-follow"]');
        }

        if (!followButton) {
          // Check if already following
          const followingBtn = document.querySelector('[data-testid$="-unfollow"]');
          if (followingBtn) {
            return { success: true, error: 'Already following' };
          }
          return { success: false, error: 'Follow button not found' };
        }

        followButton.click();
        await new Promise(r => setTimeout(r, 1000));

        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    })()
  `)
}

export async function executeBulkEngagement(
  accountIds: string[],
  targetUrl: string,
  actionType: ActionType,
  delayBetweenActions = 3000,
  onProgress?: (completed: number, total: number, result: EngagementResult) => void
): Promise<EngagementResult[]> {
  const results: EngagementResult[] = []
  const total = accountIds.length

  for (let i = 0; i < accountIds.length; i++) {
    const accountId = accountIds[i]

    const log = createActionLog(accountId, actionType, targetUrl, 'pending')

    const result = await executeEngagement({
      accountId,
      targetUrl,
      actionType,
      logId: log.id
    })

    results.push(result)

    if (onProgress) {
      onProgress(i + 1, total, result)
    }

    if (i < accountIds.length - 1) {
      await randomDelay(delayBetweenActions, delayBetweenActions + 2000)
    }
  }

  return results
}
