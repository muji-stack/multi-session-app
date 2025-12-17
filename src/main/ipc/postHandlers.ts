import { ipcMain } from 'electron'
import {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getRecentActionLogs,
  getActionLogsByAccountId,
  getActionStats,
  getActionStatsByType,
  getDailyStats,
  getAccountActionStats
} from '../database/postRepository'
import { executeBulkPost, checkAccountLoginStatus } from '../browser/postService'

interface BulkPostParams {
  accountIds: string[]
  content: string
  delayBetweenPosts?: number
}

export function registerPostHandlers(): void {
  // Template handlers
  ipcMain.handle('post:getTemplates', () => {
    return getAllTemplates()
  })

  ipcMain.handle('post:getTemplateById', (_event, id: string) => {
    return getTemplateById(id)
  })

  ipcMain.handle('post:createTemplate', (_event, name: string, content: string, imageCategory?: string) => {
    return createTemplate(name, content, imageCategory)
  })

  ipcMain.handle('post:updateTemplate', (_event, id: string, updates: { name?: string; content?: string; imageCategory?: string | null }) => {
    const template = getTemplateById(id)
    if (!template) return null
    return updateTemplate(
      id,
      updates.name ?? template.name,
      updates.content ?? template.content,
      updates.imageCategory
    )
  })

  ipcMain.handle('post:deleteTemplate', (_event, id: string) => {
    return deleteTemplate(id)
  })

  // Action log handlers
  ipcMain.handle('post:getActionLogs', (_event, limit?: number) => {
    return getRecentActionLogs(limit)
  })

  ipcMain.handle('post:getActionLogsByAccount', (_event, accountId: string) => {
    return getActionLogsByAccountId(accountId)
  })

  // Bulk post handler
  ipcMain.handle('post:executeBulk', async (event, params: BulkPostParams) => {
    const { accountIds, content, delayBetweenPosts } = params

    const results = await executeBulkPost(
      accountIds,
      content,
      delayBetweenPosts,
      (completed, total, result) => {
        // Send progress to renderer
        event.sender.send('post:progress', { completed, total, result })
      }
    )

    return results
  })

  // Check login status
  ipcMain.handle('post:checkLoginStatus', async (_event, accountId: string) => {
    return checkAccountLoginStatus(accountId)
  })

  // Check multiple accounts login status
  ipcMain.handle('post:checkMultipleLoginStatus', async (_event, accountIds: string[]) => {
    const results: { accountId: string; loggedIn: boolean }[] = []

    for (const accountId of accountIds) {
      const loggedIn = await checkAccountLoginStatus(accountId)
      results.push({ accountId, loggedIn })
    }

    return results
  })

  // Analytics handlers
  ipcMain.handle('analytics:getActionStats', () => {
    return getActionStats()
  })

  ipcMain.handle('analytics:getActionStatsByType', () => {
    return getActionStatsByType()
  })

  ipcMain.handle('analytics:getDailyStats', (_event, days?: number) => {
    return getDailyStats(days)
  })

  ipcMain.handle('analytics:getAccountActionStats', (_event, limit?: number) => {
    return getAccountActionStats(limit)
  })
}
