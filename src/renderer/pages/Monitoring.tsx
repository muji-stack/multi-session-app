import React, { useEffect, useState, useCallback } from 'react'
import { useMonitoringStore } from '../stores/monitoringStore'
import { useAccountStore } from '../stores/accountStore'
import { useToastStore } from '../stores/toastStore'
import type {
  MonitoringAlert,
  MonitoringAlertType,
  AlertSeverity,
  ReportType
} from '../../shared/types'

const ALERT_TYPE_LABELS: Record<MonitoringAlertType, string> = {
  account_locked: 'アカウントロック',
  account_suspended: 'アカウント凍結',
  shadow_ban_detected: 'シャドウBAN',
  login_failed: 'ログイン失敗',
  rate_limit: 'レート制限',
  action_failed: 'アクション失敗',
  proxy_error: 'プロキシエラー',
  session_expired: 'セッション切れ'
}

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  low: 'bg-gray-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500'
}

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '緊急'
}

type TabType = 'overview' | 'alerts' | 'config' | 'reports'

export default function Monitoring(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const {
    alerts,
    unresolvedAlerts,
    config,
    reports,
    stats,
    isLoading,
    isChecking,
    fetchAlerts,
    fetchUnresolvedAlerts,
    fetchConfig,
    fetchReports,
    fetchStats,
    updateConfig,
    markAlertAsRead,
    markAllAlertsAsRead,
    resolveAlert,
    deleteAlert,
    triggerCheck,
    generateReport,
    deleteReport
  } = useMonitoringStore()

  const { accounts, fetchAccounts } = useAccountStore()
  const toast = useToastStore()

  useEffect(() => {
    fetchStats()
    fetchUnresolvedAlerts()
    fetchConfig()
    fetchAccounts()
  }, [fetchStats, fetchUnresolvedAlerts, fetchConfig, fetchAccounts])

  useEffect(() => {
    if (activeTab === 'alerts') {
      fetchAlerts()
    } else if (activeTab === 'reports') {
      fetchReports()
    }
  }, [activeTab, fetchAlerts, fetchReports])

  // Set up event listeners
  useEffect(() => {
    const unsubAlert = window.api.monitoring.onAlert((data) => {
      toast.warning(data.message)
      fetchUnresolvedAlerts()
      fetchStats()
    })

    const unsubCheck = window.api.monitoring.onCheckComplete((data) => {
      if (data.issuesFound > 0) {
        toast.warning(`${data.accountsChecked}件のアカウントをチェック。${data.issuesFound}件の問題を検出`)
      }
      fetchStats()
      fetchUnresolvedAlerts()
    })

    return () => {
      unsubAlert()
      unsubCheck()
    }
  }, [toast, fetchUnresolvedAlerts, fetchStats])

  const handleTriggerCheck = useCallback(async () => {
    try {
      await triggerCheck()
      toast.success('監視チェックが完了しました')
    } catch {
      toast.error('監視チェックに失敗しました')
    }
  }, [triggerCheck, toast])

  const handleGenerateReport = useCallback(
    async (reportType: ReportType) => {
      const now = Date.now()
      let periodStart: number

      switch (reportType) {
        case 'daily':
          periodStart = now - 24 * 60 * 60 * 1000
          break
        case 'weekly':
          periodStart = now - 7 * 24 * 60 * 60 * 1000
          break
        case 'monthly':
          periodStart = now - 30 * 24 * 60 * 60 * 1000
          break
        default:
          periodStart = now - 24 * 60 * 60 * 1000
      }

      const report = await generateReport(reportType, periodStart, now)
      if (report) {
        toast.success('レポートを生成しました')
      } else {
        toast.error('レポート生成に失敗しました')
      }
    },
    [generateReport, toast]
  )

  const getAccountUsername = useCallback(
    (accountId: string) => {
      const account = accounts.find((a) => a.id === accountId)
      return account ? `@${account.username}` : accountId
    },
    [accounts]
  )

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ja-JP')
  }

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'たった今'
    if (minutes < 60) return `${minutes}分前`
    if (hours < 24) return `${hours}時間前`
    return `${days}日前`
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">モニタリング</h1>
        <button
          onClick={handleTriggerCheck}
          disabled={isChecking}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isChecking ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              チェック中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              今すぐチェック
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-800 p-1 rounded-lg w-fit">
        {[
          { id: 'overview', label: '概要' },
          { id: 'alerts', label: `アラート${unresolvedAlerts.length > 0 ? ` (${unresolvedAlerts.length})` : ''}` },
          { id: 'config', label: '設定' },
          { id: 'reports', label: 'レポート' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          stats={stats}
          unresolvedAlerts={unresolvedAlerts}
          getAccountUsername={getAccountUsername}
          formatRelativeTime={formatRelativeTime}
          onResolveAlert={resolveAlert}
        />
      )}
      {activeTab === 'alerts' && (
        <AlertsTab
          alerts={alerts}
          isLoading={isLoading}
          getAccountUsername={getAccountUsername}
          formatDate={formatDate}
          onMarkAsRead={markAlertAsRead}
          onMarkAllAsRead={markAllAlertsAsRead}
          onResolve={resolveAlert}
          onDelete={deleteAlert}
        />
      )}
      {activeTab === 'config' && <ConfigTab config={config} onUpdateConfig={updateConfig} />}
      {activeTab === 'reports' && (
        <ReportsTab
          reports={reports}
          isLoading={isLoading}
          formatDate={formatDate}
          onGenerateReport={handleGenerateReport}
          onDeleteReport={deleteReport}
        />
      )}
    </div>
  )
}

// Overview Tab Component
function OverviewTab({
  stats,
  unresolvedAlerts,
  getAccountUsername,
  formatRelativeTime,
  onResolveAlert
}: {
  stats: ReturnType<typeof useMonitoringStore>['stats']
  unresolvedAlerts: MonitoringAlert[]
  getAccountUsername: (id: string) => string
  formatRelativeTime: (timestamp: number) => string
  onResolveAlert: (id: string) => Promise<void>
}): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="総アカウント"
          value={stats?.totalAccounts ?? 0}
          color="text-white"
        />
        <StatCard
          label="正常"
          value={stats?.normalAccounts ?? 0}
          color="text-green-400"
        />
        <StatCard
          label="ロック"
          value={stats?.lockedAccounts ?? 0}
          color="text-yellow-400"
        />
        <StatCard
          label="凍結"
          value={stats?.suspendedAccounts ?? 0}
          color="text-red-400"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="シャドウBAN疑い"
          value={stats?.shadowBannedAccounts ?? 0}
          color="text-orange-400"
        />
        <StatCard
          label="未解決アラート"
          value={stats?.unresolvedAlerts ?? 0}
          color="text-red-400"
        />
        <StatCard
          label="24時間以内のアラート"
          value={stats?.recentAlerts ?? 0}
          color="text-blue-400"
        />
      </div>

      {/* Last Check */}
      {stats?.lastCheckAt && (
        <div className="text-sm text-zinc-400">
          最終チェック: {formatRelativeTime(stats.lastCheckAt)}
        </div>
      )}

      {/* Recent Unresolved Alerts */}
      {unresolvedAlerts.length > 0 && (
        <div className="bg-zinc-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">未解決のアラート</h3>
          <div className="space-y-3">
            {unresolvedAlerts.slice(0, 5).map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                getAccountUsername={getAccountUsername}
                formatRelativeTime={formatRelativeTime}
                onResolve={() => onResolveAlert(alert.id)}
              />
            ))}
          </div>
        </div>
      )}

      {unresolvedAlerts.length === 0 && (
        <div className="bg-zinc-800 rounded-lg p-8 text-center">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-zinc-400">すべてのアカウントが正常です</p>
        </div>
      )}
    </div>
  )
}

// Stat Card Component
function StatCard({
  label,
  value,
  color
}: {
  label: string
  value: number
  color: string
}): React.ReactElement {
  return (
    <div className="bg-zinc-800 rounded-lg p-4">
      <div className="text-sm text-zinc-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  )
}

// Alert Item Component
function AlertItem({
  alert,
  getAccountUsername,
  formatRelativeTime,
  onResolve,
  showActions = true
}: {
  alert: MonitoringAlert
  getAccountUsername: (id: string) => string
  formatRelativeTime: (timestamp: number) => string
  onResolve?: () => void
  showActions?: boolean
}): React.ReactElement {
  return (
    <div
      className={`flex items-start justify-between p-3 rounded-lg ${
        alert.isRead ? 'bg-zinc-700/50' : 'bg-zinc-700'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`w-2 h-2 rounded-full mt-2 ${SEVERITY_COLORS[alert.severity]}`} />
        <div>
          <div className="text-white font-medium">{alert.message}</div>
          <div className="flex items-center gap-2 mt-1 text-sm text-zinc-400">
            <span>{getAccountUsername(alert.accountId)}</span>
            <span>•</span>
            <span>{ALERT_TYPE_LABELS[alert.alertType]}</span>
            <span>•</span>
            <span>{formatRelativeTime(alert.createdAt)}</span>
          </div>
        </div>
      </div>
      {showActions && !alert.isResolved && onResolve && (
        <button
          onClick={onResolve}
          className="px-3 py-1 text-sm bg-zinc-600 text-white rounded hover:bg-zinc-500"
        >
          解決
        </button>
      )}
      {alert.isResolved && (
        <span className="px-3 py-1 text-sm bg-green-600/20 text-green-400 rounded">解決済み</span>
      )}
    </div>
  )
}

// Alerts Tab Component
function AlertsTab({
  alerts,
  isLoading,
  getAccountUsername,
  formatDate,
  onMarkAsRead,
  onMarkAllAsRead,
  onResolve,
  onDelete
}: {
  alerts: MonitoringAlert[]
  isLoading: boolean
  getAccountUsername: (id: string) => string
  formatDate: (timestamp: number) => string
  onMarkAsRead: (id: string) => Promise<void>
  onMarkAllAsRead: () => Promise<void>
  onResolve: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}): React.ReactElement {
  const [filter, setFilter] = useState<'all' | 'unresolved'>('all')

  const filteredAlerts = filter === 'unresolved' ? alerts.filter((a) => !a.isResolved) : alerts

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            すべて
          </button>
          <button
            onClick={() => setFilter('unresolved')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'unresolved' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            未解決のみ
          </button>
        </div>
        <button
          onClick={onMarkAllAsRead}
          className="text-sm text-zinc-400 hover:text-white"
        >
          すべて既読にする
        </button>
      </div>

      {/* Alert List */}
      {filteredAlerts.length === 0 ? (
        <div className="text-center py-8 text-zinc-400">アラートはありません</div>
      ) : (
        <div className="space-y-2">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg ${alert.isRead ? 'bg-zinc-800/50' : 'bg-zinc-800'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className={`w-2 h-2 rounded-full mt-2 ${SEVERITY_COLORS[alert.severity]}`} />
                  <div>
                    <div className="text-white font-medium">{alert.message}</div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-zinc-400">
                      <span>{getAccountUsername(alert.accountId)}</span>
                      <span>•</span>
                      <span>{ALERT_TYPE_LABELS[alert.alertType]}</span>
                      <span>•</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${SEVERITY_COLORS[alert.severity]}`}>
                        {SEVERITY_LABELS[alert.severity]}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">{formatDate(alert.createdAt)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!alert.isRead && (
                    <button
                      onClick={() => onMarkAsRead(alert.id)}
                      className="p-1.5 text-zinc-400 hover:text-white"
                      title="既読にする"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  )}
                  {!alert.isResolved && (
                    <button
                      onClick={() => onResolve(alert.id)}
                      className="px-2 py-1 text-sm bg-zinc-700 text-white rounded hover:bg-zinc-600"
                    >
                      解決
                    </button>
                  )}
                  {alert.isResolved && (
                    <span className="px-2 py-1 text-xs bg-green-600/20 text-green-400 rounded">
                      解決済み
                    </span>
                  )}
                  <button
                    onClick={() => onDelete(alert.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-400"
                    title="削除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Config Tab Component
function ConfigTab({
  config,
  onUpdateConfig
}: {
  config: ReturnType<typeof useMonitoringStore>['config']
  onUpdateConfig: (updates: Parameters<typeof useMonitoringStore.getState>['updateConfig'][0]) => Promise<void>
}): React.ReactElement {
  if (!config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    )
  }

  return (
    <div className="bg-zinc-800 rounded-lg p-6 space-y-6">
      {/* Enable Monitoring */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-medium">自動監視</h3>
          <p className="text-sm text-zinc-400">定期的にアカウント状態をチェック</p>
        </div>
        <ToggleSwitch
          checked={config.isEnabled}
          onChange={(checked) => onUpdateConfig({ isEnabled: checked })}
        />
      </div>

      {/* Check Interval */}
      <div>
        <label className="block text-white font-medium mb-2">チェック間隔</label>
        <select
          value={config.checkIntervalMinutes}
          onChange={(e) => onUpdateConfig({ checkIntervalMinutes: Number(e.target.value) })}
          className="w-full bg-zinc-700 text-white rounded-lg px-4 py-2 border border-zinc-600 focus:border-blue-500 focus:outline-none"
        >
          <option value={15}>15分</option>
          <option value={30}>30分</option>
          <option value={60}>1時間</option>
          <option value={120}>2時間</option>
          <option value={360}>6時間</option>
          <option value={720}>12時間</option>
          <option value={1440}>24時間</option>
        </select>
      </div>

      {/* Check Options */}
      <div className="space-y-4">
        <h3 className="text-white font-medium">チェック項目</h3>
        <ConfigToggle
          label="シャドウBAN自動チェック"
          description="検索での可視性を定期的に確認"
          checked={config.autoCheckShadowBan}
          onChange={(checked) => onUpdateConfig({ autoCheckShadowBan: checked })}
        />
        <ConfigToggle
          label="ログイン状態チェック"
          description="セッションの有効性を確認"
          checked={config.autoCheckLoginStatus}
          onChange={(checked) => onUpdateConfig({ autoCheckLoginStatus: checked })}
        />
      </div>

      {/* Alert Options */}
      <div className="space-y-4">
        <h3 className="text-white font-medium">アラート条件</h3>
        <ConfigToggle
          label="ロック検出"
          description="アカウントがロックされた時に通知"
          checked={config.alertOnLock}
          onChange={(checked) => onUpdateConfig({ alertOnLock: checked })}
        />
        <ConfigToggle
          label="凍結検出"
          description="アカウントが凍結された時に通知"
          checked={config.alertOnSuspend}
          onChange={(checked) => onUpdateConfig({ alertOnSuspend: checked })}
        />
        <ConfigToggle
          label="シャドウBAN検出"
          description="シャドウBANの可能性がある時に通知"
          checked={config.alertOnShadowBan}
          onChange={(checked) => onUpdateConfig({ alertOnShadowBan: checked })}
        />
        <ConfigToggle
          label="ログイン失敗検出"
          description="ログイン状態が確認できない時に通知"
          checked={config.alertOnLoginFailure}
          onChange={(checked) => onUpdateConfig({ alertOnLoginFailure: checked })}
        />
      </div>

      {/* Notification Options */}
      <div className="space-y-4">
        <h3 className="text-white font-medium">通知設定</h3>
        <ConfigToggle
          label="デスクトップ通知"
          description="問題を検出した時にシステム通知を表示"
          checked={config.notifyDesktop}
          onChange={(checked) => onUpdateConfig({ notifyDesktop: checked })}
        />
        <ConfigToggle
          label="通知音"
          description="通知時にサウンドを再生"
          checked={config.notifySound}
          onChange={(checked) => onUpdateConfig({ notifySound: checked })}
        />
      </div>
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

// Config Toggle Component
function ConfigToggle({
  label,
  description,
  checked,
  onChange
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-white">{label}</div>
        <div className="text-sm text-zinc-400">{description}</div>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  )
}

// Reports Tab Component
function ReportsTab({
  reports,
  isLoading,
  formatDate,
  onGenerateReport,
  onDeleteReport
}: {
  reports: ReturnType<typeof useMonitoringStore>['reports']
  isLoading: boolean
  formatDate: (timestamp: number) => string
  onGenerateReport: (reportType: ReportType) => Promise<void>
  onDeleteReport: (id: string) => Promise<void>
}): React.ReactElement {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async (reportType: ReportType) => {
    setIsGenerating(true)
    await onGenerateReport(reportType)
    setIsGenerating(false)
  }

  const reportTypeLabels: Record<ReportType, string> = {
    daily: '日次レポート',
    weekly: '週次レポート',
    monthly: '月次レポート',
    custom: 'カスタム'
  }

  return (
    <div className="space-y-6">
      {/* Generate Report */}
      <div className="bg-zinc-800 rounded-lg p-4">
        <h3 className="text-white font-medium mb-4">レポート生成</h3>
        <div className="flex gap-3">
          <button
            onClick={() => handleGenerate('daily')}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            日次
          </button>
          <button
            onClick={() => handleGenerate('weekly')}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            週次
          </button>
          <button
            onClick={() => handleGenerate('monthly')}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            月次
          </button>
        </div>
      </div>

      {/* Report List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-8 text-zinc-400">レポートはありません</div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-white font-medium">{reportTypeLabels[report.reportType]}</h4>
                  <div className="text-sm text-zinc-400">
                    {formatDate(report.periodStart)} 〜 {formatDate(report.periodEnd)}
                  </div>
                </div>
                <button
                  onClick={() => onDeleteReport(report.id)}
                  className="p-2 text-zinc-400 hover:text-red-400"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>

              {/* Report Data */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-700 rounded p-3">
                  <div className="text-xs text-zinc-400">総アカウント</div>
                  <div className="text-lg text-white font-semibold">
                    {report.data.accountStats.total}
                  </div>
                </div>
                <div className="bg-zinc-700 rounded p-3">
                  <div className="text-xs text-zinc-400">正常</div>
                  <div className="text-lg text-green-400 font-semibold">
                    {report.data.accountStats.normal}
                  </div>
                </div>
                <div className="bg-zinc-700 rounded p-3">
                  <div className="text-xs text-zinc-400">問題あり</div>
                  <div className="text-lg text-red-400 font-semibold">
                    {report.data.accountStats.locked + report.data.accountStats.suspended}
                  </div>
                </div>
                <div className="bg-zinc-700 rounded p-3">
                  <div className="text-xs text-zinc-400">アラート数</div>
                  <div className="text-lg text-yellow-400 font-semibold">
                    {report.data.alertStats.total}
                  </div>
                </div>
              </div>

              {/* Action Stats */}
              <div className="mt-4 pt-4 border-t border-zinc-700">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-zinc-400">総アクション</div>
                    <div className="text-white font-medium">
                      {report.data.actionStats.totalActions}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">成功率</div>
                    <div className="text-white font-medium">
                      {report.data.actionStats.successRate.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">生成日時</div>
                    <div className="text-white font-medium text-sm">
                      {formatDate(report.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
