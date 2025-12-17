import { ipcMain } from 'electron'
import {
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountStats,
  updateAccountSortOrders,
  type CreateAccountInput,
  type UpdateAccountInput
} from '../database/accountRepository'

export function registerAccountHandlers(): void {
  ipcMain.handle('account:getAll', () => {
    return getAllAccounts()
  })

  ipcMain.handle('account:getById', (_event, id: string) => {
    return getAccountById(id)
  })

  ipcMain.handle('account:create', (_event, input: CreateAccountInput) => {
    return createAccount(input)
  })

  ipcMain.handle('account:update', (_event, id: string, input: UpdateAccountInput) => {
    return updateAccount(id, input)
  })

  ipcMain.handle('account:delete', (_event, id: string) => {
    return deleteAccount(id)
  })

  ipcMain.handle('account:getStats', () => {
    return getAccountStats()
  })

  ipcMain.handle('account:updateSortOrders', (_event, orders: { id: string; sortOrder: number }[]) => {
    updateAccountSortOrders(orders)
    return true
  })
}
