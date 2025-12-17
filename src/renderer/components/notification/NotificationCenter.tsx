import { useState, useEffect, useRef } from 'react'
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Archive,
  Trash2,
  User,
  Send,
  Zap,
  GitBranch,
  Settings,
  Shield,
  AlertTriangle,
  Info,
  AlertCircle,
  ChevronDown
} from 'lucide-react'
import { Button } from '../ui'
import { useNotificationStore } from '../../stores/notificationStore'
import type { AppNotification, NotificationCategory, NotificationPriority } from '../../../shared/types'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

function NotificationCenter({ isOpen, onClose }: NotificationCenterProps): JSX.Element | null {
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    archive,
    archiveAllRead,
    deleteNotification,
    setupListeners,
    initialize
  } = useNotificationStore()

  const [filter, setFilter] = useState<NotificationCategory | 'all'>('all')
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    initialize()
    const cleanup = setupListeners()
    return cleanup
  }, [initialize, setupListeners])

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen, fetchNotifications])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter((n) => n.category === filter)

  const getCategoryIcon = (category: NotificationCategory): JSX.Element => {
    switch (category) {
      case 'account':
        return <User size={14} />
      case 'post':
        return <Send size={14} />
      case 'automation':
        return <Zap size={14} />
      case 'workflow':
        return <GitBranch size={14} />
      case 'system':
        return <Settings size={14} />
      case 'security':
        return <Shield size={14} />
    }
  }

  const getPriorityColor = (priority: NotificationPriority): string => {
    switch (priority) {
      case 'urgent':
        return 'text-red-400'
      case 'high':
        return 'text-orange-400'
      case 'normal':
        return 'text-blue-400'
      case 'low':
        return 'text-gray-400'
    }
  }

  const getPriorityIcon = (priority: NotificationPriority): JSX.Element => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle size={14} className="text-red-400" />
      case 'high':
        return <AlertTriangle size={14} className="text-orange-400" />
      case 'normal':
        return <Info size={14} className="text-blue-400" />
      case 'low':
        return <Info size={14} className="text-gray-400" />
    }
  }

  const formatTime = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'たった今'
    if (minutes < 60) return `${minutes}分前`
    if (hours < 24) return `${hours}時間前`
    if (days < 7) return `${days}日前`

    return new Date(timestamp).toLocaleDateString('ja-JP')
  }

  const handleNotificationClick = async (notification: AppNotification): Promise<void> => {
    if (!notification.isRead) {
      await markAsRead(notification.id)
    }
    if (notification.actionUrl) {
      // Navigate to the action URL if it exists
      // This would require react-router navigation
    }
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-96 bg-surface-dark rounded-xl border border-white/10 shadow-xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-primary" />
          <h3 className="text-white font-medium">通知</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-primary rounded-full text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead()}
              title="すべて既読にする"
            >
              <CheckCheck size={16} />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 p-3 border-b border-white/10 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
            filter === 'all'
              ? 'bg-primary text-white'
              : 'bg-white/5 text-gray-400 hover:text-white'
          }`}
        >
          すべて
        </button>
        {(['account', 'post', 'automation', 'workflow', 'system', 'security'] as NotificationCategory[]).map((category) => (
          <button
            key={category}
            onClick={() => setFilter(category)}
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors flex items-center gap-1 ${
              filter === category
                ? 'bg-primary text-white'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            {getCategoryIcon(category)}
            {category === 'account' && 'アカウント'}
            {category === 'post' && '投稿'}
            {category === 'automation' && '自動化'}
            {category === 'workflow' && 'ワークフロー'}
            {category === 'system' && 'システム'}
            {category === 'security' && 'セキュリティ'}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">
            読み込み中...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Bell size={32} className="mx-auto mb-2 opacity-50" />
            <p>通知はありません</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 hover:bg-white/5 cursor-pointer transition-colors ${
                  !notification.isRead ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 ${getPriorityColor(notification.priority)}`}>
                    {getPriorityIcon(notification.priority)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium text-sm truncate">
                        {notification.title}
                      </span>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-gray-400 text-xs line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        {getCategoryIcon(notification.category)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!notification.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          markAsRead(notification.id)
                        }}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                        title="既読にする"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        archive(notification.id)
                      }}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                      title="アーカイブ"
                    >
                      <Archive size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(notification.id)
                      }}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      title="削除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredNotifications.length > 0 && (
        <div className="p-3 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={() => archiveAllRead()}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            既読をアーカイブ
          </button>
          <button
            onClick={() => fetchNotifications(true)}
            className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            アーカイブを表示
            <ChevronDown size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

export default NotificationCenter
