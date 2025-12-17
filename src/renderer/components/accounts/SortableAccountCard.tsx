import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MoreVertical, ExternalLink, Trash2, Edit2, CheckCircle, AlertTriangle, XCircle, HelpCircle, Square, CheckSquare } from 'lucide-react'
import { useState } from 'react'
import { useGroupStore } from '../../stores/groupStore'
import type { Account } from '../../../shared/types'

interface SortableAccountCardProps {
  account: Account
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onOpenBrowser: () => void
  isMultiSelectMode?: boolean
  isChecked?: boolean
  onToggleCheck?: () => void
}

const statusConfig = {
  normal: { icon: CheckCircle, color: 'text-success', label: '正常' },
  locked: { icon: AlertTriangle, color: 'text-warning', label: 'ロック' },
  suspended: { icon: XCircle, color: 'text-error', label: '凍結' },
  unknown: { icon: HelpCircle, color: 'text-gray-400', label: '不明' }
}

function SortableAccountCard({
  account,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onOpenBrowser,
  isMultiSelectMode = false,
  isChecked = false,
  onToggleCheck
}: SortableAccountCardProps): JSX.Element {
  const [showMenu, setShowMenu] = useState(false)
  const [imageError, setImageError] = useState(false)
  const { getGroupById } = useGroupStore()
  const group = account.groupId ? getGroupById(account.groupId) : null

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: account.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto'
  }

  const status = statusConfig[account.status] || statusConfig.unknown
  const StatusIcon = status.icon

  const handleCardClick = (): void => {
    if (isMultiSelectMode && onToggleCheck) {
      onToggleCheck()
    } else {
      onSelect()
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleCardClick}
      className={`relative bg-surface-dark rounded-xl p-4 border transition-all cursor-pointer ${
        isDragging ? 'shadow-2xl ring-2 ring-primary' : ''
      } ${isChecked ? 'border-primary ring-1 ring-primary/50 bg-primary/5' : isSelected ? 'border-primary ring-1 ring-primary/50' : 'border-white/10 hover:border-primary/50'}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Drag Handle or Checkbox */}
        {isMultiSelectMode ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleCheck?.()
            }}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white"
          >
            {isChecked ? (
              <CheckSquare size={18} className="text-primary" />
            ) : (
              <Square size={18} />
            )}
          </button>
        ) : (
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-white cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical size={16} />
          </button>
        )}

        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden"
        >
          {account.profileImage && !imageError ? (
            <img
              src={account.profileImage}
              alt={account.username}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
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
                className="fixed inset-0 z-30"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                }}
              />
              <div className="absolute right-0 top-full mt-1 w-40 bg-surface-dark border border-white/10 rounded-xl shadow-lg z-40 py-1 animate-scale-in">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    onOpenBrowser()
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"
                >
                  <ExternalLink size={14} />
                  ブラウザを開く
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    onEdit()
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"
                >
                  <Edit2 size={14} />
                  編集
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    onDelete()
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
      <div className="mt-3 ml-9 flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${status.color} bg-current/10`}>
          {status.label}
        </span>
        {group && (
          <span
            className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ backgroundColor: `${group.color}20`, color: group.color }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: group.color }}
            />
            {group.name}
          </span>
        )}
        {account.memo && (
          <span className="text-xs text-gray-500 truncate">{account.memo}</span>
        )}
      </div>
    </div>
  )
}

export default SortableAccountCard
