// Update Settings Component
// Displays current version, update status, and update settings

import { useEffect, useState } from 'react'
import { useUpdaterStore, formatBytes, formatSpeed, formatDate } from '../../stores/updaterStore'
import {
  RefreshCw,
  Download,
  CheckCircle,
  AlertTriangle,
  Info,
  Settings,
} from 'lucide-react'

export function UpdateSettings() {
  const {
    checking,
    available,
    downloading,
    downloaded,
    error,
    updateInfo,
    progress,
    currentVersion,
    config,
    isInstallingUpdate,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    loadCurrentVersion,
    loadConfig,
    updateConfig,
    setupEventListeners,
  } = useUpdaterStore()

  const [showReleaseNotes, setShowReleaseNotes] = useState(false)
  const [lastCheckedText, setLastCheckedText] = useState<string>('')

  // Load initial data and setup event listeners
  useEffect(() => {
    loadCurrentVersion()
    loadConfig()
    const cleanup = setupEventListeners()
    return cleanup
  }, [loadCurrentVersion, loadConfig, setupEventListeners])

  // Update last checked text
  useEffect(() => {
    const updateLastChecked = () => {
      if (!config.lastCheckedAt) {
        setLastCheckedText('未チェック')
        return
      }

      const diff = Date.now() - config.lastCheckedAt
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 24)

      if (minutes < 1) {
        setLastCheckedText('たった今')
      } else if (minutes < 60) {
        setLastCheckedText(`${minutes}分前`)
      } else if (hours < 24) {
        setLastCheckedText(`${hours}時間前`)
      } else {
        setLastCheckedText(`${days}日前`)
      }
    }

    updateLastChecked()
    const interval = setInterval(updateLastChecked, 60000)
    return () => clearInterval(interval)
  }, [config.lastCheckedAt])

  const handleCheckForUpdates = async () => {
    try {
      await checkForUpdates()
    } catch (err) {
      // Error is already set in store
    }
  }

  const handleDownloadUpdate = async () => {
    try {
      await downloadUpdate()
    } catch (err) {
      // Error is already set in store
    }
  }

  const handleInstallUpdate = async () => {
    try {
      await installUpdate()
    } catch (err) {
      // Error is already set in store
    }
  }

  const handleAutoCheckChange = async (enabled: boolean) => {
    try {
      await updateConfig({ autoCheck: enabled })
    } catch (err) {
      console.error('Failed to update auto-check setting:', err)
    }
  }

  const handleAutoDownloadChange = async (enabled: boolean) => {
    try {
      await updateConfig({ autoDownload: enabled })
    } catch (err) {
      console.error('Failed to update auto-download setting:', err)
    }
  }

  return (
    <div className="space-y-4">
      {/* Current Version */}
      <div className="p-4 bg-white/5 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Info size={18} className="text-gray-400" />
            <div>
              <p className="text-sm text-gray-400">現在のバージョン</p>
              <p className="text-lg font-semibold text-white">
                {currentVersion || '読み込み中...'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">最終チェック</p>
            <p className="text-sm text-gray-300">{lastCheckedText}</p>
          </div>
        </div>
      </div>

      {/* Update Status */}
      {error && (
        <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-400">アップデートエラー</p>
              <p className="text-sm text-red-300/80">{error}</p>
            </div>
          </div>
        </div>
      )}

      {available && updateInfo && !downloaded && (
        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Download size={18} className="text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-400">
                  アップデートが利用可能です
                </p>
                <p className="text-lg font-semibold text-white mt-1">
                  バージョン {updateInfo.version}
                </p>
                {updateInfo.releaseDate && (
                  <p className="text-sm text-gray-400 mt-1">
                    リリース日: {formatDate(updateInfo.releaseDate)}
                  </p>
                )}
              </div>
            </div>
            {!downloading && (
              <button
                onClick={handleDownloadUpdate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                ダウンロード
              </button>
            )}
          </div>

          {/* Download Progress */}
          {downloading && progress && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-300">
                  ダウンロード中... {progress.percent.toFixed(1)}%
                </span>
                <span className="text-gray-400">
                  {formatBytes(progress.transferred)} / {formatBytes(progress.total)} ({formatSpeed(progress.bytesPerSecond)})
                </span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Release Notes */}
          {updateInfo.releaseNotes && (
            <div className="mt-4">
              <button
                onClick={() => setShowReleaseNotes(!showReleaseNotes)}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                {showReleaseNotes ? 'リリースノートを隠す' : 'リリースノートを表示'}
              </button>
              {showReleaseNotes && (
                <div className="mt-2 p-3 bg-black/30 rounded-lg text-sm text-gray-300 max-h-48 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-sans">
                    {updateInfo.releaseNotes}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {downloaded && updateInfo && (
        <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle size={18} className="text-green-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-400">
                  インストール準備完了
                </p>
                <p className="text-lg font-semibold text-white mt-1">
                  バージョン {updateInfo.version}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  アップデートがダウンロードされました。インストールするとアプリが再起動します。
                </p>
              </div>
            </div>
            <button
              onClick={handleInstallUpdate}
              disabled={isInstallingUpdate}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isInstallingUpdate ? 'インストール中...' : 'インストール'}
            </button>
          </div>
        </div>
      )}

      {/* Check for Updates Button */}
      <div>
        <button
          onClick={handleCheckForUpdates}
          disabled={checking || downloading}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
          {checking ? 'チェック中...' : 'アップデートを確認'}
        </button>
      </div>

      {/* Update Settings */}
      <div className="p-4 bg-white/5 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Settings size={16} className="text-gray-400" />
          <h4 className="text-sm font-medium text-white">アップデート設定</h4>
        </div>

        <div className="space-y-4">
          {/* Auto Check */}
          <label className="flex items-center justify-between cursor-pointer group">
            <div>
              <span className="text-gray-300 text-sm group-hover:text-white transition-colors">
                自動でアップデートを確認
              </span>
              <p className="text-gray-500 text-xs">
                6時間ごとに自動的にアップデートを確認します
              </p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={config.autoCheck}
                onChange={(e) => handleAutoCheckChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-primary transition-colors"></div>
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
            </div>
          </label>

          {/* Auto Download */}
          <label className="flex items-center justify-between cursor-pointer group">
            <div>
              <span className="text-gray-300 text-sm group-hover:text-white transition-colors">
                自動でダウンロード
              </span>
              <p className="text-gray-500 text-xs">
                アップデートが利用可能になったら自動的にダウンロードします
              </p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={config.autoDownload}
                onChange={(e) => handleAutoDownloadChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-primary transition-colors"></div>
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
            </div>
          </label>
        </div>
      </div>

      {/* Info */}
      <p className="text-xs text-gray-500">
        アップデートはGitHub Releasesを通じて配布されます。
        プロジェクトリポジトリから手動でダウンロードすることもできます。
      </p>
    </div>
  )
}
