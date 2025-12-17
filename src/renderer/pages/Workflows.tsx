import { useEffect, useState } from 'react'
import {
  GitBranch,
  Plus,
  Trash2,
  Edit3,
  Play,
  Pause,
  Clock,
  Copy,
  ChevronRight,
  ChevronDown,
  Loader2,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Zap,
  Timer,
  GitMerge,
  RefreshCw,
  Settings,
  ArrowRight,
  Heart,
  Repeat,
  UserPlus,
  UserMinus,
  MessageSquare,
  Bell,
  Search as SearchIcon
} from 'lucide-react'
import { Button, Input } from '../components/ui'
import Modal from '../components/ui/Modal'
import { useWorkflowStore } from '../stores/workflowStore'
import { useAccountStore } from '../stores/accountStore'
import { useToastStore } from '../stores/toastStore'
import type {
  Workflow,
  WorkflowStep,
  WorkflowTemplate,
  WorkflowLog,
  WorkflowTriggerType,
  WorkflowStepType,
  WorkflowActionType,
  WorkflowConditionType
} from '../../shared/types'

type TabType = 'workflows' | 'templates' | 'logs'

function Workflows(): JSX.Element {
  const {
    workflows,
    currentWorkflow,
    templates,
    logs,
    stats,
    isLoading,
    isExecuting,
    fetchWorkflows,
    fetchWorkflowWithSteps,
    createWorkflow,
    updateWorkflow,
    toggleWorkflow,
    deleteWorkflow,
    executeWorkflow,
    createStep,
    updateStep,
    deleteStep,
    fetchTemplates,
    createFromTemplate,
    fetchLogs,
    fetchStats,
    clearCurrentWorkflow
  } = useWorkflowStore()

  const { accounts, fetchAccounts } = useAccountStore()
  const { showToast } = useToastStore()

  const [activeTab, setActiveTab] = useState<TabType>('workflows')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showStepModal, setShowStepModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set())
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formTriggerType, setFormTriggerType] = useState<WorkflowTriggerType>('manual')
  const [formIntervalMinutes, setFormIntervalMinutes] = useState('60')
  const [formError, setFormError] = useState('')

  // Step form state
  const [stepType, setStepType] = useState<WorkflowStepType>('action')
  const [stepActionType, setStepActionType] = useState<WorkflowActionType>('like')
  const [stepConditionType, setStepConditionType] = useState<WorkflowConditionType>('time_range')
  const [stepTargetKeyword, setStepTargetKeyword] = useState('')
  const [stepTargetCount, setStepTargetCount] = useState('5')
  const [stepDelaySeconds, setStepDelaySeconds] = useState('10')
  const [stepNotificationMessage, setStepNotificationMessage] = useState('')
  const [stepAccountIds, setStepAccountIds] = useState<string[]>([])
  const [stepStartHour, setStepStartHour] = useState('9')
  const [stepEndHour, setStepEndHour] = useState('21')
  const [stepProbability, setStepProbability] = useState('0.5')

  useEffect(() => {
    fetchWorkflows()
    fetchTemplates()
    fetchStats()
    fetchAccounts()
  }, [fetchWorkflows, fetchTemplates, fetchStats, fetchAccounts])

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs(100)
    }
  }, [activeTab, fetchLogs])

  const resetForm = (): void => {
    setFormName('')
    setFormDescription('')
    setFormTriggerType('manual')
    setFormIntervalMinutes('60')
    setFormError('')
  }

  const resetStepForm = (): void => {
    setStepType('action')
    setStepActionType('like')
    setStepConditionType('time_range')
    setStepTargetKeyword('')
    setStepTargetCount('5')
    setStepDelaySeconds('10')
    setStepNotificationMessage('')
    setStepAccountIds([])
    setStepStartHour('9')
    setStepEndHour('21')
    setStepProbability('0.5')
  }

  const handleCreateWorkflow = async (): Promise<void> => {
    if (!formName.trim()) {
      setFormError('ワークフロー名を入力してください')
      return
    }

    try {
      const triggerConfig =
        formTriggerType === 'schedule'
          ? { intervalMinutes: parseInt(formIntervalMinutes) }
          : undefined

      await createWorkflow({
        name: formName.trim(),
        description: formDescription.trim() || null,
        triggerType: formTriggerType,
        triggerConfig
      })
      setShowCreateModal(false)
      resetForm()
      showToast('success', 'ワークフローを作成しました')
    } catch {
      setFormError('作成に失敗しました')
    }
  }

  const handleUpdateWorkflow = async (): Promise<void> => {
    if (!selectedWorkflow || !formName.trim()) {
      setFormError('ワークフロー名を入力してください')
      return
    }

    try {
      const triggerConfig =
        formTriggerType === 'schedule'
          ? { intervalMinutes: parseInt(formIntervalMinutes) }
          : undefined

      await updateWorkflow(selectedWorkflow.id, {
        name: formName.trim(),
        description: formDescription.trim() || null,
        triggerType: formTriggerType,
        triggerConfig
      })
      setShowEditModal(false)
      resetForm()
      showToast('success', 'ワークフローを更新しました')
    } catch {
      setFormError('更新に失敗しました')
    }
  }

  const handleDeleteWorkflow = async (id: string): Promise<void> => {
    if (confirm('このワークフローを削除しますか？')) {
      await deleteWorkflow(id)
      showToast('success', 'ワークフローを削除しました')
    }
  }

  const handleToggleWorkflow = async (id: string): Promise<void> => {
    await toggleWorkflow(id)
  }

  const handleExecuteWorkflow = async (id: string): Promise<void> => {
    const result = await executeWorkflow(id)
    if (result.success) {
      showToast('success', 'ワークフローを実行しました')
    } else {
      showToast('error', result.error || 'ワークフローの実行に失敗しました')
    }
  }

  const openEditModal = (workflow: Workflow): void => {
    setSelectedWorkflow(workflow)
    setFormName(workflow.name)
    setFormDescription(workflow.description || '')
    setFormTriggerType(workflow.triggerType)
    setFormIntervalMinutes(workflow.triggerConfig?.intervalMinutes?.toString() || '60')
    setFormError('')
    setShowEditModal(true)
  }

  const toggleExpand = async (workflowId: string): Promise<void> => {
    const newExpanded = new Set(expandedWorkflows)
    if (newExpanded.has(workflowId)) {
      newExpanded.delete(workflowId)
      clearCurrentWorkflow()
    } else {
      newExpanded.add(workflowId)
      await fetchWorkflowWithSteps(workflowId)
    }
    setExpandedWorkflows(newExpanded)
  }

  const openStepModal = (workflow: Workflow, step?: WorkflowStep): void => {
    setSelectedWorkflow(workflow)
    if (step) {
      setEditingStep(step)
      setStepType(step.stepType)
      setStepActionType(step.actionType || 'like')
      setStepConditionType(step.conditionType || 'time_range')
      setStepTargetKeyword(step.actionConfig?.targetKeyword || '')
      setStepTargetCount(step.actionConfig?.targetCount?.toString() || '5')
      setStepDelaySeconds(step.actionConfig?.delaySeconds?.toString() || '10')
      setStepNotificationMessage(step.actionConfig?.notificationMessage || '')
      setStepAccountIds(step.actionConfig?.accountIds || [])
      setStepStartHour(step.conditionConfig?.startHour?.toString() || '9')
      setStepEndHour(step.conditionConfig?.endHour?.toString() || '21')
      setStepProbability(step.conditionConfig?.probability?.toString() || '0.5')
    } else {
      resetStepForm()
      setEditingStep(null)
    }
    setShowStepModal(true)
  }

  const handleSaveStep = async (): Promise<void> => {
    if (!selectedWorkflow) return

    const actionConfig =
      stepType === 'action'
        ? {
            targetKeyword: stepTargetKeyword || undefined,
            targetCount: parseInt(stepTargetCount) || 5,
            accountIds: stepAccountIds.length > 0 ? stepAccountIds : undefined,
            notificationMessage: stepActionType === 'send_notification' ? stepNotificationMessage : undefined
          }
        : stepType === 'delay'
          ? { delaySeconds: parseInt(stepDelaySeconds) || 10 }
          : undefined

    const conditionConfig =
      stepType === 'condition'
        ? {
            startHour: stepConditionType === 'time_range' ? parseInt(stepStartHour) : undefined,
            endHour: stepConditionType === 'time_range' ? parseInt(stepEndHour) : undefined,
            probability: stepConditionType === 'random_chance' ? parseFloat(stepProbability) : undefined
          }
        : undefined

    if (editingStep) {
      await updateStep(editingStep.id, {
        stepType,
        actionType: stepType === 'action' ? stepActionType : null,
        actionConfig,
        conditionType: stepType === 'condition' ? stepConditionType : null,
        conditionConfig
      })
    } else {
      const stepOrder = currentWorkflow?.steps.length || 0
      await createStep({
        workflowId: selectedWorkflow.id,
        stepOrder,
        stepType,
        actionType: stepType === 'action' ? stepActionType : null,
        actionConfig,
        conditionType: stepType === 'condition' ? stepConditionType : null,
        conditionConfig
      })
    }

    setShowStepModal(false)
    resetStepForm()
    showToast('success', editingStep ? 'ステップを更新しました' : 'ステップを追加しました')
  }

  const handleDeleteStep = async (stepId: string): Promise<void> => {
    if (confirm('このステップを削除しますか？')) {
      await deleteStep(stepId)
      showToast('success', 'ステップを削除しました')
    }
  }

  const handleCreateFromTemplate = async (template: WorkflowTemplate): Promise<void> => {
    const name = prompt('ワークフロー名を入力してください', `${template.name}のコピー`)
    if (name) {
      const workflow = await createFromTemplate(template.id, name)
      if (workflow) {
        showToast('success', 'テンプレートからワークフローを作成しました')
        setActiveTab('workflows')
      } else {
        showToast('error', '作成に失敗しました')
      }
    }
  }

  const getTriggerIcon = (type: WorkflowTriggerType): JSX.Element => {
    switch (type) {
      case 'schedule':
        return <Clock className="w-4 h-4" />
      case 'event':
        return <Zap className="w-4 h-4" />
      default:
        return <Play className="w-4 h-4" />
    }
  }

  const getTriggerLabel = (type: WorkflowTriggerType): string => {
    switch (type) {
      case 'schedule':
        return 'スケジュール'
      case 'event':
        return 'イベント'
      default:
        return '手動'
    }
  }

  const getStepIcon = (step: WorkflowStep): JSX.Element => {
    if (step.stepType === 'condition') {
      return <GitMerge className="w-4 h-4 text-yellow-400" />
    }
    if (step.stepType === 'delay') {
      return <Timer className="w-4 h-4 text-blue-400" />
    }
    if (step.stepType === 'loop') {
      return <RefreshCw className="w-4 h-4 text-purple-400" />
    }

    switch (step.actionType) {
      case 'like':
        return <Heart className="w-4 h-4 text-pink-400" />
      case 'repost':
        return <Repeat className="w-4 h-4 text-green-400" />
      case 'follow':
        return <UserPlus className="w-4 h-4 text-blue-400" />
      case 'unfollow':
        return <UserMinus className="w-4 h-4 text-orange-400" />
      case 'post':
        return <MessageSquare className="w-4 h-4 text-cyan-400" />
      case 'send_notification':
        return <Bell className="w-4 h-4 text-yellow-400" />
      case 'check_status':
        return <SearchIcon className="w-4 h-4 text-gray-400" />
      default:
        return <Settings className="w-4 h-4 text-gray-400" />
    }
  }

  const getStepLabel = (step: WorkflowStep): string => {
    if (step.stepType === 'condition') {
      switch (step.conditionType) {
        case 'time_range':
          return `時間条件 (${step.conditionConfig?.startHour}時〜${step.conditionConfig?.endHour}時)`
        case 'random_chance':
          return `ランダム (${(step.conditionConfig?.probability || 0) * 100}%)`
        case 'account_status':
          return 'アカウント状態チェック'
        default:
          return '条件'
      }
    }
    if (step.stepType === 'delay') {
      const seconds = step.actionConfig?.delaySeconds || 0
      const minutes = step.actionConfig?.delayMinutes || 0
      return `待機 (${minutes > 0 ? `${minutes}分` : ''}${seconds > 0 ? `${seconds}秒` : ''})`
    }
    if (step.stepType === 'loop') {
      return 'ループ'
    }

    switch (step.actionType) {
      case 'like':
        return `いいね (${step.actionConfig?.targetCount || 1}件)`
      case 'repost':
        return `リポスト (${step.actionConfig?.targetCount || 1}件)`
      case 'follow':
        return 'フォロー'
      case 'unfollow':
        return 'フォロー解除'
      case 'post':
        return '投稿'
      case 'send_notification':
        return '通知送信'
      case 'check_status':
        return 'ステータスチェック'
      default:
        return 'アクション'
    }
  }

  const formatDate = (timestamp: number | null): string => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleString('ja-JP')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="w-8 h-8 text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">ワークフロー</h1>
            <p className="text-sm text-gray-400">
              アクションのシーケンスを定義して自動実行
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          新規作成
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <FileText className="w-4 h-4" />
              ワークフロー数
            </div>
            <div className="text-2xl font-bold text-white">{stats.totalWorkflows}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Play className="w-4 h-4" />
              有効
            </div>
            <div className="text-2xl font-bold text-green-400">{stats.enabledWorkflows}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Activity className="w-4 h-4" />
              総実行回数
            </div>
            <div className="text-2xl font-bold text-blue-400">{stats.totalRuns}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              成功率
            </div>
            <div className="text-2xl font-bold text-purple-400">{stats.successRate}%</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('workflows')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'workflows'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <GitBranch className="w-4 h-4 inline-block mr-2" />
          ワークフロー
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'templates'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Copy className="w-4 h-4 inline-block mr-2" />
          テンプレート
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'logs'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4 inline-block mr-2" />
          実行ログ
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      ) : activeTab === 'workflows' ? (
        <div className="space-y-4">
          {workflows.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>ワークフローがありません</p>
              <p className="text-sm mt-2">新規作成またはテンプレートから始めましょう</p>
            </div>
          ) : (
            workflows.map((workflow) => (
              <div key={workflow.id} className="bg-gray-800 rounded-lg overflow-hidden">
                {/* Workflow Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleExpand(workflow.id)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {expandedWorkflows.has(workflow.id) ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white">{workflow.name}</h3>
                        <span
                          className={`px-2 py-0.5 text-xs rounded ${
                            workflow.isEnabled
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-600/50 text-gray-400'
                          }`}
                        >
                          {workflow.isEnabled ? '有効' : '無効'}
                        </span>
                      </div>
                      {workflow.description && (
                        <p className="text-sm text-gray-400 mt-1">{workflow.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          {getTriggerIcon(workflow.triggerType)}
                          {getTriggerLabel(workflow.triggerType)}
                          {workflow.triggerType === 'schedule' &&
                            workflow.triggerConfig?.intervalMinutes && (
                              <span className="ml-1">
                                (毎{workflow.triggerConfig.intervalMinutes}分)
                              </span>
                            )}
                        </span>
                        <span>実行回数: {workflow.runCount}</span>
                        {workflow.lastRunAt && (
                          <span>最終実行: {formatDate(workflow.lastRunAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExecuteWorkflow(workflow.id)}
                      disabled={isExecuting}
                    >
                      {isExecuting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleWorkflow(workflow.id)}
                    >
                      {workflow.isEnabled ? (
                        <Pause className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <Play className="w-4 h-4 text-green-400" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(workflow)}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </div>

                {/* Workflow Steps */}
                {expandedWorkflows.has(workflow.id) && (
                  <div className="border-t border-gray-700 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-300">ステップ</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openStepModal(workflow)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        追加
                      </Button>
                    </div>
                    {currentWorkflow?.id === workflow.id && currentWorkflow.steps.length > 0 ? (
                      <div className="space-y-2">
                        {currentWorkflow.steps.map((step, index) => (
                          <div
                            key={step.id}
                            className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3"
                          >
                            <div className="flex items-center gap-2 text-gray-500 text-sm min-w-[40px]">
                              <span>{index + 1}</span>
                              <ArrowRight className="w-3 h-3" />
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                              {getStepIcon(step)}
                              <span className="text-sm text-white">{getStepLabel(step)}</span>
                              {step.actionConfig?.targetKeyword && (
                                <span className="text-xs text-gray-400">
                                  ({step.actionConfig.targetKeyword})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openStepModal(workflow, step)}
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteStep(step.id)}
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        ステップがありません
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'templates' ? (
        <div className="grid grid-cols-2 gap-4">
          {templates.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-gray-400">
              <Copy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>テンプレートがありません</p>
            </div>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-white">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-gray-400 mt-1">{template.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`px-2 py-0.5 text-xs rounded ${
                          template.category === 'engagement'
                            ? 'bg-pink-500/20 text-pink-400'
                            : template.category === 'posting'
                              ? 'bg-blue-500/20 text-blue-400'
                              : template.category === 'monitoring'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {template.category === 'engagement'
                          ? 'エンゲージメント'
                          : template.category === 'posting'
                            ? '投稿'
                            : template.category === 'monitoring'
                              ? '監視'
                              : '一般'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {template.templateData.steps.length}ステップ
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCreateFromTemplate(template)}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    使用
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>実行ログがありません</p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="bg-gray-800 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {log.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : log.status === 'failed' ? (
                    <XCircle className="w-5 h-5 text-red-400" />
                  ) : log.status === 'running' ? (
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">Run: {log.runId.slice(0, 8)}...</span>
                      {log.stepId && (
                        <span className="text-xs text-gray-500">Step: {log.stepId.slice(0, 8)}...</span>
                      )}
                    </div>
                    {log.errorMessage && (
                      <p className="text-xs text-red-400 mt-1">{log.errorMessage}</p>
                    )}
                    {log.resultData && (
                      <p className="text-xs text-gray-400 mt-1">
                        成功: {log.resultData.successCount || 0} / 失敗:{' '}
                        {log.resultData.failureCount || 0}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500">{formatDate(log.startedAt)}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Workflow Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          resetForm()
        }}
        title="新規ワークフロー"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              ワークフロー名 *
            </label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="例: 自動いいねワークフロー"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">説明</label>
            <Input
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="このワークフローの説明"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">トリガー</label>
            <select
              value={formTriggerType}
              onChange={(e) => setFormTriggerType(e.target.value as WorkflowTriggerType)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="manual">手動</option>
              <option value="schedule">スケジュール</option>
              <option value="event">イベント</option>
            </select>
          </div>
          {formTriggerType === 'schedule' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                実行間隔（分）
              </label>
              <Input
                type="number"
                value={formIntervalMinutes}
                onChange={(e) => setFormIntervalMinutes(e.target.value)}
                min="1"
              />
            </div>
          )}
          {formError && <div className="text-sm text-red-400">{formError}</div>}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreateModal(false)
                resetForm()
              }}
            >
              キャンセル
            </Button>
            <Button onClick={handleCreateWorkflow}>作成</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Workflow Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          resetForm()
        }}
        title="ワークフローを編集"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              ワークフロー名 *
            </label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="例: 自動いいねワークフロー"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">説明</label>
            <Input
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="このワークフローの説明"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">トリガー</label>
            <select
              value={formTriggerType}
              onChange={(e) => setFormTriggerType(e.target.value as WorkflowTriggerType)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="manual">手動</option>
              <option value="schedule">スケジュール</option>
              <option value="event">イベント</option>
            </select>
          </div>
          {formTriggerType === 'schedule' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                実行間隔（分）
              </label>
              <Input
                type="number"
                value={formIntervalMinutes}
                onChange={(e) => setFormIntervalMinutes(e.target.value)}
                min="1"
              />
            </div>
          )}
          {formError && <div className="text-sm text-red-400">{formError}</div>}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowEditModal(false)
                resetForm()
              }}
            >
              キャンセル
            </Button>
            <Button onClick={handleUpdateWorkflow}>保存</Button>
          </div>
        </div>
      </Modal>

      {/* Step Modal */}
      <Modal
        isOpen={showStepModal}
        onClose={() => {
          setShowStepModal(false)
          resetStepForm()
        }}
        title={editingStep ? 'ステップを編集' : 'ステップを追加'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">ステップタイプ</label>
            <select
              value={stepType}
              onChange={(e) => setStepType(e.target.value as WorkflowStepType)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="action">アクション</option>
              <option value="condition">条件分岐</option>
              <option value="delay">待機</option>
              <option value="loop">ループ</option>
            </select>
          </div>

          {stepType === 'action' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  アクションタイプ
                </label>
                <select
                  value={stepActionType}
                  onChange={(e) => setStepActionType(e.target.value as WorkflowActionType)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="like">いいね</option>
                  <option value="repost">リポスト</option>
                  <option value="follow">フォロー</option>
                  <option value="unfollow">フォロー解除</option>
                  <option value="check_status">ステータスチェック</option>
                  <option value="send_notification">通知送信</option>
                </select>
              </div>
              {(stepActionType === 'like' || stepActionType === 'repost') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      検索キーワード（オプション）
                    </label>
                    <Input
                      value={stepTargetKeyword}
                      onChange={(e) => setStepTargetKeyword(e.target.value)}
                      placeholder="キーワードで検索"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">実行件数</label>
                    <Input
                      type="number"
                      value={stepTargetCount}
                      onChange={(e) => setStepTargetCount(e.target.value)}
                      min="1"
                    />
                  </div>
                </>
              )}
              {stepActionType === 'send_notification' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    通知メッセージ
                  </label>
                  <Input
                    value={stepNotificationMessage}
                    onChange={(e) => setStepNotificationMessage(e.target.value)}
                    placeholder="通知に表示するメッセージ"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  対象アカウント
                </label>
                <div className="max-h-32 overflow-y-auto bg-gray-700 rounded-lg p-2 space-y-1">
                  {accounts.map((account) => (
                    <label
                      key={account.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-600 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={stepAccountIds.includes(account.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setStepAccountIds([...stepAccountIds, account.id])
                          } else {
                            setStepAccountIds(stepAccountIds.filter((id) => id !== account.id))
                          }
                        }}
                        className="rounded border-gray-500"
                      />
                      <span className="text-sm text-white">@{account.username}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  未選択の場合は全アカウントが対象になります
                </p>
              </div>
            </>
          )}

          {stepType === 'condition' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">条件タイプ</label>
                <select
                  value={stepConditionType}
                  onChange={(e) => setStepConditionType(e.target.value as WorkflowConditionType)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="time_range">時間帯</option>
                  <option value="random_chance">ランダム確率</option>
                  <option value="account_status">アカウント状態</option>
                </select>
              </div>
              {stepConditionType === 'time_range' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      開始時刻（時）
                    </label>
                    <Input
                      type="number"
                      value={stepStartHour}
                      onChange={(e) => setStepStartHour(e.target.value)}
                      min="0"
                      max="23"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      終了時刻（時）
                    </label>
                    <Input
                      type="number"
                      value={stepEndHour}
                      onChange={(e) => setStepEndHour(e.target.value)}
                      min="0"
                      max="23"
                    />
                  </div>
                </div>
              )}
              {stepConditionType === 'random_chance' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    実行確率（0.0〜1.0）
                  </label>
                  <Input
                    type="number"
                    value={stepProbability}
                    onChange={(e) => setStepProbability(e.target.value)}
                    min="0"
                    max="1"
                    step="0.1"
                  />
                </div>
              )}
            </>
          )}

          {stepType === 'delay' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">待機時間（秒）</label>
              <Input
                type="number"
                value={stepDelaySeconds}
                onChange={(e) => setStepDelaySeconds(e.target.value)}
                min="1"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowStepModal(false)
                resetStepForm()
              }}
            >
              キャンセル
            </Button>
            <Button onClick={handleSaveStep}>{editingStep ? '更新' : '追加'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Workflows
