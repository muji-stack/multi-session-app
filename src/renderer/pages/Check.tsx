import { useEffect, useState } from 'react'
import {
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  LogIn,
  LogOut,
  RefreshCw,
  Eye,
  EyeOff,
  MessageSquare,
  TrendingUp
} from 'lucide-react'
import { Button } from '../components/ui'
import { useToast } from '../components/ui/Toast'
import { useAccountStore } from '../stores/accountStore'
import type {
  AccountStatus,
  SearchBanStatus,
  ShadowBanResult,
  ShadowBanCheckProgress,
  GhostBanStatus,
  ShadowBanOverallStatus
} from '../../shared/types'

interface CheckResult {
  accountId: string
  username: string
  status: AccountStatus
  searchBanStatus: SearchBanStatus
  isLoggedIn: boolean
  error?: string
}

type TabType = 'status' | 'shadowban'

function Check(): JSX.Element {
  const toast = useToast()
  const { accounts, fetchAccounts } = useAccountStore()
  const [activeTab, setActiveTab] = useState<TabType>('status')
  const [isChecking, setIsChecking] = useState(false)
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null)
  const [results, setResults] = useState<CheckResult[]>([])
  const [hasChecked, setHasChecked] = useState(false)

  // Shadow ban check state
  const [isShadowBanChecking, setIsShadowBanChecking] = useState(false)
  const [shadowBanProgress, setShadowBanProgress] = useState<ShadowBanCheckProgress | null>(null)
  const [shadowBanResults, setShadowBanResults] = useState<ShadowBanResult[]>([])
  const [hasShadowBanChecked, setHasShadowBanChecked] = useState(false)
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const handleCheckAll = async (): Promise<void> => {
    if (accounts.length === 0) return

    setIsChecking(true)
    setProgress({ completed: 0, total: accounts.length })
    setResults([])
    setHasChecked(true)

    const unsubscribe = window.api.check.onProgress((data) => {
      setProgress({ completed: data.completed, total: data.total })
      setResults((prev) => [...prev, data.result as CheckResult])
    })

    try {
      const checkResults = (await window.api.check.multiple(
        accounts.map((a) => a.id)
      )) as CheckResult[]
      setResults(checkResults)
      toast.success('ステータスチェックが完了しました')
    } catch (error) {
      console.error('Check failed:', error)
      toast.error('ステータスチェックに失敗しました')
    } finally {
      unsubscribe()
      setIsChecking(false)
      setProgress(null)
      fetchAccounts() // Refresh accounts to get updated status
    }
  }

  const getStatusBadge = (status: AccountStatus): JSX.Element => {
    switch (status) {
      case 'suspended':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">
            <XCircle size={12} />
            凍結
          </span>
        )
      case 'locked':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">
            <AlertTriangle size={12} />
            ロック
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
            <CheckCircle size={12} />
            正常
          </span>
        )
    }
  }

  const getSearchBanBadge = (status: SearchBanStatus): JSX.Element | null => {
    switch (status) {
      case 'search':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400">
            <AlertTriangle size={12} />
            検索BAN
          </span>
        )
      case 'ghost':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
            <AlertTriangle size={12} />
            ゴーストBAN
          </span>
        )
      case 'reply':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-pink-500/20 text-pink-400">
            <AlertTriangle size={12} />
            リプライBAN
          </span>
        )
      default:
        return null
    }
  }

  const normalCount = results.filter((r) => r.status === 'normal').length
  const lockedCount = results.filter((r) => r.status === 'locked').length
  const suspendedCount = results.filter((r) => r.status === 'suspended').length
  const searchBanCount = results.filter((r) => r.searchBanStatus !== 'none').length
  const loggedInCount = results.filter((r) => r.isLoggedIn).length

  // Shadow ban check handlers
  const handleShadowBanCheck = async (): Promise<void> => {
    const accountIds = selectedAccounts.size > 0
      ? Array.from(selectedAccounts)
      : accounts.map((a) => a.id)

    if (accountIds.length === 0) return

    setIsShadowBanChecking(true)
    setShadowBanProgress({ step: 'initializing', completed: 0, total: accountIds.length })
    setShadowBanResults([])
    setHasShadowBanChecked(true)

    const unsubscribe = window.api.check.onShadowBanProgress((data) => {
      setShadowBanProgress({
        step: data.step as ShadowBanCheckProgress['step'],
        completed: data.completed,
        total: data.total,
        currentAccount: data.currentAccount
      })
    })

    try {
      const checkResults = (await window.api.check.shadowBanMultiple(accountIds)) as ShadowBanResult[]
      setShadowBanResults(checkResults)
      toast.success('シャドウバンチェックが完了しました')
    } catch (error) {
      console.error('Shadow ban check failed:', error)
      toast.error('シャドウバンチェックに失敗しました')
    } finally {
      unsubscribe()
      setIsShadowBanChecking(false)
      setShadowBanProgress(null)
    }
  }

  const toggleAccountSelection = (accountId: string): void => {
    setSelectedAccounts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(accountId)) {
        newSet.delete(accountId)
      } else {
        newSet.add(accountId)
      }
      return newSet
    })
  }

  const selectAllAccounts = (): void => {
    setSelectedAccounts(new Set(accounts.map((a) => a.id)))
  }

  const deselectAllAccounts = (): void => {
    setSelectedAccounts(new Set())
  }

  const getStepLabel = (step: string): string => {
    switch (step) {
      case 'initializing':
        return '初期化中...'
      case 'search_suggestion':
        return '検索候補をチェック中...'
      case 'search_top':
        return '検索（話題）をチェック中...'
      case 'search_latest':
        return '検索（最新）をチェック中...'
      case 'ghost_ban':
        return 'リプライ表示をチェック中...'
      case 'complete':
        return '完了'
      default:
        return step
    }
  }

  const getStatusIcon = (visible: boolean): JSX.Element => {
    return visible ? (
      <span className="text-green-400">🟢</span>
    ) : (
      <span className="text-red-400">🔴</span>
    )
  }

  const getGhostBanIcon = (status: GhostBanStatus): JSX.Element => {
    switch (status) {
      case 'none':
        return <span className="text-green-400">🟢</span>
      case 'partial':
        return <span className="text-yellow-400">🟡</span>
      case 'full':
        return <span className="text-red-400">🔴</span>
      default:
        return <span className="text-gray-400">⚪</span>
    }
  }

  const getGhostBanLabel = (status: GhostBanStatus): string => {
    switch (status) {
      case 'none':
        return '表示'
      case 'partial':
        return '一部隠れ'
      case 'full':
        return '非表示'
      default:
        return '不明'
    }
  }

  const getOverallStatusBadge = (status: ShadowBanOverallStatus): JSX.Element => {
    switch (status) {
      case 'clean':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
            <CheckCircle size={12} />
            正常
          </span>
        )
      case 'suggestion_ban':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400">
            <AlertTriangle size={12} />
            検索候補BAN
          </span>
        )
      case 'search_ban':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">
            <EyeOff size={12} />
            検索BAN
          </span>
        )
      case 'ghost_ban':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
            <MessageSquare size={12} />
            ゴーストBAN
          </span>
        )
      case 'multiple':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">
            <XCircle size={12} />
            複数BAN
          </span>
        )
      case 'error':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-500/20 text-gray-400">
            <AlertTriangle size={12} />
            エラー
          </span>
        )
    }
  }

  // Shadow ban summary counts
  const cleanCount = shadowBanResults.filter((r) => r.overallStatus === 'clean').length
  const suggestionBanCount = shadowBanResults.filter((r) => !r.searchSuggestion).length
  const searchBanDetailCount = shadowBanResults.filter((r) => !r.searchTop || !r.searchLatest).length
  const ghostBanCount = shadowBanResults.filter(
    (r) => r.ghostBan === 'partial' || r.ghostBan === 'full'
  ).length

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white">ステータスチェック</h1>
          <p className="text-gray-400 text-sm mt-1">
            アカウントの凍結・シャドウバン状態を確認します
          </p>
        </div>
        {activeTab === 'status' ? (
          <Button
            variant="primary"
            leftIcon={isChecking ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            onClick={handleCheckAll}
            disabled={isChecking || accounts.length === 0}
          >
            {isChecking
              ? progress
                ? `チェック中... (${progress.completed}/${progress.total})`
                : 'チェック中...'
              : 'すべてチェック'}
          </Button>
        ) : (
          <Button
            variant="primary"
            leftIcon={isShadowBanChecking ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
            onClick={handleShadowBanCheck}
            disabled={isShadowBanChecking || accounts.length === 0}
          >
            {isShadowBanChecking
              ? shadowBanProgress
                ? `${shadowBanProgress.currentAccount || ''} - ${getStepLabel(shadowBanProgress.step)}`
                : 'チェック中...'
              : selectedAccounts.size > 0
              ? `選択をチェック (${selectedAccounts.size})`
              : 'すべてチェック'}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('status')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'status'
              ? 'text-primary'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          ステータスチェック
          {activeTab === 'status' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('shadowban')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'shadowban'
              ? 'text-primary'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          シャドウバン詳細
          {activeTab === 'shadowban' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'status' ? (
          // Status Check Tab
          !hasChecked ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Search size={32} className="text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                アカウント状態をチェック
              </h3>
              <p className="text-gray-400 text-sm max-w-sm mb-6">
                「すべてチェック」ボタンをクリックして、登録されているアカウントの状態を確認します。
              </p>
              <Button
                variant="primary"
                leftIcon={<Search size={18} />}
                onClick={handleCheckAll}
                disabled={accounts.length === 0}
              >
                チェック開始
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="text-2xl font-bold text-white">{results.length}</div>
                  <div className="text-xs text-gray-400">チェック済み</div>
                </div>
                <div className="bg-green-500/10 rounded-xl p-4">
                  <div className="text-2xl font-bold text-green-400">{normalCount}</div>
                  <div className="text-xs text-gray-400">正常</div>
                </div>
                <div className="bg-yellow-500/10 rounded-xl p-4">
                  <div className="text-2xl font-bold text-yellow-400">{lockedCount}</div>
                  <div className="text-xs text-gray-400">ロック</div>
                </div>
                <div className="bg-red-500/10 rounded-xl p-4">
                  <div className="text-2xl font-bold text-red-400">{suspendedCount}</div>
                  <div className="text-xs text-gray-400">凍結</div>
                </div>
                <div className="bg-orange-500/10 rounded-xl p-4">
                  <div className="text-2xl font-bold text-orange-400">{searchBanCount}</div>
                  <div className="text-xs text-gray-400">シャドウBAN</div>
                </div>
              </div>

              {/* Results table */}
              <div className="bg-white/5 rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 text-sm font-medium text-gray-400">
                  <div className="col-span-3">アカウント</div>
                  <div className="col-span-2">ログイン</div>
                  <div className="col-span-2">ステータス</div>
                  <div className="col-span-3">シャドウBAN</div>
                  <div className="col-span-2">エラー</div>
                </div>

                <div className="divide-y divide-white/5">
                  {results.map((result) => (
                    <div
                      key={result.accountId}
                      className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5"
                    >
                      <div className="col-span-3">
                        <span className="text-white font-medium">@{result.username}</span>
                      </div>
                      <div className="col-span-2">
                        {result.isLoggedIn ? (
                          <span className="flex items-center gap-1 text-xs text-green-400">
                            <LogIn size={14} />
                            ログイン済み
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <LogOut size={14} />
                            未ログイン
                          </span>
                        )}
                      </div>
                      <div className="col-span-2">{getStatusBadge(result.status)}</div>
                      <div className="col-span-3">
                        {getSearchBanBadge(result.searchBanStatus) || (
                          <span className="text-xs text-gray-500">なし</span>
                        )}
                      </div>
                      <div className="col-span-2">
                        {result.error ? (
                          <span className="text-xs text-red-400 truncate" title={result.error}>
                            {result.error}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">-</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Re-check button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  leftIcon={<RefreshCw size={18} />}
                  onClick={handleCheckAll}
                  disabled={isChecking}
                >
                  再チェック
                </Button>
              </div>
            </div>
          )
        ) : (
          // Shadow Ban Detail Tab
          !hasShadowBanChecked ? (
            <div className="space-y-6">
              {/* Account Selection */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium">チェックするアカウントを選択</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllAccounts}
                      className="text-xs text-primary hover:text-primary/80"
                    >
                      すべて選択
                    </button>
                    <span className="text-gray-500">|</span>
                    <button
                      onClick={deselectAllAccounts}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      選択解除
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                  {accounts.map((account) => (
                    <label
                      key={account.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedAccounts.has(account.id)
                          ? 'bg-primary/20 border border-primary/50'
                          : 'bg-white/5 border border-transparent hover:bg-white/10'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAccounts.has(account.id)}
                        onChange={() => toggleAccountSelection(account.id)}
                        className="hidden"
                      />
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          selectedAccounts.has(account.id)
                            ? 'bg-primary border-primary'
                            : 'border-gray-500'
                        }`}
                      >
                        {selectedAccounts.has(account.id) && (
                          <CheckCircle size={12} className="text-white" />
                        )}
                      </div>
                      <span className="text-sm text-white truncate">@{account.username}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                  <Eye size={16} />
                  シャドウバン詳細チェックについて
                </h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• <strong>検索候補</strong>: ユーザー名が検索候補に表示されるか</li>
                  <li>• <strong>検索（話題）</strong>: 「話題」タブにポストが表示されるか</li>
                  <li>• <strong>検索（最新）</strong>: 「最新」タブにポストが表示されるか</li>
                  <li>• <strong>リプライ</strong>: リプライが直接表示されるか</li>
                </ul>
                <p className="text-xs text-gray-400 mt-3">
                  ※ログアウト状態のブラウザで検証します。チェックには時間がかかります。
                </p>
              </div>

              {/* Start button */}
              <div className="flex justify-center">
                <Button
                  variant="primary"
                  leftIcon={<Eye size={18} />}
                  onClick={handleShadowBanCheck}
                  disabled={accounts.length === 0}
                >
                  {selectedAccounts.size > 0
                    ? `選択したアカウントをチェック (${selectedAccounts.size})`
                    : 'すべてのアカウントをチェック'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Progress */}
              {isShadowBanChecking && shadowBanProgress && (
                <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">
                      @{shadowBanProgress.currentAccount}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {shadowBanProgress.completed + 1} / {shadowBanProgress.total}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-primary" />
                    <span className="text-sm text-gray-300">
                      {getStepLabel(shadowBanProgress.step)}
                    </span>
                  </div>
                  <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{
                        width: `${((shadowBanProgress.completed + 1) / shadowBanProgress.total) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-500/10 rounded-xl p-4">
                  <div className="text-2xl font-bold text-green-400">{cleanCount}</div>
                  <div className="text-xs text-gray-400">正常</div>
                </div>
                <div className="bg-orange-500/10 rounded-xl p-4">
                  <div className="text-2xl font-bold text-orange-400">{suggestionBanCount}</div>
                  <div className="text-xs text-gray-400">検索候補BAN</div>
                </div>
                <div className="bg-red-500/10 rounded-xl p-4">
                  <div className="text-2xl font-bold text-red-400">{searchBanDetailCount}</div>
                  <div className="text-xs text-gray-400">検索BAN</div>
                </div>
                <div className="bg-purple-500/10 rounded-xl p-4">
                  <div className="text-2xl font-bold text-purple-400">{ghostBanCount}</div>
                  <div className="text-xs text-gray-400">ゴーストBAN</div>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-4">
                {shadowBanResults.map((result) => (
                  <div
                    key={result.accountId}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-white font-medium text-lg">@{result.username}</span>
                      {getOverallStatusBadge(result.overallStatus)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.searchSuggestion)}
                        <div>
                          <div className="text-sm text-white">検索候補</div>
                          <div className="text-xs text-gray-400">
                            {result.searchSuggestion ? '表示' : '非表示'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.searchTop)}
                        <div>
                          <div className="text-sm text-white">検索（話題）</div>
                          <div className="text-xs text-gray-400">
                            {result.searchTop ? '表示' : '非表示'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.searchLatest)}
                        <div>
                          <div className="text-sm text-white">検索（最新）</div>
                          <div className="text-xs text-gray-400">
                            {result.searchLatest ? '表示' : '非表示'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getGhostBanIcon(result.ghostBan)}
                        <div>
                          <div className="text-sm text-white">リプライ</div>
                          <div className="text-xs text-gray-400">
                            {getGhostBanLabel(result.ghostBan)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {result.error && (
                      <div className="mt-3 text-xs text-red-400">エラー: {result.error}</div>
                    )}

                    <div className="mt-3 text-xs text-gray-500">
                      チェック日時: {new Date(result.checkedAt).toLocaleString('ja-JP')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Re-check button */}
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setHasShadowBanChecked(false)
                    setShadowBanResults([])
                    setSelectedAccounts(new Set())
                  }}
                >
                  アカウント選択に戻る
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<RefreshCw size={18} />}
                  onClick={handleShadowBanCheck}
                  disabled={isShadowBanChecking}
                >
                  再チェック
                </Button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default Check
