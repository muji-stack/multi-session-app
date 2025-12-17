import React, { useState, useCallback, useEffect } from 'react'
import { useSecurityStore } from '../../stores/securityStore'

interface LockScreenProps {
  onUnlock?: () => void
}

export default function LockScreen({ onUnlock }: LockScreenProps): React.ReactElement {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isUnlocking, setIsUnlocking] = useState(false)

  const { unlock, lockState } = useSecurityStore()

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!password.trim()) {
        setError('パスワードを入力してください')
        return
      }

      setIsUnlocking(true)
      setError(null)

      const result = await unlock(password)

      if (result.success) {
        setPassword('')
        onUnlock?.()
      } else {
        setError(result.error || 'パスワードが正しくありません')
        if (result.attemptsRemaining !== undefined) {
          setError(`パスワードが正しくありません（残り${result.attemptsRemaining}回）`)
        }
      }

      setIsUnlocking(false)
    },
    [password, unlock, onUnlock]
  )

  // Focus password input on mount
  useEffect(() => {
    const input = document.getElementById('lock-password-input')
    input?.focus()
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-zinc-900 flex items-center justify-center">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />

      {/* Lock screen content */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
            <span className="text-white font-bold text-3xl">M</span>
          </div>
          <h1 className="text-2xl font-bold text-white">MultiSession</h1>
          <p className="text-zinc-400 mt-2">ロックされています</p>
        </div>

        {/* Lock icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        </div>

        {/* Unlock form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="lock-password-input" className="sr-only">
              マスターパスワード
            </label>
            <input
              id="lock-password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="マスターパスワードを入力"
              disabled={isUnlocking}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              autoComplete="current-password"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Failed attempts warning */}
          {lockState.failedAttempts > 0 && lockState.failedAttempts < 5 && (
            <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 text-sm text-center">
                {5 - lockState.failedAttempts}回の試行が残っています
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isUnlocking || !password.trim()}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUnlocking ? (
              <span className="flex items-center justify-center gap-2">
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
                ロック解除中...
              </span>
            ) : (
              'ロック解除'
            )}
          </button>
        </form>

        {/* Time locked */}
        {lockState.lockedAt && (
          <p className="text-zinc-500 text-sm text-center mt-6">
            {formatTimeLocked(lockState.lockedAt)}からロック中
          </p>
        )}
      </div>
    </div>
  )
}

function formatTimeLocked(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}
