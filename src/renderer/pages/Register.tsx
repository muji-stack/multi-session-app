import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, CheckSquare, Square, ExternalLink } from 'lucide-react'
import { Button } from '../components/ui'
import { useAuthStore } from '../stores/authStore'

function Register(): JSX.Element {
  const navigate = useNavigate()
  const { signUp, isLoading, error, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleTermsClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    window.open('https://multisession.app/terms', '_blank')
  }

  const handlePrivacyClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    window.open('https://multisession.app/privacy', '_blank')
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setLocalError(null)
    clearError()

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

    if (!password) {
      setLocalError('パスワードを入力してください')
      return
    }

    if (password.length < 6) {
      setLocalError('パスワードは6文字以上で入力してください')
      return
    }

    if (password !== confirmPassword) {
      setLocalError('パスワードが一致しません')
      return
    }

    if (!agreedToTerms) {
      setLocalError('利用規約に同意してください')
      return
    }

    const result = await signUp(email, password)
    if (result.success) {
      navigate('/')
    }
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">MultiSession</h1>
          <p className="text-gray-400">新規アカウント登録</p>
        </div>

        {/* Register Form */}
        <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
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

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                パスワード
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-12 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  placeholder="6文字以上"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                パスワード（確認）
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-12 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  placeholder="パスワードを再入力"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Terms Agreement */}
            <div>
              <button
                type="button"
                onClick={() => setAgreedToTerms(!agreedToTerms)}
                className="flex items-start gap-3 text-left w-full"
              >
                {agreedToTerms ? (
                  <CheckSquare size={20} className="text-primary flex-shrink-0 mt-0.5" />
                ) : (
                  <Square size={20} className="text-gray-500 flex-shrink-0 mt-0.5" />
                )}
                <span className="text-sm text-gray-300">
                  <button
                    type="button"
                    onClick={handleTermsClick}
                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    利用規約
                    <ExternalLink size={10} />
                  </button>
                  および
                  <button
                    type="button"
                    onClick={handlePrivacyClick}
                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    プライバシーポリシー
                    <ExternalLink size={10} />
                  </button>
                  に同意します
                </span>
              </button>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full h-11"
              disabled={isLoading}
              leftIcon={isLoading ? <Loader2 size={18} className="animate-spin" /> : undefined}
            >
              {isLoading ? '登録中...' : 'アカウント作成'}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              すでにアカウントをお持ちですか？{' '}
              <Link to="/login" className="text-primary hover:text-primary/80 transition-colors">
                ログイン
              </Link>
            </p>
          </div>
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

export default Register
