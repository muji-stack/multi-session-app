import { useEffect, useState } from 'react'
import { Heart, Repeat2, UserPlus, Link, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '../components/ui'
import { useToast } from '../components/ui/Toast'
import AccountSelector from '../components/post/AccountSelector'
import { useAccountStore } from '../stores/accountStore'
import { useEngagementStore } from '../stores/engagementStore'

type ActionType = 'like' | 'retweet' | 'follow'

const actionTypes: { type: ActionType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'like', label: 'いいね', icon: <Heart size={20} />, description: 'ツイートにいいねを付ける' },
  { type: 'retweet', label: 'リツイート', icon: <Repeat2 size={20} />, description: 'ツイートをリツイートする' },
  { type: 'follow', label: 'フォロー', icon: <UserPlus size={20} />, description: 'ユーザーをフォローする' }
]

function Engagement(): JSX.Element {
  const toast = useToast()
  const { accounts, fetchAccounts } = useAccountStore()
  const {
    selectedAccountIds,
    targetUrl,
    actionType,
    isExecuting,
    progress,
    results,
    setSelectedAccountIds,
    setTargetUrl,
    setActionType,
    executeEngagement,
    resetState
  } = useEngagementStore()

  const [delaySeconds, setDelaySeconds] = useState(3)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const handleExecute = async (): Promise<void> => {
    if (selectedAccountIds.length === 0 || !targetUrl.trim()) {
      return
    }

    try {
      await executeEngagement(delaySeconds * 1000)
      setShowResults(true)
      toast.success(`${getActionLabel()}が完了しました`)
    } catch (error) {
      console.error('Engagement failed:', error)
      toast.error(`${getActionLabel()}に失敗しました。再度お試しください。`)
    }
  }

  const handleReset = (): void => {
    resetState()
    setShowResults(false)
  }

  const successCount = results.filter((r) => r.success).length
  const failCount = results.filter((r) => !r.success).length

  const getActionLabel = (): string => {
    const action = actionTypes.find((a) => a.type === actionType)
    return action?.label || ''
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white">エンゲージメント</h1>
          <p className="text-gray-400 text-sm mt-1">
            複数のアカウントで一括いいね・リツイート・フォロー
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {showResults ? (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{getActionLabel()}完了</h2>
              <p className="text-gray-400">
                {successCount}件成功 / {failCount}件失敗
              </p>
            </div>

            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-medium text-gray-300 mb-3">実行結果</h3>
              {results.map((result) => {
                const account = accounts.find((a) => a.id === result.accountId)
                return (
                  <div
                    key={result.accountId}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <span className="text-sm text-white">@{account?.username || 'Unknown'}</span>
                    {result.success ? (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle size={14} />
                        成功
                      </span>
                    ) : (
                      <span className="text-xs text-red-400 flex items-center gap-1">
                        <XCircle size={14} />
                        {result.error || '失敗'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <Button variant="primary" className="w-full" onClick={handleReset}>
              新しいエンゲージメントを実行
            </Button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column - Account selection */}
            <div className="bg-white/5 rounded-xl p-5">
              <h2 className="text-lg font-semibold text-white mb-4">アカウント選択</h2>
              <AccountSelector
                accounts={accounts}
                selectedIds={selectedAccountIds}
                onSelectionChange={setSelectedAccountIds}
              />
            </div>

            {/* Right column - Action settings */}
            <div className="space-y-4">
              {/* Action type selection */}
              <div className="bg-white/5 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-white mb-3">アクション種別</h2>
                <div className="grid grid-cols-3 gap-3">
                  {actionTypes.map((action) => (
                    <button
                      key={action.type}
                      type="button"
                      onClick={() => setActionType(action.type)}
                      className={`
                        flex flex-col items-center gap-2 p-4 rounded-lg border transition-all
                        ${
                          actionType === action.type
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                            : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-400'
                        }
                      `}
                    >
                      {action.icon}
                      <span className="text-sm font-medium">{action.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  {actionTypes.find((a) => a.type === actionType)?.description}
                </p>
              </div>

              {/* Target URL */}
              <div className="bg-white/5 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Link size={18} />
                  対象URL
                </h2>
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder={
                    actionType === 'follow'
                      ? 'https://x.com/username'
                      : 'https://x.com/username/status/1234567890'
                  }
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {actionType === 'follow'
                    ? 'フォローするユーザーのプロフィールURLを入力'
                    : 'いいね/リツイートするツイートのURLを入力'}
                </p>
              </div>

              {/* Settings */}
              <div className="bg-white/5 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-white mb-3">設定</h2>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-400">実行間隔:</label>
                  <input
                    type="number"
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-white text-center focus:outline-none focus:border-blue-500/50"
                    min={1}
                    max={60}
                  />
                  <span className="text-sm text-gray-400">秒</span>
                </div>
              </div>

              {/* Execute button */}
              <Button
                variant="primary"
                className="w-full"
                leftIcon={
                  isExecuting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    actionTypes.find((a) => a.type === actionType)?.icon
                  )
                }
                onClick={handleExecute}
                disabled={isExecuting || selectedAccountIds.length === 0 || !targetUrl.trim()}
              >
                {isExecuting
                  ? progress
                    ? `実行中... (${progress.completed}/${progress.total})`
                    : '実行中...'
                  : `${selectedAccountIds.length}件のアカウントで${getActionLabel()}`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Engagement
