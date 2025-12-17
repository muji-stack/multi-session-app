import { ipcMain } from 'electron'
import {
  createAccountWindow,
  closeAccountWindow,
  focusAccountWindow,
  getAllAccountWindows,
  clearAccountSession
} from '../browser/sessionManager'
import { getAccountById } from '../database/accountRepository'
import { getProxyById } from '../database/proxyRepository'

export function registerBrowserHandlers(): void {
  ipcMain.handle('browser:open', async (_event, accountId: string) => {
    const account = getAccountById(accountId)
    if (!account) {
      throw new Error('Account not found')
    }

    // Get proxy if assigned
    const proxy = account.proxyId ? getProxyById(account.proxyId) : null

    const window = createAccountWindow(accountId, account.username, proxy)
    return {
      success: true,
      windowId: window.id
    }
  })

  ipcMain.handle('browser:close', (_event, accountId: string) => {
    return closeAccountWindow(accountId)
  })

  ipcMain.handle('browser:focus', (_event, accountId: string) => {
    return focusAccountWindow(accountId)
  })

  ipcMain.handle('browser:getAll', () => {
    return getAllAccountWindows()
  })

  ipcMain.handle('browser:clearSession', async (_event, accountId: string) => {
    await clearAccountSession(accountId)
    return true
  })
}
