import { useEffect, useState } from 'react'
import {
  Zap,
  Plus,
  Trash2,
  Edit3,
  Play,
  Pause,
  Clock,
  Target,
  Users,
  TrendingUp,
  Heart,
  Repeat,
  UserPlus,
  UserMinus,
  Hash,
  Search,
  Home,
  List,
  Loader2,
  Activity,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react'
import { Button, Input } from '../components/ui'
import Modal from '../components/ui/Modal'
import { useAutomationStore } from '../stores/automationStore'
import { useAccountStore } from '../stores/accountStore'
import type {
  AutomationTask,
  AutomationActionType,
  AutomationTargetType,
  AutomationLog,
  ActionStatus
} from '../../shared/types'

type TabType = 'tasks' | 'logs'
type LogFilterStatus = 'all' | 'success' | 'failed' | 'pending'

function Automation(): JSX.Element {
  const {
    tasks,
    logs,
    stats,
    isLoading,
    fetchTasks,
    fetchLogs,
    fetchStats,
    createTask,
    updateTask,
    toggleTask,
    deleteTask
  } = useAutomationStore()

  const { accounts, fetchAccounts } = useAccountStore()

  const [activeTab, setActiveTab] = useState<TabType>('tasks')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTask, setEditingTask] = useState<AutomationTask | null>(null)
  const [logFilter, setLogFilter] = useState<LogFilterStatus>('all')
  const [logActionFilter, setLogActionFilter] = useState<AutomationActionType | 'all'>('all')

  // Form state
  const [formName, setFormName] = useState('')
  const [formActionType, setFormActionType] = useState<AutomationActionType>('like')
  const [formTargetType, setFormTargetType] = useState<AutomationTargetType>('timeline')
  const [formTargetValue, setFormTargetValue] = useState('')
  const [formAccountIds, setFormAccountIds] = useState<string[]>([])
  const [formIntervalMinutes, setFormIntervalMinutes] = useState('60')
  const [formDailyLimit, setFormDailyLimit] = useState('50')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    fetchTasks()
    fetchStats()
    fetchAccounts()
  }, [fetchTasks, fetchStats, fetchAccounts])

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs(200)
    }
  }, [activeTab, fetchLogs])

  const resetForm = (): void => {
    setFormName('')
    setFormActionType('like')
    setFormTargetType('timeline')
    setFormTargetValue('')
    setFormAccountIds([])
    setFormIntervalMinutes('60')
    setFormDailyLimit('50')
    setFormError('')
  }

  const openAddModal = (): void => {
    resetForm()
    setShowAddModal(true)
  }

  const openEditModal = (task: AutomationTask): void => {
    setFormName(task.name)
    setFormActionType(task.actionType)
    setFormTargetType(task.targetType)
    setFormTargetValue(task.targetValue || '')
    setFormAccountIds(task.accountIds)
    setFormIntervalMinutes(task.intervalMinutes.toString())
    setFormDailyLimit(task.dailyLimit.toString())
    setFormError('')
    setEditingTask(task)
  }

  const closeModal = (): void => {
    setShowAddModal(false)
    setEditingTask(null)
    resetForm()
  }

  const handleSubmit = async (): Promise<void> => {
    if (!formName.trim()) {
      setFormError('タスク名を入力してください')
      return
    }
    if (formAccountIds.length === 0) {
      setFormError('アカウントを選択してください')
      return
    }
    if (formTargetType !== 'timeline' && !formTargetValue.trim()) {
      setFormError('ターゲット値を入力してください')
      return
    }

    const intervalMinutes = parseInt(formIntervalMinutes)
    const dailyLimit = parseInt(formDailyLimit)

    if (isNaN(intervalMinutes) || intervalMinutes < 1) {
      setFormError('有効な間隔を入力してください')
      return
    }
    if (isNaN(dailyLimit) || dailyLimit < 1) {
      setFormError('有効な1日の上限を入力してください')
      return
    }

    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          name: formName.trim(),
          actionType: formActionType,
          targetType: formTargetType,
          targetValue: formTargetType !== 'timeline' ? formTargetValue.trim() : null,
          accountIds: formAccountIds,
          intervalMinutes,
          dailyLimit
        })
      } else {
        await createTask({
          name: formName.trim(),
          actionType: formActionType,
          targetType: formTargetType,
          targetValue: formTargetType !== 'timeline' ? formTargetValue.trim() : null,
          accountIds: formAccountIds,
          intervalMinutes,
          dailyLimit
        })
      }
      closeModal()
    } catch (error) {
      setFormError('保存に失敗しました')
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (confirm('このタスクを削除しますか？')) {
      await deleteTask(id)
    }
  }

  const handleToggle = async (id: string): Promise<void> => {
    await toggleTask(id)
  }

  const toggleAccountSelection = (accountId: string): void => {
    setFormAccountIds((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]
    )
  }

  const selectAllAccounts = (): void => {
    setFormAccountIds(accounts.map((a) => a.id))
  }

  const clearAccountSelection = (): void => {
    setFormAccountIds([])
  }

  const getActionIcon = (actionType: AutomationActionType, size: number = 18): JSX.Element => {
    switch (actionType) {
      case 'like':
        return <Heart size={size} className="text-red-400" />
      case 'repost':
        return <Repeat size={size} className="text-green-400" />
      case 'follow':
        return <UserPlus size={size} className="text-blue-400" />
      case 'unfollow':
        return <UserMinus size={size} className="text-orange-400" />
    }
  }

  const getActionLabel = (actionType: AutomationActionType): string => {
    switch (actionType) {
      case 'like':
        return 'いいね'
      case 'repost':
        return 'リポスト'
      case 'follow':
        return 'フォロー'
      case 'unfollow':
        return 'フォロー解除'
    }
  }

  const getTargetIcon = (targetType: AutomationTargetType): JSX.Element => {
    switch (targetType) {
      case 'keyword':
        return <Search size={16} />
      case 'hashtag':
        return <Hash size={16} />
      case 'timeline':
        return <Home size={16} />
      case 'user_list':
        return <List size={16} />
    }
  }

  const getTargetLabel = (targetType: AutomationTargetType): string => {
    switch (targetType) {
      case 'keyword':
        return 'キーワード'
      case 'hashtag':
        return 'ハッシュタグ'
      case 'timeline':
        return 'タイムライン'
      case 'user_list':
        return 'ユーザーリスト'
    }
  }

  const getStatusIcon = (status: ActionStatus): JSX.Element => {
    switch (status) {
      case 'success':
        return <CheckCircle size={16} className="text-green-400" />
      case 'failed':
        return <XCircle size={16} className="text-red-400" />
      case 'pending':
        return <AlertCircle size={16} className="text-yellow-400" />
    }
  }

  const getStatusLabel = (status: ActionStatus): string => {
    switch (status) {
      case 'success':
        return '成功'
      case 'failed':
        return '失敗'
      case 'pending':
        return '処理中'
    }
  }

  const formatNextRun = (timestamp: number | null): string => {
    if (!timestamp) return '未スケジュール'
    const date = new Date(timestamp)
    const now = new Date()
    const diff = timestamp - now.getTime()

    if (diff < 0) return '実行中...'
    if (diff < 60 * 1000) return 'まもなく'
    if (diff < 60 * 60 * 1000) return `${Math.round(diff / 60000)}分後`
    return date.toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatLogTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getAccountUsername = (accountId: string): string => {
    const account = accounts.find((a) => a.id === accountId)
    return account ? `@${account.username}` : 'Unknown'
  }

  const getTaskName = (taskId: string): string => {
    const task = tasks.find((t) => t.id === taskId)
    return task?.name || 'Unknown Task'
  }

  const filteredLogs = logs.filter((log) => {
    if (logFilter !== 'all' && log.status !== logFilter) return false
    if (logActionFilter !== 'all' && log.actionType !== logActionFilter) return false
    return true
  })

  const exportLogs = (): void => {
    const csvContent = [
      ['日時', 'タスク名', 'アカウント', 'アクション', 'ステータス', 'URL', 'エラー'].join(','),
      ...filteredLogs.map((log) =>
        [
          formatLogTime(log.createdAt),
          getTaskName(log.taskId),
          getAccountUsername(log.accountId),
          getActionLabel(log.actionType),
          getStatusLabel(log.status),
          log.targetUrl || '',
          log.errorMessage || ''
        ].join(',')
      )
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `automation_logs_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white">自動化</h1>
          <p className="text-gray-400 text-sm mt-1">
            自動アクションの設定と管理（{tasks.length}件のタスク）
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'logs' && (
            <Button variant="secondary" leftIcon={<Download size={18} />} onClick={exportLogs}>
              CSVエクスポート
            </Button>
          )}
          {activeTab === 'tasks' && (
            <Button variant="primary" leftIcon={<Plus size={18} />} onClick={openAddModal}>
              タスクを追加
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 p-6 border-b border-white/10">
          <div className="bg-surface-dark rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Zap size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">総タスク</p>
                <p className="text-white text-xl font-bold">{stats.totalTasks}</p>
              </div>
            </div>
          </div>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Play size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">有効なタスク</p>
                <p className="text-white text-xl font-bold">{stats.enabledTasks}</p>
              </div>
            </div>
          </div>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Activity size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">本日のアクション</p>
                <p className="text-white text-xl font-bold">{stats.totalActionsToday}</p>
              </div>
            </div>
          </div>
          <div className="bg-surface-dark rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <TrendingUp size={20} className="text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">成功率</p>
                <p className="text-white text-xl font-bold">{stats.successRate}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-4 px-6 pt-4 border-b border-white/10">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'tasks'
              ? 'text-primary border-primary'
              : 'text-gray-400 border-transparent hover:text-white'
          }`}
        >
          <Zap size={16} />
          タスク一覧
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'logs'
              ? 'text-primary border-primary'
              : 'text-gray-400 border-transparent hover:text-white'
          }`}
        >
          <FileText size={16} />
          実行ログ
          {logs.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-white/10">
              {logs.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'tasks' ? (
          // Tasks Tab
          isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Zap size={32} className="text-gray-500" />
              </div>
              <h3 className="text-white font-medium mb-2">自動化タスクがありません</h3>
              <p className="text-gray-400 text-sm mb-4">
                自動化タスクを作成して、いいね・リポスト・フォローを自動で実行しましょう
              </p>
              <Button variant="primary" leftIcon={<Plus size={18} />} onClick={openAddModal}>
                タスクを追加
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`bg-surface-dark rounded-xl border p-4 transition-colors ${
                    task.isEnabled ? 'border-primary/30' : 'border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          task.isEnabled ? 'bg-primary/20' : 'bg-white/5'
                        }`}
                      >
                        {getActionIcon(task.actionType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-medium">{task.name}</h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              task.isEnabled
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}
                          >
                            {task.isEnabled ? '有効' : '無効'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-gray-400 text-sm flex items-center gap-1">
                            {getActionIcon(task.actionType, 14)}
                            {getActionLabel(task.actionType)}
                          </span>
                          <span className="text-gray-400 text-sm flex items-center gap-1">
                            {getTargetIcon(task.targetType)}
                            {getTargetLabel(task.targetType)}
                            {task.targetValue && (
                              <span className="text-gray-500">: {task.targetValue}</span>
                            )}
                          </span>
                          <span className="text-gray-400 text-sm flex items-center gap-1">
                            <Users size={14} />
                            {task.accountIds.length}アカウント
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Progress */}
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-sm">
                          <Target size={14} className="text-gray-400" />
                          <span className="text-white">
                            {task.todayCount} / {task.dailyLimit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <Clock size={12} />
                          <span>{formatNextRun(task.nextRunAt)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant={task.isEnabled ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => handleToggle(task.id)}
                        >
                          {task.isEnabled ? <Pause size={16} /> : <Play size={16} />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(task)}>
                          <Edit3 size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(task.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // Logs Tab
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-400" />
                <span className="text-sm text-gray-400">フィルター:</span>
              </div>
              <div className="flex gap-2">
                {(
                  [
                    { value: 'all', label: 'すべて' },
                    { value: 'success', label: '成功' },
                    { value: 'failed', label: '失敗' },
                    { value: 'pending', label: '処理中' }
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setLogFilter(value)}
                    className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                      logFilter === value
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex gap-2">
                {(
                  [
                    { value: 'all', label: 'すべて' },
                    { value: 'like', label: 'いいね' },
                    { value: 'repost', label: 'リポスト' },
                    { value: 'follow', label: 'フォロー' },
                    { value: 'unfollow', label: 'フォロー解除' }
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setLogActionFilter(value)}
                    className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                      logActionFilter === value
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<RefreshCw size={14} />}
                  onClick={() => fetchLogs(200)}
                >
                  更新
                </Button>
              </div>
            </div>

            {/* Logs List */}
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <FileText size={32} className="text-gray-500" />
                </div>
                <h3 className="text-white font-medium mb-2">ログがありません</h3>
                <p className="text-gray-400 text-sm">
                  自動化タスクを実行すると、ここにログが表示されます
                </p>
              </div>
            ) : (
              <div className="bg-surface-dark rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">
                        日時
                      </th>
                      <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">
                        タスク
                      </th>
                      <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">
                        アカウント
                      </th>
                      <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">
                        アクション
                      </th>
                      <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">
                        ステータス
                      </th>
                      <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">
                        詳細
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {formatLogTime(log.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-white">{getTaskName(log.taskId)}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {getAccountUsername(log.accountId)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.actionType, 14)}
                            <span className="text-sm text-gray-300">
                              {getActionLabel(log.actionType)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(log.status)}
                            <span
                              className={`text-sm ${
                                log.status === 'success'
                                  ? 'text-green-400'
                                  : log.status === 'failed'
                                    ? 'text-red-400'
                                    : 'text-yellow-400'
                              }`}
                            >
                              {getStatusLabel(log.status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {log.errorMessage || log.targetUrl || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal || editingTask !== null}
        onClose={closeModal}
        title={editingTask ? 'タスクを編集' : 'タスクを追加'}
        size="lg"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-300 mb-2">タスク名</label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="例: タイムラインいいね自動化"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">アクションタイプ</label>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { type: 'like', label: 'いいね', icon: Heart },
                  { type: 'repost', label: 'リポスト', icon: Repeat },
                  { type: 'follow', label: 'フォロー', icon: UserPlus },
                  { type: 'unfollow', label: 'フォロー解除', icon: UserMinus }
                ] as const
              ).map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setFormActionType(type)}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                    formActionType === type
                      ? 'bg-primary text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">ターゲットタイプ</label>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { type: 'timeline', label: 'タイムライン', icon: Home },
                  { type: 'keyword', label: 'キーワード', icon: Search },
                  { type: 'hashtag', label: 'ハッシュタグ', icon: Hash },
                  { type: 'user_list', label: 'ユーザー', icon: List }
                ] as const
              ).map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setFormTargetType(type)}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                    formTargetType === type
                      ? 'bg-primary text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {formTargetType !== 'timeline' && (
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                {formTargetType === 'keyword' && 'キーワード'}
                {formTargetType === 'hashtag' && 'ハッシュタグ'}
                {formTargetType === 'user_list' && 'ユーザー名'}
              </label>
              <Input
                value={formTargetValue}
                onChange={(e) => setFormTargetValue(e.target.value)}
                placeholder={
                  formTargetType === 'keyword'
                    ? '例: プログラミング'
                    : formTargetType === 'hashtag'
                      ? '例: #tech'
                      : '例: @username'
                }
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">実行間隔（分）</label>
              <Input
                type="number"
                value={formIntervalMinutes}
                onChange={(e) => setFormIntervalMinutes(e.target.value)}
                placeholder="60"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">1日の上限</label>
              <Input
                type="number"
                value={formDailyLimit}
                onChange={(e) => setFormDailyLimit(e.target.value)}
                placeholder="50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-300">
                対象アカウント ({formAccountIds.length}件選択中)
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selectAllAccounts}
                  className="text-xs text-primary hover:text-primary/80"
                >
                  すべて選択
                </button>
                <button
                  onClick={clearAccountSelection}
                  className="text-xs text-gray-400 hover:text-gray-300"
                >
                  選択解除
                </button>
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto bg-white/5 rounded-lg border border-white/10">
              {accounts.map((account) => (
                <label
                  key={account.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formAccountIds.includes(account.id)}
                    onChange={() => toggleAccountSelection(account.id)}
                    className="w-4 h-4 rounded border-gray-600 bg-white/10 text-primary focus:ring-primary"
                  />
                  <span className="text-white text-sm">@{account.username}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={closeModal}>
              キャンセル
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              {editingTask ? '保存' : '追加'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Automation
