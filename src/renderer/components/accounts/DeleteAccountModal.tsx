import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal, Button } from '../ui'
import type { Account } from '../../../shared/types'

interface DeleteAccountModalProps {
  isOpen: boolean
  account: Account | null
  onClose: () => void
  onDelete: (id: string) => Promise<void>
}

function DeleteAccountModal({ isOpen, account, onClose, onDelete }: DeleteAccountModalProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async (): Promise<void> => {
    if (!account) return

    setIsLoading(true)
    try {
      await onDelete(account.id)
      onClose()
    } catch (error) {
      console.error('Failed to delete account:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="アカウントを削除" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-error/10 border border-error/20 rounded-xl">
          <AlertTriangle className="text-error flex-shrink-0" size={24} />
          <div>
            <p className="text-white font-medium">この操作は取り消せません</p>
            <p className="text-gray-400 text-sm mt-1">
              アカウント「@{account?.username}」を削除すると、保存されたセッション情報も削除されます。
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            キャンセル
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            loading={isLoading}
            className="flex-1"
          >
            削除する
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default DeleteAccountModal
