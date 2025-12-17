import { ipcMain } from 'electron'
import { executeBulkEngagement } from '../browser/engagementService'
import type { ActionType } from '../../shared/types'

interface BulkEngagementParams {
  accountIds: string[]
  targetUrl: string
  actionType: ActionType
  delayBetweenActions?: number
}

export function registerEngagementHandlers(): void {
  ipcMain.handle('engagement:executeBulk', async (event, params: BulkEngagementParams) => {
    const { accountIds, targetUrl, actionType, delayBetweenActions } = params

    const results = await executeBulkEngagement(
      accountIds,
      targetUrl,
      actionType,
      delayBetweenActions,
      (completed, total, result) => {
        event.sender.send('engagement:progress', { completed, total, result })
      }
    )

    return results
  })
}
