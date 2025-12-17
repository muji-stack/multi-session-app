import { ipcMain } from 'electron'
import {
  getAllScheduledPosts,
  getScheduledPostById,
  getScheduledPostsByAccount,
  getScheduledPostsByStatus,
  getUpcomingScheduledPosts,
  createScheduledPost,
  updateScheduledPost,
  deleteScheduledPost,
  cancelScheduledPost,
  getScheduledPostsInRange,
  getScheduledPostStats
} from '../database/scheduledPostRepository'
import type { ScheduledPostStatus } from '../../shared/types'

export function registerScheduledPostHandlers(): void {
  // Get all scheduled posts
  ipcMain.handle('scheduledPost:getAll', () => {
    return getAllScheduledPosts()
  })

  // Get scheduled post by ID
  ipcMain.handle('scheduledPost:getById', (_event, id: string) => {
    return getScheduledPostById(id)
  })

  // Get scheduled posts by account
  ipcMain.handle('scheduledPost:getByAccount', (_event, accountId: string) => {
    return getScheduledPostsByAccount(accountId)
  })

  // Get scheduled posts by status
  ipcMain.handle('scheduledPost:getByStatus', (_event, status: ScheduledPostStatus) => {
    return getScheduledPostsByStatus(status)
  })

  // Get upcoming scheduled posts
  ipcMain.handle('scheduledPost:getUpcoming', (_event, limit?: number) => {
    return getUpcomingScheduledPosts(limit)
  })

  // Create scheduled post
  ipcMain.handle(
    'scheduledPost:create',
    (
      _event,
      input: {
        accountId: string
        content: string
        mediaIds?: string[]
        scheduledAt: number
      }
    ) => {
      return createScheduledPost(input)
    }
  )

  // Update scheduled post
  ipcMain.handle(
    'scheduledPost:update',
    (
      _event,
      id: string,
      updates: {
        content?: string
        mediaIds?: string[] | null
        scheduledAt?: number
      }
    ) => {
      return updateScheduledPost(id, updates)
    }
  )

  // Delete scheduled post
  ipcMain.handle('scheduledPost:delete', (_event, id: string) => {
    return deleteScheduledPost(id)
  })

  // Cancel scheduled post
  ipcMain.handle('scheduledPost:cancel', (_event, id: string) => {
    return cancelScheduledPost(id)
  })

  // Get scheduled posts in date range
  ipcMain.handle(
    'scheduledPost:getInRange',
    (_event, startTime: number, endTime: number) => {
      return getScheduledPostsInRange(startTime, endTime)
    }
  )

  // Get stats
  ipcMain.handle('scheduledPost:getStats', () => {
    return getScheduledPostStats()
  })
}
