import { ipcMain } from 'electron'
import {
  getAllGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  updateGroupSortOrders,
  getGroupStats
} from '../database/groupRepository'

export function registerGroupHandlers(): void {
  ipcMain.handle('group:getAll', () => {
    return getAllGroups()
  })

  ipcMain.handle('group:getById', (_event, id: string) => {
    return getGroupById(id)
  })

  ipcMain.handle('group:create', (_event, name: string, color?: string) => {
    return createGroup(name, color)
  })

  ipcMain.handle('group:update', (_event, id: string, updates: { name?: string; color?: string }) => {
    return updateGroup(id, updates)
  })

  ipcMain.handle('group:delete', (_event, id: string) => {
    return deleteGroup(id)
  })

  ipcMain.handle('group:updateSortOrders', (_event, orders: { id: string; sortOrder: number }[]) => {
    return updateGroupSortOrders(orders)
  })

  ipcMain.handle('group:getStats', () => {
    return getGroupStats()
  })
}
