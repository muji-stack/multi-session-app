// Sync Panel Component
// Main sync management panel

import { useState, useEffect } from 'react'
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  Key,
  CheckCircle,
  AlertCircle,
  Monitor,
} from 'lucide-react'
import { DeviceList } from './DeviceList'
import { useSyncStore } from '@stores/syncStore'
import { useAuthStore } from '@stores/authStore'
import { useToastStore } from '@stores/toastStore'

export function SyncPanel() {
  const { user } = useAuthStore()
  const toast = useToastStore()
  const {
    devices,
    status,
    isLoading,
    error,
    fetchDevices,
    fetchCurrentDevice,
    fetchStatus,
    registerDevice,
    removeDevice,
    setPassword,
    hasPassword,
    syncToCloud,
    syncFromCloud,
    clearError,
  } = useSyncStore()

  const [syncPassword, setSyncPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isPasswordSet, setIsPasswordSet] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  const userId = user?.uid || 'local-user'

  useEffect(() => {
    fetchDevices(userId)
    fetchCurrentDevice()
    fetchStatus(userId)
    checkPassword()
  }, [userId])

  const checkPassword = async () => {
    const hasPass = await hasPassword()
    setIsPasswordSet(hasPass)
  }

  const handleSetPassword = async () => {
    if (!syncPassword) {
      toast.error('パスワードを入力してください')
      return
    }

    if (syncPassword.length < 8) {
      toast.error('パスワードは8文字以上で入力してください')
      return
    }

    if (syncPassword !== confirmPassword) {
      toast.error('パスワードが一致しません')
      return
    }

    const success = await setPassword(syncPassword)
    if (success) {
      setIsPasswordSet(true)
      setShowPasswordForm(false)
      setSyncPassword('')
      setConfirmPassword('')
      toast.success('同期パスワードを設定しました')

      // Register device after setting password
      await registerDevice(userId)
    } else {
      toast.error('パスワードの設定に失敗しました')
    }
  }

  const handleSyncToCloud = async () => {
    if (!isPasswordSet) {
      toast.error('先に同期パスワードを設定してください')
      return
    }

    const result = await syncToCloud(userId)
    if (result) {
      toast.success(
        `同期完了: アカウント ${result.itemsSynced.accounts}件、グループ ${result.itemsSynced.groups}件`
      )
    } else if (error) {
      toast.error(error)
    }
  }

  const handleSyncFromCloud = async () => {
    if (!isPasswordSet) {
      toast.error('先に同期パスワードを設定してください')
      return
    }

    const result = await syncFromCloud(userId)
    if (result) {
      toast.success(
        `同期完了: アカウント ${result.itemsSynced.accounts}件、グループ ${result.itemsSynced.groups}件`
      )
      // Refresh the page data
      window.location.reload()
    } else if (error) {
      toast.error(error)
    }
  }

  const handleRemoveDevice = async (deviceId: string) => {
    if (confirm('このデバイスを削除しますか？')) {
      const success = await removeDevice(userId, deviceId)
      if (success) {
        toast.success('デバイスを削除しました')
      }
    }
  }

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return '未同期'
    return new Date(timestamp).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Sync Status Card */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <Cloud className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">同期ステータス</h3>
              <p className="text-sm text-gray-400">
                最終同期: {formatLastSync(status.lastSyncAt)}
              </p>
            </div>
          </div>

          {isPasswordSet ? (
            <span className="flex items-center gap-1.5 text-sm text-green-400">
              <CheckCircle className="h-4 w-4" />
              パスワード設定済み
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-yellow-400">
              <AlertCircle className="h-4 w-4" />
              パスワード未設定
            </span>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
            <button
              onClick={clearError}
              className="ml-2 text-red-300 hover:text-red-200 underline"
            >
              閉じる
            </button>
          </div>
        )}

        {/* Sync Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSyncToCloud}
            disabled={status.isSyncing || !isPasswordSet}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status.isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CloudUpload className="h-4 w-4" />
            )}
            クラウドへ同期
          </button>

          <button
            onClick={handleSyncFromCloud}
            disabled={status.isSyncing || !isPasswordSet}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gray-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status.isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CloudDownload className="h-4 w-4" />
            )}
            クラウドから取得
          </button>
        </div>
      </div>

      {/* Password Setup */}
      {!isPasswordSet && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-6">
          <div className="flex items-start gap-3 mb-4">
            <Key className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white">同期パスワードを設定</h3>
              <p className="text-sm text-gray-400 mt-1">
                データを暗号化するためのパスワードを設定してください。
                このパスワードは他のデバイスでも同じものを使用します。
              </p>
            </div>
          </div>

          {showPasswordForm ? (
            <div className="space-y-3">
              <input
                type="password"
                value={syncPassword}
                onChange={(e) => setSyncPassword(e.target.value)}
                placeholder="パスワード（8文字以上）"
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="パスワード（確認）"
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSetPassword}
                  className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                >
                  設定する
                </button>
                <button
                  onClick={() => {
                    setShowPasswordForm(false)
                    setSyncPassword('')
                    setConfirmPassword('')
                  }}
                  className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="w-full rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-medium text-black hover:bg-yellow-400"
            >
              パスワードを設定
            </button>
          )}
        </div>
      )}

      {/* Registered Devices */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-purple-500/20 p-2">
            <Monitor className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">登録デバイス</h3>
            <p className="text-sm text-gray-400">{devices.length}台のデバイスが登録されています</p>
          </div>
        </div>

        <DeviceList
          devices={devices}
          onRemove={handleRemoveDevice}
          isLoading={isLoading}
        />
      </div>

      {/* Sync Info */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
        <h3 className="font-semibold text-white mb-3">同期について</h3>
        <div className="space-y-2 text-sm text-gray-400">
          <p>
            <span className="text-green-400">✓</span> 同期される:
            アカウント情報、グループ、プロキシ設定、投稿テンプレート、自動化設定
          </p>
          <p>
            <span className="text-red-400">✗</span> 同期されない:
            ブラウザセッション（Cookie）、メディアファイル、操作履歴
          </p>
          <p className="mt-3 text-yellow-400">
            ⚠️ データは設定したパスワードで暗号化されます。パスワードを忘れるとデータを復元できません。
          </p>
        </div>
      </div>
    </div>
  )
}
