import { ipcMain, BrowserWindow, Notification } from 'electron'
import * as notificationRepo from '../database/notificationRepository'
import type { NotificationType, NotificationCategory, NotificationPriority } from '../../shared/types'

export function registerNotificationHandlers(): void {
  // Get all notifications
  ipcMain.handle('notification:getAll', async (_event, includeArchived?: boolean) => {
    return notificationRepo.getAllNotifications(includeArchived ?? false)
  })

  // Get unread notifications
  ipcMain.handle('notification:getUnread', async () => {
    return notificationRepo.getUnreadNotifications()
  })

  // Get notifications by category
  ipcMain.handle('notification:getByCategory', async (_event, category: NotificationCategory) => {
    return notificationRepo.getNotificationsByCategory(category)
  })

  // Get notifications by account
  ipcMain.handle('notification:getByAccount', async (_event, accountId: string) => {
    return notificationRepo.getNotificationsByAccount(accountId)
  })

  // Get notification by ID
  ipcMain.handle('notification:getById', async (_event, id: string) => {
    return notificationRepo.getNotificationById(id)
  })

  // Create notification
  ipcMain.handle(
    'notification:create',
    async (
      _event,
      input: {
        type: NotificationType
        category: NotificationCategory
        title: string
        message: string
        accountId?: string | null
        actionUrl?: string | null
        priority?: NotificationPriority
      }
    ) => {
      const notification = notificationRepo.createNotification(input)

      // Send to all renderer windows
      const windows = BrowserWindow.getAllWindows()
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send('notification:new', notification)
        }
      })

      // Show desktop notification if enabled
      const settings = notificationRepo.getOrCreateNotificationSettings()
      if (settings.enableDesktopNotifications && shouldShowNotification(settings, notification.category, notification.priority)) {
        showDesktopNotification(notification.title, notification.message, settings.showPreview)
      }

      return notification
    }
  )

  // Mark as read
  ipcMain.handle('notification:markAsRead', async (_event, id: string) => {
    const result = notificationRepo.markAsRead(id)
    if (result) {
      broadcastUnreadCount()
    }
    return result
  })

  // Mark all as read
  ipcMain.handle('notification:markAllAsRead', async () => {
    const count = notificationRepo.markAllAsRead()
    if (count > 0) {
      broadcastUnreadCount()
    }
    return count
  })

  // Mark as archived
  ipcMain.handle('notification:archive', async (_event, id: string) => {
    const result = notificationRepo.markAsArchived(id)
    if (result) {
      broadcastUnreadCount()
    }
    return result
  })

  // Archive all read
  ipcMain.handle('notification:archiveAllRead', async () => {
    return notificationRepo.archiveAllRead()
  })

  // Delete notification
  ipcMain.handle('notification:delete', async (_event, id: string) => {
    const result = notificationRepo.deleteNotification(id)
    if (result) {
      broadcastUnreadCount()
    }
    return result
  })

  // Delete all archived
  ipcMain.handle('notification:deleteAllArchived', async () => {
    return notificationRepo.deleteAllArchived()
  })

  // Delete old notifications
  ipcMain.handle('notification:deleteOld', async (_event, olderThanDays: number) => {
    return notificationRepo.deleteOldNotifications(olderThanDays)
  })

  // Get stats
  ipcMain.handle('notification:getStats', async () => {
    return notificationRepo.getNotificationStats()
  })

  // Get unread count
  ipcMain.handle('notification:getUnreadCount', async () => {
    return notificationRepo.getUnreadCount()
  })

  // Get settings
  ipcMain.handle('notification:getSettings', async () => {
    return notificationRepo.getOrCreateNotificationSettings()
  })

  // Update settings
  ipcMain.handle(
    'notification:updateSettings',
    async (
      _event,
      updates: {
        enableDesktopNotifications?: boolean
        enableSoundNotifications?: boolean
        enableInAppNotifications?: boolean
        soundVolume?: number
        showPreview?: boolean
        groupByCategory?: boolean
        autoMarkReadSeconds?: number | null
        quietHoursEnabled?: boolean
        quietHoursStart?: string | null
        quietHoursEnd?: string | null
        enabledCategories?: NotificationCategory[]
        enabledPriorities?: NotificationPriority[]
      }
    ) => {
      return notificationRepo.updateNotificationSettings(updates)
    }
  )
}

function broadcastUnreadCount(): void {
  const count = notificationRepo.getUnreadCount()
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send('notification:unreadCountChanged', count)
    }
  })
}

function shouldShowNotification(
  settings: ReturnType<typeof notificationRepo.getOrCreateNotificationSettings>,
  category: NotificationCategory,
  priority: NotificationPriority
): boolean {
  // Check if category is enabled
  if (!settings.enabledCategories.includes(category)) {
    return false
  }

  // Check if priority is enabled
  if (!settings.enabledPriorities.includes(priority)) {
    return false
  }

  // Check quiet hours
  if (settings.quietHoursEnabled && settings.quietHoursStart && settings.quietHoursEnd) {
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    if (settings.quietHoursStart <= settings.quietHoursEnd) {
      // Simple case: quiet hours don't span midnight
      if (currentTime >= settings.quietHoursStart && currentTime <= settings.quietHoursEnd) {
        return false
      }
    } else {
      // Quiet hours span midnight
      if (currentTime >= settings.quietHoursStart || currentTime <= settings.quietHoursEnd) {
        return false
      }
    }
  }

  return true
}

function showDesktopNotification(title: string, body: string, showPreview: boolean): void {
  if (!Notification.isSupported()) {
    return
  }

  const notification = new Notification({
    title,
    body: showPreview ? body : 'タップして確認',
    silent: false
  })

  notification.on('click', () => {
    // Focus the main window when notification is clicked
    const windows = BrowserWindow.getAllWindows()
    const mainWindow = windows[0]
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
    }
  })

  notification.show()
}

// Export function for use by other modules
export function sendNotification(input: {
  type: NotificationType
  category: NotificationCategory
  title: string
  message: string
  accountId?: string | null
  actionUrl?: string | null
  priority?: NotificationPriority
}): void {
  const notification = notificationRepo.createNotification(input)

  // Send to all renderer windows
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send('notification:new', notification)
    }
  })

  // Show desktop notification if enabled
  const settings = notificationRepo.getOrCreateNotificationSettings()
  if (settings.enableDesktopNotifications && shouldShowNotification(settings, notification.category, notification.priority)) {
    showDesktopNotification(notification.title, notification.message, settings.showPreview)
  }
}
