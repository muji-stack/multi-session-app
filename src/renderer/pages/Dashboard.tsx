import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Send,
  Heart,
  Repeat,
  UserPlus,
  Clock,
  ArrowRight,
  Activity,
  Calendar,
  BarChart3,
  TrendingUp,
  Sparkles,
  Zap
} from 'lucide-react'
import { useAccountStore } from '../stores/accountStore'
import { useScheduledPostStore } from '../stores/scheduledPostStore'
import type { ActionLog } from '../../shared/types'

interface ActionLogWithAccount extends ActionLog {
  username?: string
}

interface ActionStats {
  total: number
  success: number
  failed: number
  pending: number
}

function Dashboard(): JSX.Element {
  const { stats, accounts, fetchStats, fetchAccounts } = useAccountStore()
  const { stats: scheduledStats, fetchStats: fetchScheduledStats } = useScheduledPostStore()
  const [recentLogs, setRecentLogs] = useState<ActionLogWithAccount[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [actionStats, setActionStats] = useState<ActionStats | null>(null)

  useEffect(() => {
    fetchStats()
    fetchAccounts()
    fetchScheduledStats()
    loadRecentLogs()
    loadActionStats()
  }, [fetchStats, fetchAccounts, fetchScheduledStats])

  const loadActionStats = async (): Promise<void> => {
    try {
      const stats = await window.api.analytics.getActionStats()
      setActionStats(stats)
    } catch (error) {
      console.error('Failed to load action stats:', error)
    }
  }

  const loadRecentLogs = async (): Promise<void> => {
    setIsLoadingLogs(true)
    try {
      const logs = (await window.api.post.getActionLogs(10)) as ActionLog[]
      setRecentLogs(logs)
    } catch (error) {
      console.error('Failed to load action logs:', error)
    } finally {
      setIsLoadingLogs(false)
    }
  }

  const getAccountUsername = (accountId: string | null): string => {
    if (!accountId) return '不明'
    const account = accounts.find((a) => a.id === accountId)
    return account?.username || '削除済み'
  }

  const statCards = [
    {
      label: '総アカウント数',
      value: stats.total,
      icon: Users,
      color: 'text-white',
      bgColor: 'bg-primary/20'
    },
    {
      label: '正常',
      value: stats.normal,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/20'
    },
    {
      label: 'ロック',
      value: stats.locked,
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/20'
    },
    {
      label: '凍結',
      value: stats.suspended,
      icon: XCircle,
      color: 'text-error',
      bgColor: 'bg-error/20'
    }
  ]

  const getActionIcon = (actionType: string): JSX.Element => {
    switch (actionType) {
      case 'post':
        return <Send size={14} className="text-blue-400" />
      case 'like':
        return <Heart size={14} className="text-pink-400" />
      case 'repost':
        return <Repeat size={14} className="text-green-400" />
      case 'follow':
        return <UserPlus size={14} className="text-purple-400" />
      default:
        return <Activity size={14} className="text-gray-400" />
    }
  }

  const getActionLabel = (actionType: string): string => {
    switch (actionType) {
      case 'post':
        return '投稿'
      case 'like':
        return 'いいね'
      case 'repost':
        return 'リポスト'
      case 'follow':
        return 'フォロー'
      case 'bookmark':
        return 'ブックマーク'
      default:
        return actionType
    }
  }

  const getStatusBadge = (status: string): JSX.Element => {
    switch (status) {
      case 'success':
        return (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
            成功
          </span>
        )
      case 'failed':
        return (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
            失敗
          </span>
        )
      default:
        return (
          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
            保留中
          </span>
        )
    }
  }

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'たった今'
    if (minutes < 60) return `${minutes}分前`
    if (hours < 24) return `${hours}時間前`
    return `${days}日前`
  }

  const getSuccessRate = (): string => {
    if (!actionStats || actionStats.total === 0) return '0%'
    return `${Math.round((actionStats.success / actionStats.total) * 100)}%`
  }

  return (
    <div className="p-6 h-full overflow-auto bg-gradient-dark">
      {/* Header Section with Welcome Message */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white">ダッシュボード</h1>
        </div>
        <p className="text-gray-400 text-sm ml-14">アカウントの状態と最近のアクティビティを確認できます</p>
      </div>

      {/* Stats Grid - Premium Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className={`card-premium rounded-2xl p-5 hover-lift animate-slide-up`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center shadow-lg`}
                >
                  <Icon size={22} className={stat.color} />
                </div>
                <div className={`w-2 h-2 rounded-full ${stat.color === 'text-success' ? 'bg-success status-dot success' : stat.color === 'text-warning' ? 'bg-warning status-dot warning' : stat.color === 'text-error' ? 'bg-error status-dot error' : 'bg-primary'}`} />
              </div>
              <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* Action Stats & Scheduled Posts - Premium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card-premium rounded-2xl p-5 hover-lift animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-600/20 flex items-center justify-center shadow-lg">
              <TrendingUp size={22} className="text-blue-400" />
            </div>
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400">
              {getSuccessRate()} 成功
            </span>
          </div>
          <p className="text-gray-400 text-sm mb-1">総アクション数</p>
          <p className="text-3xl font-bold text-white">{actionStats?.total || 0}</p>
        </div>

        <div className="card-premium rounded-2xl p-5 hover-lift animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-purple-600/20 flex items-center justify-center shadow-lg">
              <Calendar size={22} className="text-purple-400" />
            </div>
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-500/20 text-purple-400">
              {scheduledStats?.completed ?? 0} 完了
            </span>
          </div>
          <p className="text-gray-400 text-sm mb-1">予約投稿</p>
          <p className="text-3xl font-bold text-purple-400">{scheduledStats?.pending ?? 0}</p>
        </div>

        <Link
          to="/analytics"
          className="card-premium rounded-2xl p-5 hover-lift animate-slide-up group relative overflow-hidden"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/30 to-cyan-600/20 flex items-center justify-center shadow-lg">
                <BarChart3 size={22} className="text-cyan-400" />
              </div>
              <ArrowRight size={18} className="text-gray-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-gray-400 text-sm mb-1">詳細分析</p>
            <p className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
              統計を表示
            </p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions - Premium Design */}
        <div className="card-premium rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.35s' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-white">クイックアクション</h2>
          </div>
          <div className="space-y-3">
            <Link
              to="/accounts"
              className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-blue-500/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-600/20 flex items-center justify-center shadow-lg group-hover:shadow-blue-500/25 transition-shadow">
                  <Users size={20} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium group-hover:text-blue-400 transition-colors">アカウント管理</h3>
                  <p className="text-gray-500 text-sm">アカウントの追加・編集・削除</p>
                </div>
              </div>
              <ArrowRight
                size={18}
                className="text-gray-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all"
              />
            </Link>
            <Link
              to="/post"
              className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-green-500/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-500/30 to-green-600/20 flex items-center justify-center shadow-lg group-hover:shadow-green-500/25 transition-shadow">
                  <Send size={20} className="text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium group-hover:text-green-400 transition-colors">一括投稿</h3>
                  <p className="text-gray-500 text-sm">複数アカウントに同時投稿</p>
                </div>
              </div>
              <ArrowRight
                size={18}
                className="text-gray-600 group-hover:text-green-400 group-hover:translate-x-1 transition-all"
              />
            </Link>
            <Link
              to="/engagement"
              className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-pink-500/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500/30 to-pink-600/20 flex items-center justify-center shadow-lg group-hover:shadow-pink-500/25 transition-shadow">
                  <Heart size={20} className="text-pink-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium group-hover:text-pink-400 transition-colors">エンゲージメント</h3>
                  <p className="text-gray-500 text-sm">いいね・リポスト・フォロー</p>
                </div>
              </div>
              <ArrowRight
                size={18}
                className="text-gray-600 group-hover:text-pink-400 group-hover:translate-x-1 transition-all"
              />
            </Link>
            <Link
              to="/check"
              className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-orange-500/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500/30 to-orange-600/20 flex items-center justify-center shadow-lg group-hover:shadow-orange-500/25 transition-shadow">
                  <CheckCircle size={20} className="text-orange-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium group-hover:text-orange-400 transition-colors">ステータスチェック</h3>
                  <p className="text-gray-500 text-sm">アカウントの状態を確認</p>
                </div>
              </div>
              <ArrowRight
                size={18}
                className="text-gray-600 group-hover:text-orange-400 group-hover:translate-x-1 transition-all"
              />
            </Link>
            <Link
              to="/schedule"
              className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-purple-500/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/30 to-purple-600/20 flex items-center justify-center shadow-lg group-hover:shadow-purple-500/25 transition-shadow">
                  <Calendar size={20} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium group-hover:text-purple-400 transition-colors">予約投稿</h3>
                  <p className="text-gray-500 text-sm">投稿を予約してスケジュール管理</p>
                </div>
              </div>
              <ArrowRight
                size={18}
                className="text-gray-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all"
              />
            </Link>
          </div>
        </div>

        {/* Recent Activity - Premium Design */}
        <div className="card-premium rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20">
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">最近のアクティビティ</h2>
            </div>
            <Link
              to="/analytics"
              className="px-3 py-1.5 text-sm text-primary hover:text-white bg-primary/10 hover:bg-primary rounded-lg transition-all"
            >
              すべて表示
            </Link>
          </div>

          {isLoadingLogs ? (
            <div className="flex items-center justify-center h-48">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-primary/20"></div>
                <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-primary animate-spin"></div>
              </div>
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <Activity size={28} className="text-gray-600" />
              </div>
              <p className="text-gray-400 text-sm font-medium">アクティビティはありません</p>
              <p className="text-gray-600 text-xs mt-1 max-w-[200px]">
                投稿やエンゲージメントを実行するとここに表示されます
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log, index) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all animate-slide-up"
                  style={{ animationDelay: `${0.45 + index * 0.03}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                      {getActionIcon(log.actionType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">
                          @{getAccountUsername(log.accountId)}
                        </span>
                        <span className="text-gray-500 text-xs px-1.5 py-0.5 rounded bg-white/5">
                          {getActionLabel(log.actionType)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600 text-xs mt-0.5">
                        <Clock size={10} />
                        {formatTimeAgo(log.createdAt)}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(log.status)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
