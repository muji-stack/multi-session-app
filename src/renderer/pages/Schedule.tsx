import { useEffect, useState, useMemo } from 'react'
import { Plus, Calendar, Clock, Filter, Trash2, Edit2, XCircle, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '../components/ui'
import CreateScheduledPostModal from '../components/schedule/CreateScheduledPostModal'
import EditScheduledPostModal from '../components/schedule/EditScheduledPostModal'
import { useScheduledPostStore } from '../stores/scheduledPostStore'
import { useAccountStore } from '../stores/accountStore'
import type { ScheduledPost, ScheduledPostStatus } from '../../shared/types'

const statusConfig: Record<ScheduledPostStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: '予約中', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  processing: { label: '処理中', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  completed: { label: '完了', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  failed: { label: '失敗', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  cancelled: { label: 'キャンセル', color: 'text-gray-400', bgColor: 'bg-gray-500/20' }
}

function Schedule(): JSX.Element {
  const {
    scheduledPosts,
    stats,
    isLoading,
    filterStatus,
    fetchScheduledPosts,
    fetchStats,
    deleteScheduledPost,
    cancelScheduledPost,
    setFilterStatus
  } = useScheduledPostStore()

  const { accounts, fetchAccounts } = useAccountStore()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ScheduledPost | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ScheduledPost | null>(null)

  useEffect(() => {
    fetchScheduledPosts()
    fetchStats()
    fetchAccounts()
  }, [fetchScheduledPosts, fetchStats, fetchAccounts])

  const filteredPosts = useMemo(() => {
    if (filterStatus === 'all') return scheduledPosts
    return scheduledPosts.filter((post) => post.status === filterStatus)
  }, [scheduledPosts, filterStatus])

  const getAccountName = (accountId: string): string => {
    const account = accounts.find((a) => a.id === accountId)
    return account ? `@${account.username}` : '不明なアカウント'
  }

  const formatDateTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return
    await deleteScheduledPost(deleteTarget.id)
    setDeleteTarget(null)
  }

  const handleCancel = async (post: ScheduledPost): Promise<void> => {
    await cancelScheduledPost(post.id)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white">予約投稿</h1>
          <p className="text-gray-400 text-sm mt-1">
            投稿を予約して、指定した時刻に自動投稿
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={18} />}
          onClick={() => setIsCreateModalOpen(true)}
          disabled={accounts.length === 0}
        >
          予約を作成
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="px-6 py-4 border-b border-white/10 flex gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-sm text-gray-400">予約中: {stats.pending}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-sm text-gray-400">完了: {stats.completed}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-sm text-gray-400">失敗: {stats.failed}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-sm text-gray-400">キャンセル: {stats.cancelled}</span>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="px-6 py-3 border-b border-white/10 flex items-center gap-2">
        <Filter size={16} className="text-gray-400" />
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            filterStatus === 'all'
              ? 'bg-primary text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          すべて
        </button>
        {(Object.keys(statusConfig) as ScheduledPostStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filterStatus === status
                ? 'bg-primary text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {statusConfig[status].label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={32} className="animate-spin text-gray-400" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Calendar size={32} className="text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">予約投稿がありません</h3>
            <p className="text-gray-400 text-sm max-w-sm mb-6">
              「予約を作成」ボタンから新しい予約投稿を追加しましょう。
            </p>
            <Button
              variant="primary"
              leftIcon={<Plus size={18} />}
              onClick={() => setIsCreateModalOpen(true)}
              disabled={accounts.length === 0}
            >
              予約を作成
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map((post) => {
              const status = statusConfig[post.status]
              const isPast = post.scheduledAt < Date.now()
              const canEdit = post.status === 'pending'
              const canCancel = post.status === 'pending'

              return (
                <div
                  key={post.id}
                  className="bg-surface-dark rounded-xl p-4 border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Account & Status */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-primary font-medium">
                          {getAccountName(post.accountId)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.bgColor} ${status.color}`}>
                          {status.label}
                        </span>
                      </div>

                      {/* Content */}
                      <p className="text-white text-sm mb-3 whitespace-pre-wrap line-clamp-3">
                        {post.content}
                      </p>

                      {/* Time */}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          予約: {formatDateTime(post.scheduledAt)}
                          {isPast && post.status === 'pending' && (
                            <span className="text-yellow-400 ml-1">(過去)</span>
                          )}
                        </span>
                        {post.executedAt && (
                          <span className="flex items-center gap-1">
                            <CheckCircle size={12} />
                            実行: {formatDateTime(post.executedAt)}
                          </span>
                        )}
                      </div>

                      {/* Error message */}
                      {post.errorMessage && (
                        <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                          <XCircle size={12} />
                          {post.errorMessage}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          onClick={() => setEditTarget(post)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                          title="編集"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {canCancel && (
                        <button
                          onClick={() => handleCancel(post)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                          title="キャンセル"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteTarget(post)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="削除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateScheduledPostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        accounts={accounts}
      />

      {/* Edit Modal */}
      <EditScheduledPostModal
        isOpen={editTarget !== null}
        scheduledPost={editTarget}
        onClose={() => setEditTarget(null)}
      />

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative bg-surface-dark rounded-2xl w-full max-w-md mx-4 p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-2">予約投稿を削除</h3>
            <p className="text-gray-400 text-sm mb-6">
              この予約投稿を削除してもよろしいですか？この操作は取り消せません。
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
                キャンセル
              </Button>
              <Button
                variant="danger"
                leftIcon={<Trash2 size={16} />}
                onClick={handleDelete}
              >
                削除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Schedule
