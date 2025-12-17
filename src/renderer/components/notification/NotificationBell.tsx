import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useNotificationStore } from '../../stores/notificationStore'
import NotificationCenter from './NotificationCenter'

function NotificationBell(): JSX.Element {
  const { unreadCount, fetchUnreadCount, setupListeners } = useNotificationStore()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchUnreadCount()
    const cleanup = setupListeners()
    return cleanup
  }, [fetchUnreadCount, setupListeners])

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-medium bg-red-500 text-white rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationCenter isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  )
}

export default NotificationBell
