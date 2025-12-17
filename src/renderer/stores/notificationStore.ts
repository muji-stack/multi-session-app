import { create } from 'zustand'
import type {
  AppNotification,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationSettings,
  NotificationStats
} from '../../shared/types'

interface NotificationState {
  notifications: AppNotification[]
  unreadCount: number
  settings: NotificationSettings | null
  stats: NotificationStats | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchNotifications: (includeArchived?: boolean) => Promise<void>
  fetchUnreadCount: () => Promise<void>
  fetchSettings: () => Promise<void>
  fetchStats: () => Promise<void>
  createNotification: (input: {
    type: NotificationType
    category: NotificationCategory
    title: string
    message: string
    accountId?: string | null
    actionUrl?: string | null
    priority?: NotificationPriority
  }) => Promise<AppNotification>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  archive: (id: string) => Promise<void>
  archiveAllRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  deleteAllArchived: () => Promise<void>
  updateSettings: (updates: Partial<NotificationSettings>) => Promise<void>
  addNotification: (notification: AppNotification) => void
  setupListeners: () => () => void
  initialize: () => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  settings: null,
  stats: null,
  isLoading: false,
  error: null,

  initialize: async () => {
    await Promise.all([
      get().fetchNotifications(),
      get().fetchUnreadCount(),
      get().fetchSettings(),
      get().fetchStats()
    ])
  },

  fetchNotifications: async (includeArchived = false) => {
    set({ isLoading: true, error: null })
    try {
      const notifications = (await window.api.notification.getAll(includeArchived)) as AppNotification[]
      set({ notifications, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchUnreadCount: async () => {
    try {
      const unreadCount = await window.api.notification.getUnreadCount()
      set({ unreadCount })
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  },

  fetchSettings: async () => {
    try {
      const settings = (await window.api.notification.getSettings()) as NotificationSettings
      set({ settings })
    } catch (error) {
      console.error('Failed to fetch notification settings:', error)
    }
  },

  fetchStats: async () => {
    try {
      const stats = (await window.api.notification.getStats()) as NotificationStats
      set({ stats })
    } catch (error) {
      console.error('Failed to fetch notification stats:', error)
    }
  },

  createNotification: async (input) => {
    const notification = (await window.api.notification.create(input)) as AppNotification
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    }))
    return notification
  },

  markAsRead: async (id: string) => {
    await window.api.notification.markAsRead(id)
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true, readAt: Date.now() } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1)
    }))
  },

  markAllAsRead: async () => {
    await window.api.notification.markAllAsRead()
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.isRead ? n : { ...n, isRead: true, readAt: Date.now() }
      ),
      unreadCount: 0
    }))
  },

  archive: async (id: string) => {
    await window.api.notification.archive(id)
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }))
  },

  archiveAllRead: async () => {
    await window.api.notification.archiveAllRead()
    set((state) => ({
      notifications: state.notifications.filter((n) => !n.isRead)
    }))
  },

  deleteNotification: async (id: string) => {
    const notification = get().notifications.find((n) => n.id === id)
    await window.api.notification.delete(id)
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
      unreadCount: notification && !notification.isRead
        ? Math.max(0, state.unreadCount - 1)
        : state.unreadCount
    }))
  },

  deleteAllArchived: async () => {
    await window.api.notification.deleteAllArchived()
    // No need to update state as archived items aren't shown by default
  },

  updateSettings: async (updates) => {
    const settings = (await window.api.notification.updateSettings(updates)) as NotificationSettings
    set({ settings })
  },

  addNotification: (notification: AppNotification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    }))
  },

  setupListeners: () => {
    const unsubNew = window.api.notification.onNew((notification) => {
      get().addNotification(notification as AppNotification)
    })

    const unsubCount = window.api.notification.onUnreadCountChanged((count) => {
      set({ unreadCount: count })
    })

    return () => {
      unsubNew()
      unsubCount()
    }
  }
}))
