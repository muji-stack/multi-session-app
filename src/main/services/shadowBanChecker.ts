import { BrowserWindow, session } from 'electron'
import type {
  ShadowBanResult,
  GhostBanStatus,
  ShadowBanOverallStatus
} from '../../shared/types'

const SHADOW_BAN_PARTITION = 'persist:shadowban-checker'
const CHECK_TIMEOUT = 15000 // 15 seconds per check
const PAGE_LOAD_TIMEOUT = 10000

// Helper to delay execution
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Clear session cookies for fresh state
async function clearCheckerSession(): Promise<void> {
  const ses = session.fromPartition(SHADOW_BAN_PARTITION)
  await ses.clearStorageData({
    storages: ['cookies', 'localstorage', 'sessionstorage', 'cachestorage']
  })
}

// Create a hidden browser window for checking
function createCheckerWindow(): BrowserWindow {
  return new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      partition: SHADOW_BAN_PARTITION,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
}

// Wait for page to load with timeout
async function waitForPageLoad(win: BrowserWindow, timeout: number = PAGE_LOAD_TIMEOUT): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Page load timeout'))
    }, timeout)

    win.webContents.once('did-finish-load', () => {
      clearTimeout(timeoutId)
      resolve()
    })

    win.webContents.once('did-fail-load', (_event, errorCode, errorDescription) => {
      clearTimeout(timeoutId)
      reject(new Error(`Page load failed: ${errorDescription} (${errorCode})`))
    })
  })
}

// Check if user appears in search suggestions
export async function checkSearchSuggestionBan(
  win: BrowserWindow,
  username: string
): Promise<boolean> {
  try {
    // Navigate to search page
    await win.loadURL('https://x.com/search')
    await delay(2000) // Wait for page to stabilize

    // Type username in search box and check autocomplete
    const result = await win.webContents.executeJavaScript(`
      (async () => {
        const searchInput = document.querySelector('input[data-testid="SearchBox_Search_Input"]');
        if (!searchInput) {
          // Try alternative selector
          const altInput = document.querySelector('input[placeholder*="検索"]') ||
                          document.querySelector('input[placeholder*="Search"]');
          if (!altInput) return { found: false, error: 'Search input not found' };
        }

        const input = searchInput || document.querySelector('input[placeholder*="検索"]') ||
                      document.querySelector('input[placeholder*="Search"]');

        // Focus and type
        input.focus();
        input.value = '@${username}';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        // Wait for autocomplete
        await new Promise(r => setTimeout(r, 2000));

        // Check for user in suggestions
        const suggestions = document.querySelectorAll('[data-testid="typeaheadResult"]');
        let found = false;

        suggestions.forEach(s => {
          const text = s.textContent.toLowerCase();
          if (text.includes('${username.toLowerCase()}')) {
            found = true;
          }
        });

        // Also check for direct user card
        const userCards = document.querySelectorAll('[data-testid="UserCell"]');
        userCards.forEach(card => {
          const text = card.textContent.toLowerCase();
          if (text.includes('${username.toLowerCase()}')) {
            found = true;
          }
        });

        return { found };
      })()
    `, true)

    return result.found === true
  } catch (error) {
    console.error('Search suggestion check error:', error)
    return false
  }
}

// Check if user's posts appear in search results
export async function checkSearchBan(
  win: BrowserWindow,
  username: string,
  tab: 'top' | 'latest'
): Promise<boolean> {
  try {
    const url = tab === 'latest'
      ? `https://x.com/search?q=from%3A${username}&src=typed_query&f=live`
      : `https://x.com/search?q=from%3A${username}&src=typed_query`

    await win.loadURL(url)
    await delay(3000) // Wait for search results to load

    const result = await win.webContents.executeJavaScript(`
      (async () => {
        // Wait a bit more for dynamic content
        await new Promise(r => setTimeout(r, 2000));

        // Check for tweets in the timeline
        const tweets = document.querySelectorAll('[data-testid="tweet"]');

        if (tweets.length > 0) {
          return { found: true, count: tweets.length };
        }

        // Check for "no results" message
        const noResults = document.querySelector('[data-testid="emptyState"]');
        if (noResults) {
          return { found: false, noResults: true };
        }

        // Check for cell inner divs (alternative tweet containers)
        const cells = document.querySelectorAll('[data-testid="cellInnerDiv"]');
        let hasTweets = false;
        cells.forEach(cell => {
          if (cell.querySelector('article')) {
            hasTweets = true;
          }
        });

        return { found: hasTweets, count: cells.length };
      })()
    `, true)

    return result.found === true
  } catch (error) {
    console.error(`Search ${tab} check error:`, error)
    return false
  }
}

// Check for ghost ban by examining reply visibility
export async function checkGhostBan(
  win: BrowserWindow,
  username: string
): Promise<GhostBanStatus> {
  try {
    // First, get the user's recent replies
    const profileUrl = `https://x.com/${username}/with_replies`
    await win.loadURL(profileUrl)
    await delay(3000)

    // Find a reply and get the parent post URL
    const replyInfo = await win.webContents.executeJavaScript(`
      (async () => {
        await new Promise(r => setTimeout(r, 2000));

        // Look for reply tweets (tweets that are replies to other tweets)
        const tweets = document.querySelectorAll('[data-testid="tweet"]');

        for (const tweet of tweets) {
          // Check if this is a reply
          const replyContext = tweet.querySelector('[data-testid="socialContext"]');
          if (replyContext && replyContext.textContent.includes('返信') ||
              replyContext && replyContext.textContent.includes('Replying')) {

            // Find the link to the parent tweet
            const links = tweet.querySelectorAll('a[href*="/status/"]');
            for (const link of links) {
              const href = link.getAttribute('href');
              if (href && !href.includes('${username}')) {
                return {
                  found: true,
                  parentUrl: 'https://x.com' + href,
                  replyFound: true
                };
              }
            }
          }
        }

        return { found: false };
      })()
    `, true)

    if (!replyInfo.found) {
      // No replies found, can't check ghost ban
      return 'unknown'
    }

    // Now navigate to the parent post and check if the reply is visible
    await win.loadURL(replyInfo.parentUrl)
    await delay(3000)

    const visibilityResult = await win.webContents.executeJavaScript(`
      (async () => {
        await new Promise(r => setTimeout(r, 2000));

        // Check if the user's reply is directly visible
        const tweets = document.querySelectorAll('[data-testid="tweet"]');
        let directlyVisible = false;

        for (const tweet of tweets) {
          const text = tweet.textContent.toLowerCase();
          if (text.includes('@${username.toLowerCase()}') ||
              tweet.querySelector('a[href*="/${username}"]')) {
            directlyVisible = true;
            break;
          }
        }

        // Check for "Show more replies" button
        const showMoreButtons = document.querySelectorAll('[role="button"]');
        let hasShowMore = false;

        showMoreButtons.forEach(btn => {
          const text = btn.textContent.toLowerCase();
          if (text.includes('返信を表示') || text.includes('show') && text.includes('repl')) {
            hasShowMore = true;
          }
        });

        return {
          directlyVisible,
          hasShowMore
        };
      })()
    `, true)

    if (visibilityResult.directlyVisible) {
      return 'none'
    } else if (visibilityResult.hasShowMore) {
      return 'partial'
    } else {
      return 'full'
    }
  } catch (error) {
    console.error('Ghost ban check error:', error)
    return 'unknown'
  }
}

// Determine overall shadow ban status
function determineOverallStatus(
  searchSuggestion: boolean,
  searchTop: boolean,
  searchLatest: boolean,
  ghostBan: GhostBanStatus
): ShadowBanOverallStatus {
  const issues: string[] = []

  if (!searchSuggestion) issues.push('suggestion')
  if (!searchTop || !searchLatest) issues.push('search')
  if (ghostBan === 'partial' || ghostBan === 'full') issues.push('ghost')

  if (issues.length === 0) {
    return 'clean'
  } else if (issues.length >= 2) {
    return 'multiple'
  } else if (issues.includes('suggestion')) {
    return 'suggestion_ban'
  } else if (issues.includes('search')) {
    return 'search_ban'
  } else if (issues.includes('ghost')) {
    return 'ghost_ban'
  }

  return 'clean'
}

// Main function to check all shadow ban types
export async function checkAllShadowBans(
  accountId: string,
  username: string,
  onProgress?: (step: string) => void
): Promise<ShadowBanResult> {
  let win: BrowserWindow | null = null

  try {
    // Clear session for fresh state
    await clearCheckerSession()

    // Create checker window
    win = createCheckerWindow()

    onProgress?.('search_suggestion')
    const searchSuggestion = await checkSearchSuggestionBan(win, username)

    onProgress?.('search_top')
    const searchTop = await checkSearchBan(win, username, 'top')

    onProgress?.('search_latest')
    const searchLatest = await checkSearchBan(win, username, 'latest')

    onProgress?.('ghost_ban')
    const ghostBan = await checkGhostBan(win, username)

    onProgress?.('complete')

    const overallStatus = determineOverallStatus(
      searchSuggestion,
      searchTop,
      searchLatest,
      ghostBan
    )

    return {
      accountId,
      username,
      searchSuggestion,
      searchTop,
      searchLatest,
      ghostBan,
      checkedAt: Date.now(),
      overallStatus
    }
  } catch (error) {
    return {
      accountId,
      username,
      searchSuggestion: false,
      searchTop: false,
      searchLatest: false,
      ghostBan: 'unknown',
      checkedAt: Date.now(),
      overallStatus: 'error',
      error: (error as Error).message
    }
  } finally {
    if (win && !win.isDestroyed()) {
      win.close()
    }
  }
}

// Check multiple accounts
export async function checkMultipleShadowBans(
  accounts: { id: string; username: string }[],
  onProgress?: (completed: number, total: number, current: string, step: string) => void
): Promise<ShadowBanResult[]> {
  const results: ShadowBanResult[] = []

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i]
    onProgress?.(i, accounts.length, account.username, 'initializing')

    const result = await checkAllShadowBans(
      account.id,
      account.username,
      (step) => onProgress?.(i, accounts.length, account.username, step)
    )

    results.push(result)

    // Small delay between accounts to avoid rate limiting
    if (i < accounts.length - 1) {
      await delay(2000)
    }
  }

  return results
}
