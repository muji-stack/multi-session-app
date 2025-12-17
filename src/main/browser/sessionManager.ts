import { BrowserWindow, session } from 'electron'
import type { Proxy } from '../../shared/types'

interface AccountWindow {
  accountId: string
  window: BrowserWindow
  partition: string
}

const accountWindows: Map<string, AccountWindow> = new Map()

export function getPartitionForAccount(accountId: string): string {
  return `persist:account-${accountId}`
}

function buildProxyUrl(proxy: Proxy): string {
  // For Electron session.setProxy, we use the format: protocol://host:port
  return `${proxy.protocol}://${proxy.host}:${proxy.port}`
}

export function createAccountWindow(accountId: string, username: string, proxy?: Proxy | null): BrowserWindow {
  // Check if window already exists
  const existing = accountWindows.get(accountId)
  if (existing && !existing.window.isDestroyed()) {
    existing.window.focus()
    return existing.window
  }

  const partition = getPartitionForAccount(accountId)

  // Create session with partition for isolation
  const ses = session.fromPartition(partition, { cache: true })

  // Set user agent to avoid detection
  ses.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  )

  // Set proxy if provided
  if (proxy) {
    const proxyUrl = buildProxyUrl(proxy)
    ses.setProxy({ proxyRules: proxyUrl }).catch((err) => {
      console.error(`Failed to set proxy for account ${accountId}:`, err)
    })

    // Handle proxy authentication if credentials are provided
    if (proxy.username && proxy.password) {
      ses.webRequest.onAuthRequired((details, callback) => {
        callback({
          username: proxy.username!,
          password: proxy.password!
        })
      })
    }

    console.log(`[Session] Proxy set for account ${accountId}: ${proxy.name} (${proxyUrl})`)
  }

  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: `X - @${username}`,
    show: false,
    backgroundColor: '#000000',
    webPreferences: {
      partition,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      // Performance optimizations
      spellcheck: false,
      enableWebSQL: false,
      backgroundThrottling: true,
      offscreen: false
    }
  })

  // Performance: disable features we don't need
  window.webContents.setAudioMuted(true)

  // Block unnecessary resources for faster loading
  ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    const url = details.url

    // Block analytics, ads, and tracking
    const blockPatterns = [
      'analytics',
      'ads.twitter',
      'syndication.twitter',
      'platform.twitter.com/embed',
      'google-analytics',
      'googletagmanager',
      'doubleclick',
      'facebook.com/tr',
      'cdn.branch.io'
    ]

    const shouldBlock = blockPatterns.some((pattern) => url.includes(pattern))

    callback({ cancel: shouldBlock })
  })

  // Show window when ready
  window.once('ready-to-show', () => {
    window.show()
  })

  // Load X (Twitter) - use mobile version for lighter weight
  window.loadURL('https://x.com')

  // Handle window close
  window.on('closed', () => {
    accountWindows.delete(accountId)
  })

  // Store window reference
  accountWindows.set(accountId, {
    accountId,
    window,
    partition
  })

  return window
}

export function closeAccountWindow(accountId: string): boolean {
  const accountWindow = accountWindows.get(accountId)
  if (accountWindow && !accountWindow.window.isDestroyed()) {
    accountWindow.window.close()
    return true
  }
  return false
}

export function getAccountWindow(accountId: string): BrowserWindow | null {
  const accountWindow = accountWindows.get(accountId)
  if (accountWindow && !accountWindow.window.isDestroyed()) {
    return accountWindow.window
  }
  return null
}

export function focusAccountWindow(accountId: string): boolean {
  const window = getAccountWindow(accountId)
  if (window) {
    if (window.isMinimized()) {
      window.restore()
    }
    window.focus()
    return true
  }
  return false
}

export function getAllAccountWindows(): { accountId: string; title: string }[] {
  const result: { accountId: string; title: string }[] = []
  accountWindows.forEach((aw, accountId) => {
    if (!aw.window.isDestroyed()) {
      result.push({
        accountId,
        title: aw.window.getTitle()
      })
    }
  })
  return result
}

export function closeAllAccountWindows(): void {
  accountWindows.forEach((aw) => {
    if (!aw.window.isDestroyed()) {
      aw.window.close()
    }
  })
  accountWindows.clear()
}

export async function clearAccountSession(accountId: string): Promise<void> {
  const partition = getPartitionForAccount(accountId)
  const ses = session.fromPartition(partition)

  await ses.clearStorageData()
  await ses.clearCache()
  await ses.clearAuthCache()
}
