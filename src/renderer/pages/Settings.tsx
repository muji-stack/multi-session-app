import { useState } from 'react'
import {
  Settings as SettingsIcon,
  Clock,
  Shield,
  RotateCcw,
  Save,
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
  Database,
  Lock,
  Cloud,
  RefreshCw
} from 'lucide-react'
import { Button, Input } from '../components/ui'
import { useSettingsStore } from '../stores/settingsStore'
import { useAccountStore } from '../stores/accountStore'
import { useGroupStore } from '../stores/groupStore'
import { useToastStore } from '../stores/toastStore'
import SecuritySettings from '../components/security/SecuritySettings'
import { SyncPanel } from '../components/sync'
import { UpdateSettings } from '../components/settings'

interface OperationResult {
  type: 'success' | 'error' | 'info'
  message: string
  details?: string[]
}

function Settings(): JSX.Element {
  const {
    delayBetweenPosts,
    delayBetweenEngagements,
    autoCheckOnStartup,
    confirmBeforeAction,
    updateSettings,
    resetToDefaults
  } = useSettingsStore()

  const { fetchAccounts } = useAccountStore()
  const { fetchGroups } = useGroupStore()
  const toast = useToastStore()

  const [localPostDelay, setLocalPostDelay] = useState(delayBetweenPosts / 1000)
  const [localEngagementDelay, setLocalEngagementDelay] = useState(delayBetweenEngagements / 1000)
  const [localAutoCheck, setLocalAutoCheck] = useState(autoCheckOnStartup)
  const [localConfirm, setLocalConfirm] = useState(confirmBeforeAction)
  const [isSaved, setIsSaved] = useState(false)

  // Import/Export state
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isExportingCSV, setIsExportingCSV] = useState(false)
  const [isImportingCSV, setIsImportingCSV] = useState(false)
  const [operationResult, setOperationResult] = useState<OperationResult | null>(null)

  const handleSave = (): void => {
    updateSettings({
      delayBetweenPosts: localPostDelay * 1000,
      delayBetweenEngagements: localEngagementDelay * 1000,
      autoCheckOnStartup: localAutoCheck,
      confirmBeforeAction: localConfirm
    })
    setIsSaved(true)
    toast.success('設定を保存しました')
    setTimeout(() => setIsSaved(false), 2000)
  }

  const handleReset = (): void => {
    resetToDefaults()
    setLocalPostDelay(5)
    setLocalEngagementDelay(3)
    setLocalAutoCheck(false)
    setLocalConfirm(true)
    toast.info('設定を初期値に戻しました')
  }

  // Export/Import handlers
  const handleExport = async (): Promise<void> => {
    setIsExporting(true)
    setOperationResult(null)
    try {
      const res = await window.api.data.export()
      if (res.cancelled) {
        setOperationResult(null)
      } else if (res.success) {
        setOperationResult({
          type: 'success',
          message: 'エクスポート完了',
          details: [
            `アカウント: ${res.accountsExported}件`,
            `グループ: ${res.groupsExported}件`
          ]
        })
        toast.success('データをエクスポートしました')
      } else {
        setOperationResult({
          type: 'error',
          message: 'エクスポートに失敗しました',
          details: res.error ? [res.error] : undefined
        })
        toast.error('エクスポートに失敗しました')
      }
    } catch (error) {
      setOperationResult({
        type: 'error',
        message: 'エクスポートに失敗しました',
        details: [String(error)]
      })
      toast.error('エクスポートに失敗しました')
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (): Promise<void> => {
    setIsImporting(true)
    setOperationResult(null)
    try {
      const res = await window.api.data.import()
      if (res.cancelled) {
        setOperationResult(null)
      } else if (res.success) {
        await fetchAccounts()
        await fetchGroups()
        const details = [
          `アカウント: ${res.accountsImported}件インポート`,
          `グループ: ${res.groupsImported}件インポート`
        ]
        if (res.errors && res.errors.length > 0) {
          details.push('', '警告:', ...res.errors.slice(0, 5))
          if (res.errors.length > 5) {
            details.push(`...他${res.errors.length - 5}件`)
          }
        }
        setOperationResult({
          type: res.errors && res.errors.length > 0 ? 'info' : 'success',
          message: 'インポート完了',
          details
        })
        toast.success('データをインポートしました')
      } else {
        setOperationResult({
          type: 'error',
          message: 'インポートに失敗しました',
          details: res.errors
        })
        toast.error('インポートに失敗しました')
      }
    } catch (error) {
      setOperationResult({
        type: 'error',
        message: 'インポートに失敗しました',
        details: [String(error)]
      })
      toast.error('インポートに失敗しました')
    } finally {
      setIsImporting(false)
    }
  }

  const handleExportCSV = async (): Promise<void> => {
    setIsExportingCSV(true)
    setOperationResult(null)
    try {
      const res = await window.api.data.exportCSV()
      if (res.cancelled) {
        setOperationResult(null)
      } else if (res.success) {
        setOperationResult({
          type: 'success',
          message: 'CSVエクスポート完了',
          details: [`アカウント: ${res.accountsExported}件`]
        })
        toast.success('CSVをエクスポートしました')
      } else {
        setOperationResult({
          type: 'error',
          message: 'CSVエクスポートに失敗しました',
          details: res.error ? [res.error] : undefined
        })
        toast.error('CSVエクスポートに失敗しました')
      }
    } catch (error) {
      setOperationResult({
        type: 'error',
        message: 'CSVエクスポートに失敗しました',
        details: [String(error)]
      })
      toast.error('CSVエクスポートに失敗しました')
    } finally {
      setIsExportingCSV(false)
    }
  }

  const handleImportCSV = async (): Promise<void> => {
    setIsImportingCSV(true)
    setOperationResult(null)
    try {
      const res = await window.api.data.importCSV()
      if (res.cancelled) {
        setOperationResult(null)
      } else if (res.success) {
        await fetchAccounts()
        const details = [`アカウント: ${res.accountsImported}件インポート`]
        if (res.errors && res.errors.length > 0) {
          details.push('', '警告:', ...res.errors.slice(0, 5))
          if (res.errors.length > 5) {
            details.push(`...他${res.errors.length - 5}件`)
          }
        }
        setOperationResult({
          type: res.errors && res.errors.length > 0 ? 'info' : 'success',
          message: 'CSVインポート完了',
          details
        })
        toast.success('CSVをインポートしました')
      } else {
        setOperationResult({
          type: 'error',
          message: 'CSVインポートに失敗しました',
          details: res.errors
        })
        toast.error('CSVインポートに失敗しました')
      }
    } catch (error) {
      setOperationResult({
        type: 'error',
        message: 'CSVインポートに失敗しました',
        details: [String(error)]
      })
      toast.error('CSVインポートに失敗しました')
    } finally {
      setIsImportingCSV(false)
    }
  }

  const getResultIcon = (type: OperationResult['type']): JSX.Element => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} className="text-green-400" />
      case 'error':
        return <AlertCircle size={18} className="text-red-400" />
      case 'info':
        return <Info size={18} className="text-yellow-400" />
    }
  }

  const getResultColor = (type: OperationResult['type']): string => {
    switch (type) {
      case 'success':
        return 'border-green-500/30 bg-green-500/10'
      case 'error':
        return 'border-red-500/30 bg-red-500/10'
      case 'info':
        return 'border-yellow-500/30 bg-yellow-500/10'
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white">設定</h1>
          <p className="text-gray-400 text-sm mt-1">アプリケーションの動作を設定します</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" leftIcon={<RotateCcw size={18} />} onClick={handleReset}>
            初期値に戻す
          </Button>
          <Button
            variant="primary"
            leftIcon={<Save size={18} />}
            onClick={handleSave}
            className={isSaved ? 'bg-green-600 hover:bg-green-600' : ''}
          >
            {isSaved ? '保存しました' : '保存'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-6">
          {/* Timing Settings */}
          <div className="bg-surface-dark rounded-xl border border-white/10 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Clock size={20} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-white font-medium">タイミング設定</h2>
                <p className="text-gray-400 text-sm">投稿やアクション間の遅延時間を設定</p>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">投稿間の遅延（秒）</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={localPostDelay}
                    onChange={(e) => setLocalPostDelay(Number(e.target.value))}
                    className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="w-16">
                    <Input
                      type="number"
                      value={localPostDelay}
                      onChange={(e) => setLocalPostDelay(Number(e.target.value))}
                      min={1}
                      max={60}
                      className="text-center"
                    />
                  </div>
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  複数アカウントに投稿する際、各投稿間にこの時間の遅延を入れます
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  エンゲージメント間の遅延（秒）
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={localEngagementDelay}
                    onChange={(e) => setLocalEngagementDelay(Number(e.target.value))}
                    className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="w-16">
                    <Input
                      type="number"
                      value={localEngagementDelay}
                      onChange={(e) => setLocalEngagementDelay(Number(e.target.value))}
                      min={1}
                      max={60}
                      className="text-center"
                    />
                  </div>
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  いいね・リポスト・フォローなどのアクション間にこの時間の遅延を入れます
                </p>
              </div>
            </div>
          </div>

          {/* Behavior Settings */}
          <div className="bg-surface-dark rounded-xl border border-white/10 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Shield size={20} className="text-purple-400" />
              </div>
              <div>
                <h2 className="text-white font-medium">動作設定</h2>
                <p className="text-gray-400 text-sm">アプリケーションの動作を設定</p>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <span className="text-gray-300 group-hover:text-white transition-colors">
                    起動時に自動チェック
                  </span>
                  <p className="text-gray-500 text-xs">
                    アプリ起動時に全アカウントのステータスを自動的にチェックします
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={localAutoCheck}
                    onChange={(e) => setLocalAutoCheck(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-primary transition-colors"></div>
                  <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <span className="text-gray-300 group-hover:text-white transition-colors">
                    アクション前に確認
                  </span>
                  <p className="text-gray-500 text-xs">
                    一括投稿やエンゲージメント実行前に確認ダイアログを表示します
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={localConfirm}
                    onChange={(e) => setLocalConfirm(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-primary transition-colors"></div>
                  <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                </div>
              </label>
            </div>
          </div>

          {/* Data Import/Export */}
          <div className="bg-surface-dark rounded-xl border border-white/10 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Database size={20} className="text-green-400" />
              </div>
              <div>
                <h2 className="text-white font-medium">データ管理</h2>
                <p className="text-gray-400 text-sm">アカウントとグループのインポート・エクスポート</p>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Operation Result */}
              {operationResult && (
                <div className={`p-3 rounded-lg border ${getResultColor(operationResult.type)}`}>
                  <div className="flex items-start gap-2">
                    {getResultIcon(operationResult.type)}
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{operationResult.message}</p>
                      {operationResult.details && (
                        <ul className="mt-1 space-y-0.5">
                          {operationResult.details.map((detail, i) => (
                            <li key={i} className="text-xs text-gray-300">
                              {detail}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* JSON Format */}
              <div className="p-4 rounded-xl bg-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <FileJson size={16} className="text-blue-400" />
                  <span className="text-white text-sm font-medium">JSONフォーマット</span>
                </div>
                <p className="text-gray-400 text-xs mb-3">
                  アカウント情報とグループ設定を完全にバックアップ・復元できます
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    onClick={handleExport}
                    disabled={isExporting || isImporting}
                    className="flex-1 justify-center"
                  >
                    エクスポート
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={isImporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    onClick={handleImport}
                    disabled={isExporting || isImporting}
                    className="flex-1 justify-center"
                  >
                    インポート
                  </Button>
                </div>
              </div>

              {/* CSV Format */}
              <div className="p-4 rounded-xl bg-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <FileSpreadsheet size={16} className="text-green-400" />
                  <span className="text-white text-sm font-medium">CSVフォーマット</span>
                </div>
                <p className="text-gray-400 text-xs mb-3">
                  Excelやスプレッドシートで編集可能なCSV形式でアカウントをインポート・エクスポート
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={isExportingCSV ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    onClick={handleExportCSV}
                    disabled={isExportingCSV || isImportingCSV}
                    className="flex-1 justify-center"
                  >
                    エクスポート
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={isImportingCSV ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    onClick={handleImportCSV}
                    disabled={isExportingCSV || isImportingCSV}
                    className="flex-1 justify-center"
                  >
                    インポート
                  </Button>
                </div>
              </div>

              {/* CSV Help */}
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-blue-400 text-xs">
                  CSVインポート形式: <code className="bg-black/30 px-1 rounded">username,memo</code><br />
                  先頭の @ は自動的に除去されます
                </p>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-surface-dark rounded-xl border border-white/10 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Lock size={20} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-white font-medium">セキュリティ</h2>
                <p className="text-gray-400 text-sm">マスターパスワードと自動ロック設定</p>
              </div>
            </div>

            <div className="p-4">
              <SecuritySettings />
            </div>
          </div>

          {/* Cloud Sync */}
          <div className="bg-surface-dark rounded-xl border border-white/10 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Cloud size={20} className="text-cyan-400" />
              </div>
              <div>
                <h2 className="text-white font-medium">端末間同期</h2>
                <p className="text-gray-400 text-sm">複数デバイス間でデータを同期</p>
              </div>
            </div>

            <div className="p-4">
              <SyncPanel />
            </div>
          </div>

          {/* Software Updates */}
          <div className="bg-surface-dark rounded-xl border border-white/10 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <RefreshCw size={20} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-white font-medium">ソフトウェアアップデート</h2>
                <p className="text-gray-400 text-sm">アプリの更新を確認・インストール</p>
              </div>
            </div>

            <div className="p-4">
              <UpdateSettings />
            </div>
          </div>

          {/* Info */}
          <div className="bg-white/5 rounded-xl p-4 flex items-start gap-3">
            <SettingsIcon size={20} className="text-gray-400 mt-0.5" />
            <div>
              <p className="text-gray-300 text-sm">設定はローカルに保存されます</p>
              <p className="text-gray-500 text-xs mt-1">
                設定はこのデバイスのローカルストレージに保存され、アプリを再起動しても維持されます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
