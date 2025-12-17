import { BrowserWindow, session } from 'electron'
import { getPartitionForAccount } from './sessionManager'
import { createActionLog, updateActionLogStatus } from '../database/postRepository'
import { getAccountById } from '../database/accountRepository'

interface PostResult {
  accountId: string
  success: boolean
  error?: string
}

interface PostJob {
  accountId: string
  content: string
  logId: string
}

// Delay helper
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

// Random delay between min and max (for human-like behavior)
const randomDelay = (min: number, max: number): Promise<void> => {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min
  return delay(ms)
}

async function executePost(job: PostJob): Promise<PostResult> {
  const { accountId, content, logId } = job

  const account = getAccountById(accountId)
  if (!account) {
    updateActionLogStatus(logId, 'failed', 'Account not found')
    return { accountId, success: false, error: 'Account not found' }
  }

  const partition = getPartitionForAccount(accountId)
  const ses = session.fromPartition(partition, { cache: true })

  // Check if logged in by looking for auth cookies
  const cookies = await ses.cookies.get({ domain: '.x.com' })
  const authCookie = cookies.find((c) => c.name === 'auth_token' || c.name === 'ct0')

  if (!authCookie) {
    updateActionLogStatus(logId, 'failed', 'Not logged in')
    return { accountId, success: false, error: 'Not logged in - please login first' }
  }

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
    if (!postWindow.isDestroyed()) {
      postWindow.destroy()
    }
  }
}

export async function executeBulkPost(
  accountIds: string[],
  content: string,
  delayBetweenPosts = 5000,
  onProgress?: (completed: number, total: number, result: PostResult) => void
): Promise<PostResult[]> {
  const results: PostResult[] = []
  const total = accountIds.length

  for (let i = 0; i < accountIds.length; i++) {
    const accountId = accountIds[i]

    // Create action log
    const log = createActionLog(accountId, 'post', undefined, 'pending')

    // Execute post
    const result = await executePost({
      accountId,
      content,
      logId: log.id
    })

    results.push(result)

    // Progress callback
    if (onProgress) {
      onProgress(i + 1, total, result)
    }

    // Delay between posts (except for the last one)
    if (i < accountIds.length - 1) {
      await randomDelay(delayBetweenPosts, delayBetweenPosts + 2000)
    }
  }

  return results
}

export async function checkAccountLoginStatus(accountId: string): Promise<boolean> {
  const partition = getPartitionForAccount(accountId)
  const ses = session.fromPartition(partition, { cache: true })

  const cookies = await ses.cookies.get({ domain: '.x.com' })
  const authCookie = cookies.find((c) => c.name === 'auth_token' || c.name === 'ct0')

  return !!authCookie
}
