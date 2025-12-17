import { MoreVertical, ExternalLink, Trash2, Edit2, CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react'
import { useState, memo, useCallback } from 'react'
import type { Account } from '../../../shared/types'

interface AccountCardProps {
  account: Account
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onOpenBrowser: () => void
}

const statusConfig = {
  normal: { icon: CheckCircle, color: 'text-success', label: '正常' },
  locked: { icon: AlertTriangle, color: 'text-warning', label: 'ロック' },
  suspended: { icon: XCircle, color: 'text-error', label: '凍結' },
  unknown: { icon: HelpCircle, color: 'text-gray-400', label: '不明' }
}

const AccountCard = memo(function AccountCard({
  account,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onOpenBrowser
}: AccountCardProps): JSX.Element {
  const [showMenu, setShowMenu] = useState(false)

  const status = statusConfig[account.status]
  const StatusIcon = status.icon

  return (
    <div
      onClick={onSelect}
      className={`relative bg-surface-dark rounded-xl p-4 border transition-all cursor-pointer hover:border-primary/50 ${
        isSelected ? 'border-primary ring-1 ring-primary/50' : 'border-white/10'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {account.profileImage ? (
            <img src={account.profileImage} alt={account.username} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-lg font-medium">
              {account.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium truncate">
              {account.displayName || account.username}
            </h3>
            <StatusIcon size={14} className={status.color} />
          </div>
          <p className="text-gray-400 text-sm truncate">@{account.username}</p>
        </div>

        {/* Menu Button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <MoreVertical size={16} />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                }}
              />
              <div className="absolute right-0 top-full mt-1 w-40 bg-surface-dark border border-white/10 rounded-xl shadow-lg z-50 py-1 animate-scale-in">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenBrowser()
                    setShowMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"
                >
                  <ExternalLink size={14} />
                  ブラウザを開く
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                    setShowMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"
                >
                  <Edit2 size={14} />
                  編集
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                    setShowMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-error hover:bg-error/10 flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  削除
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="mt-3 flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${status.color} bg-current/10`}>
          {status.label}
        </span>
        {account.memo && (
          <span className="text-xs text-gray-500 truncate">{account.memo}</span>
        )}
      </div>
    </div>
  )
})

export default AccountCard
