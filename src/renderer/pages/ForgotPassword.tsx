import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui'
import { useAuthStore } from '../stores/authStore'

function ForgotPassword(): JSX.Element {
  const { resetPassword, isLoading, error, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setLocalError(null)
    clearError()
    setIsSuccess(false)

    // Validation
    if (!email.trim()) {
      setLocalError('メールアドレスを入力してください')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setLocalError('有効なメールアドレスを入力してください')
      return
    }

    const result = await resetPassword(email)
    if (result.success) {
      setIsSuccess(true)
    }
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={18} />
          <span>ログインに戻る</span>
        </Link>

        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">パスワードリセット</h1>
          <p className="text-gray-400">
            登録したメールアドレスを入力してください。パスワードリセット用のリンクを送信します。
          </p>
        </div>

        {/* Reset Form */}
        <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
          {isSuccess ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">メールを送信しました</h2>
              <p className="text-gray-400 mb-6">
                {email} にパスワードリセット用のリンクを送信しました。メールをご確認ください。
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  ログインに戻る
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {displayError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
                  <span className="text-sm text-red-400">{displayError}</span>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  メールアドレス
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    placeholder="example@email.com"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                className="w-full h-11"
                disabled={isLoading}
                leftIcon={isLoading ? <Loader2 size={18} className="animate-spin" /> : undefined}
              >
                {isLoading ? '送信中...' : 'リセットリンクを送信'}
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-xs">
            &copy; {new Date().getFullYear()} MultiSession. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
