import { BrowserWindow } from 'electron'
import {
  getPendingScheduledPosts,
  markAsProcessing,
  markAsCompleted,
  markAsFailed
} from '../database/scheduledPostRepository'
import { getAccountById } from '../database/accountRepository'
import { createActionLog, updateActionLogStatus } from '../database/postRepository'
import { getPartitionForAccount } from '../browser/sessionManager'
import { session } from 'electron'

let schedulerInterval: NodeJS.Timeout | null = null
let isProcessing = false

const SCHEDULER_INTERVAL = 30000 // Check every 30 seconds

// Delay helper
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

async function executeScheduledPost(scheduledPostId: string, accountId: string, content: string): Promise<void> {
  const account = getAccountById(accountId)
  if (!account) {
    markAsFailed(scheduledPostId, 'Account not found')
    return
  }

  const partition = getPartitionForAccount(accountId)
  const ses = session.fromPartition(partition, { cache: true })

  // Check if logged in
  const cookies = await ses.cookies.get({ domain: '.x.com' })
  const authCookie = cookies.find((c) => c.name === 'auth_token' || c.name === 'ct0')

  if (!authCookie) {
    markAsFailed(scheduledPostId, 'Not logged in')
    return
  }

  // Create action log
  const log = createActionLog(accountId, 'post', undefined, 'pending')

  // Create hidden window for posting
  const postWindow = new BrowserWindow({
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
    // Load compose tweet page
    await postWindow.loadURL('https://x.com/compose/tweet')
    await delay(2000)

    // Wait for the editor to load and type content
    const result = await postWindow.webContents.executeJavaScript(`
      (async () => {
        // Wait for editor
        const waitForEditor = () => {
          return new Promise((resolve, reject) => {
            let attempts = 0;
            const check = () => {
              attempts++;
              const editor = document.querySelector('[data-testid="tweetTextarea_0"]') ||
                            document.querySelector('[role="textbox"]');
              if (editor) {
                resolve(editor);
              } else if (attempts > 30) {
                reject(new Error('Editor not found'));
              } else {
                setTimeout(check, 500);
              }
            };
            check();
          });
        };

        try {
          const editor = await waitForEditor();
          editor.focus();

          // Set content using clipboard API
          const content = ${JSON.stringify(content)};

          // Use execCommand for compatibility
          document.execCommand('insertText', false, content);

          // Wait for content to be set
          await new Promise(r => setTimeout(r, 500));

          // Find and click post button
          const postButton = document.querySelector('[data-testid="tweetButton"]') ||
                            document.querySelector('[data-testid="tweetButtonInline"]');

          if (!postButton) {
            return { success: false, error: 'Post button not found' };
          }

          // Check if button is enabled
          if (postButton.disabled || postButton.getAttribute('aria-disabled') === 'true') {
            return { success: false, error: 'Post button is disabled' };
          }

          postButton.click();

          // Wait for post to complete
          await new Promise(r => setTimeout(r, 3000));

          return { success: true };
        } catch (e) {
          return { success: false, error: e.message };
        }
      })()
    `)

    if (result.success) {
      updateActionLogStatus(log.id, 'success')
      markAsCompleted(scheduledPostId)
      console.log(`[Scheduler] Successfully posted scheduled post ${scheduledPostId}`)
    } else {
      updateActionLogStatus(log.id, 'failed', result.error)
      markAsFailed(scheduledPostId, result.error)
      console.log(`[Scheduler] Failed to post scheduled post ${scheduledPostId}: ${result.error}`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    updateActionLogStatus(log.id, 'failed', errorMessage)
    markAsFailed(scheduledPostId, errorMessage)
    console.log(`[Scheduler] Error posting scheduled post ${scheduledPostId}: ${errorMessage}`)
  } finally {
    if (!postWindow.isDestroyed()) {
      postWindow.destroy()
    }
  }
}

async function processScheduledPosts(): Promise<void> {
  if (isProcessing) {
    return
  }

  isProcessing = true

  try {
    const pendingPosts = getPendingScheduledPosts()

    for (const post of pendingPosts) {
      // Mark as processing
      markAsProcessing(post.id)

      // Execute the post
      await executeScheduledPost(post.id, post.accountId, post.content)

      // Small delay between posts to avoid rate limiting
      await delay(2000)
    }
  } catch (error) {
    console.error('[Scheduler] Error processing scheduled posts:', error)
  } finally {
    isProcessing = false
  }
}

export function startScheduler(): void {
  if (schedulerInterval) {
    return
  }

  console.log('[Scheduler] Starting post scheduler...')

  // Run immediately on start
  processScheduledPosts()

  // Then run at intervals
  schedulerInterval = setInterval(() => {
    processScheduledPosts()
  }, SCHEDULER_INTERVAL)
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
    console.log('[Scheduler] Post scheduler stopped')
  }
}

export function isSchedulerRunning(): boolean {
  return schedulerInterval !== null
}
