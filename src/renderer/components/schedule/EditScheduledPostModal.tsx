import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Calendar, Clock } from 'lucide-react'
import { Button } from '../ui'
import { useScheduledPostStore } from '../../stores/scheduledPostStore'
import type { ScheduledPost } from '../../../shared/types'

interface EditScheduledPostModalProps {
  isOpen: boolean
  scheduledPost: ScheduledPost | null
  onClose: () => void
}

function EditScheduledPostModal({
  isOpen,
  scheduledPost,
  onClose
}: EditScheduledPostModalProps): JSX.Element | null {
  const { updateScheduledPost } = useScheduledPostStore()

  const [content, setContent] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (scheduledPost) {
      setContent(scheduledPost.content)
      const date = new Date(scheduledPost.scheduledAt)
      setScheduledDate(date.toISOString().split('T')[0])
      setScheduledTime(date.toTimeString().slice(0, 5))
      setError('')
    }
  }, [scheduledPost])

  if (!isOpen || !scheduledPost) return null

  const handleSubmit = async (): Promise<void> => {
    setError('')

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
      await updateScheduledPost(scheduledPost.id, {
        content: content.trim(),
        scheduledAt
      })
      onClose()
    } catch (err) {
      setError('更新に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-surface-dark rounded-2xl w-full max-w-lg mx-4 border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">予約投稿を編集</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
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
            <label className="block text-sm font-medium text-gray-300 mb-2">予約日時</label>
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
          <Button variant="ghost" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default EditScheduledPostModal
