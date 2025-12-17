import { useEffect, useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  Send,
  Heart,
  Repeat,
  UserPlus,
  CheckCircle,
  XCircle,
  Activity,
  Calendar
} from 'lucide-react'
import { useAccountStore } from '../stores/accountStore'
import { useScheduledPostStore } from '../stores/scheduledPostStore'

interface ActionStats {
  total: number
  success: number
  failed: number
  pending: number
}

interface DailyStats {
  date: string
  posts: number
  likes: number
  reposts: number
  follows: number
}

interface AccountActionStats {
  accountId: string
  username: string
  total: number
  success: number
  failed: number
}

function Analytics(): JSX.Element {
  const { stats: accountStats, fetchStats: fetchAccountStats } = useAccountStore()
  const { stats: scheduledStats, fetchStats: fetchScheduledStats } = useScheduledPostStore()

  const [actionStats, setActionStats] = useState<ActionStats | null>(null)
  const [actionStatsByType, setActionStatsByType] = useState<Record<string, ActionStats>>({})
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [accountActionStats, setAccountActionStats] = useState<AccountActionStats[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async (): Promise<void> => {
    setIsLoading(true)
    try {
      await Promise.all([
        fetchAccountStats(),
        fetchScheduledStats(),
        loadActionStats(),
        loadActionStatsByType(),
        loadDailyStats(),
        loadAccountActionStats()
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const loadActionStats = async (): Promise<void> => {
    try {
      const stats = await window.api.analytics.getActionStats()
      setActionStats(stats)
    } catch (error) {
      console.error('Failed to load action stats:', error)
    }
  }

  const loadActionStatsByType = async (): Promise<void> => {
    try {
      const stats = await window.api.analytics.getActionStatsByType()
      setActionStatsByType(stats)
    } catch (error) {
      console.error('Failed to load action stats by type:', error)
    }
  }

  const loadDailyStats = async (): Promise<void> => {
    try {
      const stats = await window.api.analytics.getDailyStats(7)
      setDailyStats(stats)
    } catch (error) {
      console.error('Failed to load daily stats:', error)
    }
  }

  const loadAccountActionStats = async (): Promise<void> => {
    try {
      const stats = await window.api.analytics.getAccountActionStats(10)
      setAccountActionStats(stats)
    } catch (error) {
      console.error('Failed to load account action stats:', error)
    }
  }

  const getSuccessRate = (success: number, total: number): string => {
    if (total === 0) return '0%'
    return `${Math.round((success / total) * 100)}%`
  }

  const actionTypeConfig: Record<string, { label: string; icon: typeof Send; color: string; bgColor: string }> = {
    post: { label: '投稿', icon: Send, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    like: { label: 'いいね', icon: Heart, color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
    repost: { label: 'リポスト', icon: Repeat, color: 'text-green-400', bgColor: 'bg-green-500/20' },
    follow: { label: 'フォロー', icon: UserPlus, color: 'text-purple-400', bgColor: 'bg-purple-500/20' }
  }

  // Calculate max value for bar chart
  const maxDailyTotal = Math.max(
    ...dailyStats.map((d) => d.posts + d.likes + d.reposts + d.follows),
    1
  )

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">分析</h1>
          <p className="text-gray-400 text-sm mt-1">アクティビティの統計と分析</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-surface-dark rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Activity size={20} className="text-primary" />
                </div>
                <h3 className="text-sm text-gray-400">総アクション数</h3>
              </div>
              <p className="text-3xl font-bold text-white">{actionStats?.total || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                成功率: {getSuccessRate(actionStats?.success || 0, actionStats?.total || 0)}
              </p>
            </div>

            <div className="bg-surface-dark rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle size={20} className="text-green-400" />
                </div>
                <h3 className="text-sm text-gray-400">成功</h3>
              </div>
              <p className="text-3xl font-bold text-green-400">{actionStats?.success || 0}</p>
            </div>

            <div className="bg-surface-dark rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <XCircle size={20} className="text-red-400" />
                </div>
                <h3 className="text-sm text-gray-400">失敗</h3>
              </div>
              <p className="text-3xl font-bold text-red-400">{actionStats?.failed || 0}</p>
            </div>

            <div className="bg-surface-dark rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Calendar size={20} className="text-blue-400" />
                </div>
                <h3 className="text-sm text-gray-400">予約投稿</h3>
              </div>
              <p className="text-3xl font-bold text-blue-400">{scheduledStats?.pending || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                完了: {scheduledStats?.completed || 0}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Action Type Stats */}
            <div className="bg-surface-dark rounded-xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-gray-400" />
                アクション種類別
              </h2>
              <div className="space-y-4">
                {Object.entries(actionTypeConfig).map(([type, config]) => {
                  const stats = actionStatsByType[type]
                  const Icon = config.icon
                  const total = stats?.total || 0
                  const success = stats?.success || 0

                  return (
                    <div key={type} className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                        <Icon size={18} className={config.color} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-white">{config.label}</span>
                          <span className="text-sm text-gray-400">{total}件</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${config.bgColor.replace('/20', '')}`}
                            style={{ width: `${total > 0 ? (success / total) * 100 : 0}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-gray-500">
                            成功: {success}
                          </span>
                          <span className="text-xs text-gray-500">
                            失敗: {stats?.failed || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Daily Activity Chart */}
            <div className="bg-surface-dark rounded-xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-gray-400" />
                過去7日間のアクティビティ
              </h2>
              {dailyStats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <Activity size={32} className="text-gray-500 mb-3" />
                  <p className="text-gray-400 text-sm">データがありません</p>
                </div>
              ) : (
                <div className="flex items-end justify-between gap-2 h-48">
                  {dailyStats.map((day) => {
                    const total = day.posts + day.likes + day.reposts + day.follows
                    const height = (total / maxDailyTotal) * 100

                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full flex flex-col items-center justify-end h-36">
                          <div
                            className="w-full bg-gradient-to-t from-primary/80 to-primary/40 rounded-t-md min-h-[4px] transition-all"
                            style={{ height: `${Math.max(height, 3)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(day.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                        </span>
                        <span className="text-xs text-gray-400">{total}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Account Rankings */}
          <div className="bg-surface-dark rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">アカウント別アクティビティ</h2>
            {accountActionStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <Activity size={32} className="text-gray-500 mb-3" />
                <p className="text-gray-400 text-sm">データがありません</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-sm text-gray-400 pb-3 font-medium">アカウント</th>
                      <th className="text-right text-sm text-gray-400 pb-3 font-medium">合計</th>
                      <th className="text-right text-sm text-gray-400 pb-3 font-medium">成功</th>
                      <th className="text-right text-sm text-gray-400 pb-3 font-medium">失敗</th>
                      <th className="text-right text-sm text-gray-400 pb-3 font-medium">成功率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountActionStats.map((account, index) => (
                      <tr key={account.accountId} className="border-b border-white/5 last:border-0">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500 w-5">{index + 1}</span>
                            <span className="text-sm text-white">@{account.username}</span>
                          </div>
                        </td>
                        <td className="text-right text-sm text-white py-3">{account.total}</td>
                        <td className="text-right text-sm text-green-400 py-3">{account.success}</td>
                        <td className="text-right text-sm text-red-400 py-3">{account.failed}</td>
                        <td className="text-right text-sm text-gray-400 py-3">
                          {getSuccessRate(account.success, account.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Account Status Summary */}
          <div className="mt-6 bg-surface-dark rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">アカウントステータス概要</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <p className="text-3xl font-bold text-white">{accountStats.total}</p>
                <p className="text-sm text-gray-400 mt-1">総アカウント</p>
              </div>
              <div className="text-center p-4 bg-green-500/10 rounded-xl">
                <p className="text-3xl font-bold text-green-400">{accountStats.normal}</p>
                <p className="text-sm text-gray-400 mt-1">正常</p>
              </div>
              <div className="text-center p-4 bg-yellow-500/10 rounded-xl">
                <p className="text-3xl font-bold text-yellow-400">{accountStats.locked}</p>
                <p className="text-sm text-gray-400 mt-1">ロック</p>
              </div>
              <div className="text-center p-4 bg-red-500/10 rounded-xl">
                <p className="text-3xl font-bold text-red-400">{accountStats.suspended}</p>
                <p className="text-sm text-gray-400 mt-1">凍結</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Analytics
