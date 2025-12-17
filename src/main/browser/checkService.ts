import { BrowserWindow, session } from 'electron'
import { getPartitionForAccount } from './sessionManager'
import { getAccountById, updateAccount } from '../database/accountRepository'
import type { AccountStatus, SearchBanStatus } from '../../shared/types'

interface CheckResult {
  accountId: string
  username: string
  status: AccountStatus
  searchBanStatus: SearchBanStatus
  isLoggedIn: boolean
  error?: string
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

async function checkAccountStatus(accountId: string): Promise<CheckResult> {
  const account = getAccountById(accountId)
  if (!account) {
    return {
      accountId,
      username: 'Unknown',
      status: 'normal',
      searchBanStatus: 'none',
      isLoggedIn: false,
      error: 'Account not found'
    }
  }

  const partition = getPartitionForAccount(accountId)
  const ses = session.fromPartition(partition, { cache: true })

  // Check login status
  const cookies = await ses.cookies.get({ domain: '.x.com' })
  const authCookie = cookies.find((c) => c.name === 'auth_token' || c.name === 'ct0')
  const isLoggedIn = !!authCookie

  if (!isLoggedIn) {
    return {
      accountId,
      username: account.username,
      status: 'normal',
      searchBanStatus: 'none',
      isLoggedIn: false
    }
  }

  // Create hidden window for checking
  const checkWindow = new BrowserWindow({
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
    // Check profile page for account status
    await checkWindow.loadURL(`https://x.com/${account.username}`)
    await delay(3000)

    const statusResult = await checkWindow.webContents.executeJavaScript(`
      (async () => {
        // Check for suspension
        const suspendedText = document.body.innerText;
        if (suspendedText.includes('Account suspended') ||
            suspendedText.includes('アカウントは凍結されています') ||
            suspendedText.includes('This account has been suspended')) {
          return { status: 'suspended' };
        }

        // Check for locked account
        if (suspendedText.includes('locked') ||
            suspendedText.includes('ロックされています')) {
          return { status: 'locked' };
        }

        // Check if profile loads normally
        const profileHeader = document.querySelector('[data-testid="UserName"]');
        if (profileHeader) {
          return { status: 'normal' };
        }

        // If we can't determine, assume normal
        return { status: 'normal' };
      })()
    `)

    // Check for search ban (shadowban)
    let searchBanStatus: SearchBanStatus = 'none'

    // Load search page to check if tweets appear
    await checkWindow.loadURL(`https://x.com/search?q=from%3A${account.username}&src=typed_query&f=live`)
    await delay(3000)

    const searchResult = await checkWindow.webContents.executeJavaScript(`
      (async () => {
        await new Promise(r => setTimeout(r, 2000));

        const noResults = document.body.innerText;

        // Check for "No results" message
        if (noResults.includes('No results for') ||
            noResults.includes('検索結果はありません') ||
            noResults.includes('見つかりませんでした')) {
          return { searchBan: 'search' };
        }

        // Check if tweets are shown
        const tweets = document.querySelectorAll('[data-testid="tweet"]');
        if (tweets.length === 0) {
          return { searchBan: 'search' };
        }

        return { searchBan: 'none' };
      })()
    `)

    if (searchResult.searchBan === 'search') {
      searchBanStatus = 'search'
    }

    // Update account in database
    const newStatus = statusResult.status as AccountStatus
    updateAccount(accountId, {
      status: newStatus,
      searchBanStatus,
      lastCheckedAt: Date.now()
    })

    return {
      accountId,
      username: account.username,
      status: newStatus,
      searchBanStatus,
      isLoggedIn: true
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      accountId,
      username: account.username,
      status: 'normal',
      searchBanStatus: 'none',
      isLoggedIn,
      error: errorMessage
    }
  } finally {
    if (!checkWindow.isDestroyed()) {
      checkWindow.destroy()
    }
  }
}

export async function checkMultipleAccounts(
  accountIds: string[],
  onProgress?: (completed: number, total: number, result: CheckResult) => void
): Promise<CheckResult[]> {
  const results: CheckResult[] = []
  const total = accountIds.length

  for (let i = 0; i < accountIds.length; i++) {
    const accountId = accountIds[i]
    const result = await checkAccountStatus(accountId)
    results.push(result)

    if (onProgress) {
      onProgress(i + 1, total, result)
    }

    // Small delay between checks
    if (i < accountIds.length - 1) {
      await delay(1000)
    }
  }

  return results
}

export async function checkSingleAccount(accountId: string): Promise<CheckResult> {
  return checkAccountStatus(accountId)
}
