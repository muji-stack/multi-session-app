import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ExternalLink, Trash2, RefreshCw, Folder, History, Send, Heart, Repeat, UserPlus, CheckCircle, XCircle, Clock, Globe } from 'lucide-react'
import { Button, Input } from '../ui'
import { useGroupStore } from '../../stores/groupStore'
import { useProxyStore } from '../../stores/proxyStore'
import type { Account, AccountStatus, SearchBanStatus } from '../../../shared/types'

interface ActionLog {
  id: string
  actionType: string
  status: string
  targetUrl: string | null
  content: string | null
  errorMessage: string | null
  createdAt: number
}

interface EditAccountModalProps {
  isOpen: boolean
  account: Account | null
  onClose: () => void
  onSave: (id: string, data: { username?: string; memo?: string; groupId?: string | null; proxyId?: string | null }) => Promise<void>
  onDelete: (id: string) => void
  onOpenBrowser: (id: string) => void
  onClearSession: (id: string) => Promise<void>
}

const statusLabels: Record<AccountStatus, { label: string; color: string }> = {
  normal: { label: '正常', color: 'bg-green-500/20 text-green-400' },
  locked: { label: 'ロック', color: 'bg-yellow-500/20 text-yellow-400' },
  suspended: { label: '凍結', color: 'bg-red-500/20 text-red-400' },
  unknown: { label: '不明', color: 'bg-gray-500/20 text-gray-400' }
}

const searchBanLabels: Record<SearchBanStatus, { label: string; color: string }> = {
  visible: { label: '正常', color: 'bg-green-500/20 text-green-400' },
  hidden: { label: 'シャドウBAN', color: 'bg-orange-500/20 text-orange-400' },
  unknown: { label: '未チェック', color: 'bg-gray-500/20 text-gray-400' }
}

function EditAccountModal({
  isOpen,
  account,
  onClose,
  onSave,
  onDelete,
  onOpenBrowser,
  onClearSession
}: EditAccountModalProps): JSX.Element | null {
  const { groups, fetchGroups } = useGroupStore()
  const { proxies, fetchProxies } = useProxyStore()
  const [username, setUsername] = useState('')
  const [memo, setMemo] = useState('')
  const [groupId, setGroupId] = useState<string | null>(null)
  const [proxyId, setProxyId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isClearingSession, setIsClearingSession] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'activity'>('info')
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchGroups()
      fetchProxies()
      setActiveTab('info')
    }
  }, [isOpen, fetchGroups, fetchProxies])

  useEffect(() => {
    if (isOpen && account && activeTab === 'activity') {
      loadActionLogs()
    }
  }, [isOpen, account, activeTab])

  const loadActionLogs = async (): Promise<void> => {
    if (!account) return
    setIsLoadingLogs(true)
    try {
      const logs = await window.api.post.getActionLogsByAccount(account.id) as unknown as ActionLog[]
      setActionLogs(logs)
    } catch (error) {
      console.error('Failed to load action logs:', error)
    } finally {
      setIsLoadingLogs(false)
    }
  }

  const actionTypeConfig: Record<string, { label: string; icon: typeof Send; color: string }> = {
    post: { label: '投稿', icon: Send, color: 'text-blue-400' },
    like: { label: 'いいね', icon: Heart, color: 'text-pink-400' },
    repost: { label: 'リポスト', icon: Repeat, color: 'text-green-400' },
    follow: { label: 'フォロー', icon: UserPlus, color: 'text-purple-400' }
  }

  const getStatusIcon = (status: string): JSX.Element => {
    if (status === 'success') {
      return <CheckCircle size={14} className="text-green-400" />
    } else if (status === 'failed') {
      return <XCircle size={14} className="text-red-400" />
    }
    return <Clock size={14} className="text-yellow-400" />
  }

  useEffect(() => {
    if (account) {
      setUsername(account.username)
      setMemo(account.memo || '')
      setGroupId(account.groupId || null)
      setProxyId(account.proxyId || null)
      setImageError(false)
    }
  }, [account])

  if (!isOpen || !account) return null

  const handleSave = async (): Promise<void> => {
    if (!username.trim()) return

    setIsSaving(true)
    try {
      await onSave(account.id, {
        username: username.trim(),
        memo: memo.trim() || undefined,
        groupId: groupId,
        proxyId: proxyId
      })
      onClose()
    } catch (error) {
      console.error('Failed to save account:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearSession = async (): Promise<void> => {
    setIsClearingSession(true)
    try {
      await onClearSession(account.id)
    } finally {
      setIsClearingSession(false)
    }
  }

  const statusInfo = statusLabels[account.status] || statusLabels.unknown
  const searchBanInfo = searchBanLabels[account.searchBanStatus] || searchBanLabels.unknown

  const formatDate = (timestamp: number | null): string => {
    if (!timestamp) return '未チェック'
    return new Date(timestamp).toLocaleString('ja-JP')
  }

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ pointerEvents: 'auto' }}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface-dark rounded-2xl w-full max-w-lg mx-4 border border-white/10 shadow-2xl animate-scale-in" style={{ pointerEvents: 'auto' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">アカウント詳細</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'info'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            基本情報
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'activity'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <History size={14} />
            アクティビティ
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'info' ? (
            <>
              {/* Account Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                  {account.profileImage && !imageError ? (
                    <img
                      src={account.profileImage}
                      alt={account.username}
                      className="w-full h-full object-cover"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <span className="text-white text-2xl font-medium">
                      {account.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">
                    {account.displayName || account.username}
                  </h3>
                  <p className="text-gray-400">@{account.username}</p>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`text-xs px-3 py-1 rounded-full ${statusInfo.color}`}>
                  ステータス: {statusInfo.label}
                </span>
                <span className={`text-xs px-3 py-1 rounded-full ${searchBanInfo.color}`}>
                  シャドウBAN: {searchBanInfo.label}
                </span>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <Input
                  label="ユーザー名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                />
                <Input
                  label="メモ"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="メモを入力..."
                />

                {/* Group Selection */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Folder size={14} />
                      グループ
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setGroupId(null)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        groupId === null
                          ? 'bg-white/20 text-white ring-1 ring-white/30'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      なし
                    </button>
                    {groups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setGroupId(group.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
                          groupId === group.id
                            ? 'bg-white/20 text-white ring-1 ring-white/30'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        {group.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Proxy Selection */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Globe size={14} />
                      プロキシ
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setProxyId(null)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        proxyId === null
                          ? 'bg-white/20 text-white ring-1 ring-white/30'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      なし
                    </button>
                    {proxies.map((proxy) => (
                      <button
                        key={proxy.id}
                        type="button"
                        onClick={() => setProxyId(proxy.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
                          proxyId === proxy.id
                            ? 'bg-white/20 text-white ring-1 ring-white/30'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            proxy.status === 'active'
                              ? 'bg-green-400'
                              : proxy.status === 'error'
                                ? 'bg-yellow-400'
                                : proxy.status === 'inactive'
                                  ? 'bg-red-400'
                                  : 'bg-gray-400'
                          }`}
                        />
                        {proxy.name}
                      </button>
                    ))}
                  </div>
                  {proxies.length === 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      プロキシがありません。設定 → プロキシから追加してください。
                    </p>
                  )}
                </div>
              </div>

              {/* Timestamps */}
              <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">作成日</span>
                  <span className="text-white">{formatDate(account.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">最終チェック</span>
                  <span className="text-white">{formatDate(account.lastCheckedAt)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  leftIcon={<ExternalLink size={16} />}
                  onClick={() => onOpenBrowser(account.id)}
                  className="justify-center"
                >
                  ブラウザを開く
                </Button>
                <Button
                  variant="secondary"
                  leftIcon={
                    isClearingSession ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <RefreshCw size={16} />
                    )
                  }
                  onClick={handleClearSession}
                  disabled={isClearingSession}
                  className="justify-center"
                >
                  セッションクリア
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Activity Tab */}
              {isLoadingLogs ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                </div>
              ) : actionLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History size={32} className="text-gray-500 mb-3" />
                  <p className="text-gray-400 text-sm">アクティビティがありません</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {actionLogs.map((log) => {
                    const config = actionTypeConfig[log.actionType] || {
                      label: log.actionType,
                      icon: Send,
                      color: 'text-gray-400'
                    }
                    const ActionIcon = config.icon

                    return (
                      <div
                        key={log.id}
                        className="bg-white/5 rounded-xl p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ActionIcon size={16} className={config.color} />
                            <span className="text-sm text-white font-medium">{config.label}</span>
                            {getStatusIcon(log.status)}
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                        {log.content && (
                          <p className="text-sm text-gray-300 line-clamp-2">{log.content}</p>
                        )}
                        {log.targetUrl && (
                          <p className="text-xs text-gray-500 truncate">{log.targetUrl}</p>
                        )}
                        {log.errorMessage && (
                          <p className="text-xs text-red-400">{log.errorMessage}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10">
          <Button
            variant="ghost"
            leftIcon={<Trash2 size={16} />}
            onClick={() => onDelete(account.id)}
            className="text-error hover:bg-error/10"
          >
            削除
          </Button>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>
              キャンセル
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving || !username.trim()}>
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default EditAccountModal
