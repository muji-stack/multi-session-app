import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Calendar, Clock } from 'lucide-react'
import { Button, Input } from '../ui'
import { useScheduledPostStore } from '../../stores/scheduledPostStore'
import type { Account } from '../../../shared/types'

interface CreateScheduledPostModalProps {
  isOpen: boolean
  onClose: () => void
  accounts: Account[]
}

function CreateScheduledPostModal({
  isOpen,
  onClose,
  accounts
}: CreateScheduledPostModalProps): JSX.Element | null {
  const { createScheduledPost } = useScheduledPostStore()

  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [content, setContent] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (): Promise<void> => {
    setError('')

    if (!selectedAccountId) {
      setError('アカウントを選択してください')
      return
    }

    if (!content.trim()) {
      setError('投稿内容を入力してください')
      return
    }

    if (!scheduledDate || !scheduledTime) {
      setError('日時を指定してください')
      return
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).getTime()

    if (scheduledAt <= Date.now()) {
      setError('未来の日時を指定してください')
      return
    }

    setIsSubmitting(true)
    try {
      await createScheduledPost({
        accountId: selectedAccountId,
        content: content.trim(),
        scheduledAt
      })
      handleClose()
    } catch (err) {
      setError('予約の作成に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = (): void => {
    setSelectedAccountId('')
    setContent('')
    setScheduledDate('')
    setScheduledTime('')
    setError('')
    onClose()
  }

  // Set default date/time to 1 hour from now
  const getDefaultDateTime = (): { date: string; time: string } => {
    const now = new Date()
    now.setHours(now.getHours() + 1)
    now.setMinutes(0)
    now.setSeconds(0)

    const date = now.toISOString().split('T')[0]
    const time = now.toTimeString().slice(0, 5)

    return { date, time }
  }

  const handleSetDefaultTime = (): void => {
    const { date, time } = getDefaultDateTime()
    setScheduledDate(date)
    setScheduledTime(time)
  }

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-surface-dark rounded-2xl w-full max-w-lg mx-4 border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">予約投稿を作成</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Account Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">アカウント</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full h-10 bg-[#1a1a1a] border border-white/10 rounded-xl text-white px-4 focus:outline-none focus:border-primary/50"
            >
              <option value="" className="bg-[#1a1a1a] text-white">アカウントを選択...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id} className="bg-[#1a1a1a] text-white">
                  @{account.username}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">投稿内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="投稿する内容を入力..."
              className="w-full h-32 bg-white/5 border border-white/10 rounded-xl text-white p-4 resize-none focus:outline-none focus:border-primary/50"
              maxLength={280}
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-gray-500">{content.length} / 280</span>
            </div>
          </div>

          {/* Date/Time */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">予約日時</label>
              <button
                type="button"
                onClick={handleSetDefaultTime}
                className="text-xs text-primary hover:underline"
              >
                1時間後に設定
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full h-10 bg-white/5 border border-white/10 rounded-xl text-white pl-10 pr-4 focus:outline-none focus:border-primary/50"
                />
              </div>
              <div className="relative">
                <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full h-10 bg-white/5 border border-white/10 rounded-xl text-white pl-10 pr-4 focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-white/10">
          <Button variant="ghost" onClick={handleClose}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? '作成中...' : '予約を作成'}
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default CreateScheduledPostModal
