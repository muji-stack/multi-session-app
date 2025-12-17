import { useEffect, useState } from 'react'
import { Send, RefreshCw, CheckCircle, XCircle, Loader2, FileText, Settings } from 'lucide-react'
import { Button } from '../components/ui'
import { useToast } from '../components/ui/Toast'
import AccountSelector from '../components/post/AccountSelector'
import TemplateManager from '../components/post/TemplateManager'
import { useAccountStore } from '../stores/accountStore'
import { usePostStore } from '../stores/postStore'
import { useSettingsStore } from '../stores/settingsStore'

function Post(): JSX.Element {
  const toast = useToast()
  const { accounts, fetchAccounts } = useAccountStore()
  const {
    templates,
    selectedAccountIds,
    loginStatusMap,
    isCheckingLoginStatus,
    isPosting,
    postProgress,
    postResults,
    fetchTemplates,
    setSelectedAccountIds,
    checkLoginStatus,
    executeBulkPost,
    resetPostState
  } = usePostStore()

  const { delayBetweenPosts } = useSettingsStore()

  const [postContent, setPostContent] = useState('')
  const [delaySeconds, setDelaySeconds] = useState(delayBetweenPosts / 1000)
  const [showResults, setShowResults] = useState(false)
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false)

  useEffect(() => {
    fetchAccounts()
    fetchTemplates()
  }, [fetchAccounts, fetchTemplates])

  const handleCheckLoginStatus = async (): Promise<void> => {
    if (accounts.length > 0) {
      await checkLoginStatus(accounts.map((a) => a.id))
    }
  }

  const handleExecutePost = async (): Promise<void> => {
    if (selectedAccountIds.length === 0 || !postContent.trim()) {
      return
    }

    try {
      await executeBulkPost(postContent, delaySeconds * 1000)
      setShowResults(true)
      toast.success('投稿が完了しました')
    } catch (error) {
      console.error('Post failed:', error)
      toast.error('投稿に失敗しました。再度お試しください。')
    }
  }

  const handleReset = (): void => {
    resetPostState()
    setPostContent('')
    setShowResults(false)
  }

  const handleSelectTemplate = (content: string): void => {
    setPostContent(content)
  }

  const successCount = postResults.filter((r) => r.success).length
  const failCount = postResults.filter((r) => !r.success).length

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white">一括投稿</h1>
          <p className="text-gray-400 text-sm mt-1">
            複数のアカウントに同時投稿を実行します
          </p>
        </div>
        <Button
          variant="outline"
          leftIcon={<RefreshCw size={18} />}
          onClick={handleCheckLoginStatus}
          disabled={isCheckingLoginStatus || accounts.length === 0}
        >
          {isCheckingLoginStatus ? 'チェック中...' : 'ログイン状態を確認'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {showResults ? (
          // Results view
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">投稿完了</h2>
              <p className="text-gray-400">
                {successCount}件成功 / {failCount}件失敗
              </p>
            </div>

            {/* Result details */}
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-medium text-gray-300 mb-3">投稿結果</h3>
              {postResults.map((result, index) => {
                const account = accounts.find((a) => a.id === result.accountId)
                return (
                  <div
                    key={result.accountId}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <span className="text-sm text-white">
                      @{account?.username || 'Unknown'}
                    </span>
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
              新しい投稿を作成
            </Button>
          </div>
        ) : (
          // Post form view
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column - Account selection */}
            <div className="bg-white/5 rounded-xl p-5">
              <h2 className="text-lg font-semibold text-white mb-4">アカウント選択</h2>
              <AccountSelector
                accounts={accounts}
                selectedIds={selectedAccountIds}
                onSelectionChange={setSelectedAccountIds}
                loginStatusMap={loginStatusMap}
                isCheckingStatus={isCheckingLoginStatus}
              />
            </div>

            {/* Right column - Post content */}
            <div className="space-y-4">
              {/* Templates */}
              <div className="bg-white/5 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText size={18} />
                    テンプレート
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Settings size={14} />}
                    onClick={() => setIsTemplateManagerOpen(true)}
                  >
                    管理
                  </Button>
                </div>
                {templates.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleSelectTemplate(template.content)}
                        className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg text-gray-300 transition-colors"
                      >
                        {template.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    テンプレートがありません。「管理」から作成できます。
                  </p>
                )}
              </div>

              {/* Content input */}
              <div className="bg-white/5 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-white mb-3">投稿内容</h2>
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="投稿する内容を入力してください..."
                  className="w-full h-40 bg-black/30 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500/50"
                  maxLength={280}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">
                    {postContent.length} / 280文字
                  </span>
                </div>
              </div>

              {/* Settings */}
              <div className="bg-white/5 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-white mb-3">設定</h2>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-400">投稿間隔:</label>
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
                leftIcon={isPosting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                onClick={handleExecutePost}
                disabled={isPosting || selectedAccountIds.length === 0 || !postContent.trim()}
              >
                {isPosting
                  ? postProgress
                    ? `投稿中... (${postProgress.completed}/${postProgress.total})`
                    : '投稿中...'
                  : `${selectedAccountIds.length}件のアカウントに投稿`}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Template Manager Modal */}
      <TemplateManager
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
        onSelect={handleSelectTemplate}
      />
    </div>
  )
}

export default Post
