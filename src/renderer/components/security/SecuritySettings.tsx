import React, { useEffect, useState, useCallback } from 'react'
import { useSecurityStore } from '../../stores/securityStore'
import { useToastStore } from '../../stores/toastStore'
import Modal from '../ui/Modal'

export default function SecuritySettings(): React.ReactElement {
  const {
    config,
    hasMasterPassword,
    isLoading,
    fetchConfig,
    checkMasterPassword,
    updateConfig,
    setMasterPassword,
    changeMasterPassword,
    removeMasterPassword,
    lock
  } = useSecurityStore()
  const toast = useToastStore()

  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [showRemovePasswordModal, setShowRemovePasswordModal] = useState(false)

  useEffect(() => {
    fetchConfig()
    checkMasterPassword()
  }, [fetchConfig, checkMasterPassword])

  const handleLockNow = useCallback(async () => {
    const result = await lock()
    if (result.success) {
      toast.success('アプリをロックしました')
    } else {
      toast.error(result.error || 'ロックに失敗しました')
    }
  }, [lock, toast])

  if (!config) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">マスターパスワード</h3>

        {hasMasterPassword ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-green-400">マスターパスワードが設定されています</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleLockNow}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                今すぐロック
              </button>
              <button
                onClick={() => setShowChangePasswordModal(true)}
                className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
              >
                パスワード変更
              </button>
              <button
                onClick={() => setShowRemovePasswordModal(true)}
                className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30"
              >
                パスワード削除
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-zinc-400">
              マスターパスワードを設定すると、アプリをロックしてデータを保護できます。
            </p>
            <button
              onClick={() => setShowSetPasswordModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              マスターパスワードを設定
            </button>
          </div>
        )}
      </div>

      {hasMasterPassword && (
        <>
          {/* Auto-lock settings */}
          <div className="bg-zinc-800 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">自動ロック設定</h3>

            {/* Auto-lock time */}
            <div>
              <label className="block text-white font-medium mb-2">自動ロック時間</label>
              <select
                value={config.autoLockMinutes}
                onChange={(e) => updateConfig({ autoLockMinutes: Number(e.target.value) })}
                className="w-full bg-zinc-700 text-white rounded-lg px-4 py-2 border border-zinc-600 focus:border-blue-500 focus:outline-none"
              >
                <option value={1}>1分</option>
                <option value={5}>5分</option>
                <option value={10}>10分</option>
                <option value={15}>15分</option>
                <option value={30}>30分</option>
                <option value={60}>1時間</option>
                <option value={0}>無効</option>
              </select>
            </div>

            {/* Lock on minimize */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white">ウィンドウ最小化時にロック</div>
                <div className="text-sm text-zinc-400">ウィンドウを最小化するとロックします</div>
              </div>
              <ToggleSwitch
                checked={config.lockOnMinimize}
                onChange={(checked) => updateConfig({ lockOnMinimize: checked })}
              />
            </div>

            {/* Lock on sleep */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white">スリープ/画面ロック時にロック</div>
                <div className="text-sm text-zinc-400">PCがスリープまたは画面ロックされるとロックします</div>
              </div>
              <ToggleSwitch
                checked={config.lockOnSleep}
                onChange={(checked) => updateConfig({ lockOnSleep: checked })}
              />
            </div>
          </div>

          {/* Encryption settings */}
          <div className="bg-zinc-800 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">データ暗号化</h3>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-white">セッションデータの暗号化</div>
                <div className="text-sm text-zinc-400">ブラウザセッションデータを暗号化して保存</div>
              </div>
              <ToggleSwitch
                checked={config.encryptSessionData}
                onChange={(checked) => updateConfig({ encryptSessionData: checked })}
              />
            </div>

            <div className="px-4 py-3 bg-zinc-700/50 rounded-lg">
              <p className="text-sm text-zinc-400">
                暗号化を有効にすると、アカウントのログインセッションがAES-256で暗号化されます。
                マスターパスワードを忘れると、暗号化されたデータにアクセスできなくなります。
              </p>
            </div>
          </div>
        </>
      )}

      {/* Set Password Modal */}
      <SetPasswordModal
        isOpen={showSetPasswordModal}
        onClose={() => setShowSetPasswordModal(false)}
        onSubmit={async (password) => {
          const result = await setMasterPassword(password)
          if (result.success) {
            toast.success('マスターパスワードを設定しました')
            setShowSetPasswordModal(false)
          } else {
            toast.error(result.error || 'パスワードの設定に失敗しました')
          }
        }}
        isLoading={isLoading}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSubmit={async (currentPassword, newPassword) => {
          const result = await changeMasterPassword(currentPassword, newPassword)
          if (result.success) {
            toast.success('パスワードを変更しました')
            setShowChangePasswordModal(false)
          } else {
            toast.error(result.error || 'パスワードの変更に失敗しました')
          }
        }}
        isLoading={isLoading}
      />

      {/* Remove Password Modal */}
      <RemovePasswordModal
        isOpen={showRemovePasswordModal}
        onClose={() => setShowRemovePasswordModal(false)}
        onSubmit={async (password) => {
          const result = await removeMasterPassword(password)
          if (result.success) {
            toast.success('マスターパスワードを削除しました')
            setShowRemovePasswordModal(false)
          } else {
            toast.error(result.error || 'パスワードの削除に失敗しました')
          }
        }}
        isLoading={isLoading}
      />
    </div>
  )
}

// Toggle Switch Component
function ToggleSwitch({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}): React.ReactElement {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-zinc-600'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
          checked ? 'translate-x-6' : ''
        }`}
      />
    </button>
  )
}

// Set Password Modal
function SetPasswordModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (password: string) => Promise<void>
  isLoading: boolean
}): React.ReactElement | null {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('パスワードは8文字以上である必要があります')
      return
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    await onSubmit(password)
    setPassword('')
    setConfirmPassword('')
  }

  const handleClose = () => {
    setPassword('')
    setConfirmPassword('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="マスターパスワードを設定">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            パスワード（8文字以上）
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            パスワード確認
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            autoComplete="new-password"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-zinc-400 hover:text-white"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? '設定中...' : '設定'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// Change Password Modal
function ChangePasswordModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>
  isLoading: boolean
}): React.ReactElement | null {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('新しいパスワードは8文字以上である必要があります')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('新しいパスワードが一致しません')
      return
    }

    await onSubmit(currentPassword, newPassword)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleClose = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="パスワード変更">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            現在のパスワード
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            autoComplete="current-password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            新しいパスワード（8文字以上）
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            新しいパスワード確認
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            autoComplete="new-password"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-zinc-400 hover:text-white"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? '変更中...' : '変更'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// Remove Password Modal
function RemovePasswordModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (password: string) => Promise<void>
  isLoading: boolean
}): React.ReactElement | null {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    await onSubmit(password)
    setPassword('')
  }

  const handleClose = () => {
    setPassword('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="マスターパスワードを削除">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">
            マスターパスワードを削除すると、自動ロック機能が無効になり、
            暗号化されたデータは削除されます。この操作は取り消せません。
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            現在のパスワードを入力して確認
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-zinc-400 hover:text-white"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? '削除中...' : '削除'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
