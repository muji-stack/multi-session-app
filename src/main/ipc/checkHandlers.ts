import { ipcMain } from 'electron'
import { checkMultipleAccounts, checkSingleAccount } from '../browser/checkService'
import { checkAllShadowBans, checkMultipleShadowBans } from '../services/shadowBanChecker'
import * as accountRepo from '../database/accountRepository'

export function registerCheckHandlers(): void {
  ipcMain.handle('check:single', async (_event, accountId: string) => {
    return checkSingleAccount(accountId)
  })

  ipcMain.handle('check:multiple', async (event, accountIds: string[]) => {
    const results = await checkMultipleAccounts(accountIds, (completed, total, result) => {
      event.sender.send('check:progress', { completed, total, result })
    })
    return results
  })

  // Shadow ban check for single account
  ipcMain.handle('check:shadowBan', async (event, accountId: string) => {
    const account = accountRepo.getAccountById(accountId)
    if (!account) {
      return {
        accountId,
        username: '',
        searchSuggestion: false,
        searchTop: false,
        searchLatest: false,
        ghostBan: 'unknown',
        checkedAt: Date.now(),
        overallStatus: 'error',
        error: 'Account not found'
      }
    }

    const result = await checkAllShadowBans(
      accountId,
      account.username,
      (step) => {
        event.sender.send('check:shadowBanProgress', {
          step,
          completed: 0,
          total: 1,
          currentAccount: account.username
        })
      }
    )

    return result
  })

  // Shadow ban check for multiple accounts
  ipcMain.handle('check:shadowBanMultiple', async (event, accountIds: string[]) => {
    const accounts = accountIds
      .map((id) => {
        const account = accountRepo.getAccountById(id)
        return account ? { id, username: account.username } : null
      })
      .filter((a): a is { id: string; username: string } => a !== null)

    if (accounts.length === 0) {
      return []
    }

    const results = await checkMultipleShadowBans(
      accounts,
      (completed, total, current, step) => {
        event.sender.send('check:shadowBanProgress', {
          step,
          completed,
          total,
          currentAccount: current
        })
      }
    )

    return results
  })
}
