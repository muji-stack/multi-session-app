import { useState } from 'react'
import { Modal, Input, Button } from '../ui'

interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (username: string, memo?: string) => Promise<void>
}

function AddAccountModal({ isOpen, onClose, onAdd }: AddAccountModalProps): JSX.Element {
  const [username, setUsername] = useState('')
  const [memo, setMemo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    if (!username.trim()) {
      setError('ユーザー名を入力してください')
      return
    }

    // Remove @ if present
    const cleanUsername = username.trim().replace(/^@/, '')

    setIsLoading(true)
    setError(null)

    try {
      await onAdd(cleanUsername, memo.trim() || undefined)
      setUsername('')
      setMemo('')
      onClose()
    } catch (err) {
      setError((err as Error).message || 'アカウントの追加に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = (): void => {
    if (!isLoading) {
      setUsername('')
      setMemo('')
      setError(null)
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="アカウントを追加" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="ユーザー名"
          placeholder="@username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={error || undefined}
          disabled={isLoading}
          autoFocus
        />

        <Input
          label="メモ（任意）"
          placeholder="メモを入力..."
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          disabled={isLoading}
        />

        <p className="text-xs text-gray-400">
          アカウントを追加後、ブラウザを開いてXにログインしてください。
          ログイン情報はローカルに保存され、セッションごとに分離されます。
        </p>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1"
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            className="flex-1"
          >
            追加
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default AddAccountModal
