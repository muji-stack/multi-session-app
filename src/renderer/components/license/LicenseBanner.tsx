// License Banner Component
// Shows license status banner at the top of the app

import { AlertTriangle, Clock, XCircle, CreditCard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { LicenseStatus } from '@shared/licenseTypes'

interface LicenseBannerProps {
  license: LicenseStatus | null
  onDismiss?: () => void
}

export function LicenseBanner({ license, onDismiss }: LicenseBannerProps) {
  const navigate = useNavigate()

  if (!license) return null

  // Don't show banner for active licenses
  if (license.status === 'active' && license.isValid) return null

  const handleUpgrade = () => {
    navigate('/billing')
  }

  // Trial banner
  if (license.status === 'trial') {
    const isUrgent = license.daysRemaining !== null && license.daysRemaining <= 3

    return (
      <div
        className={`flex items-center justify-between px-4 py-2 ${
          isUrgent
            ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border-b border-red-500/30'
            : 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-b border-blue-500/30'
        }`}
      >
        <div className="flex items-center gap-3">
          <Clock className={`h-4 w-4 ${isUrgent ? 'text-red-400' : 'text-blue-400'}`} />
          <span className="text-sm text-gray-200">
            {license.daysRemaining !== null && license.daysRemaining > 0
              ? `無料トライアル期間中（残り${license.daysRemaining}日）`
              : 'トライアル期間が終了しました'}
          </span>
        </div>
        <button
          onClick={handleUpgrade}
          className="rounded-lg bg-blue-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        >
          プランをアップグレード
        </button>
      </div>
    )
  }

  // Grace period banner
  if (license.status === 'grace_period') {
    return (
      <div className="flex items-center justify-between bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-4 py-2 border-b border-yellow-500/30">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <span className="text-sm text-gray-200">
            お支払いに問題があります。{license.daysRemaining}日以内に更新してください。
          </span>
        </div>
        <button
          onClick={handleUpgrade}
          className="rounded-lg bg-yellow-500 px-4 py-1.5 text-sm font-medium text-black transition-colors hover:bg-yellow-400"
        >
          支払い情報を更新
        </button>
      </div>
    )
  }

  // Payment failed banner
  if (license.status === 'payment_failed') {
    return (
      <div className="flex items-center justify-between bg-gradient-to-r from-red-500/20 to-pink-500/20 px-4 py-2 border-b border-red-500/30">
        <div className="flex items-center gap-3">
          <CreditCard className="h-4 w-4 text-red-400" />
          <span className="text-sm text-gray-200">
            お支払いに失敗しました。請求情報を更新してください。
          </span>
        </div>
        <button
          onClick={handleUpgrade}
          className="rounded-lg bg-red-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-600"
        >
          支払い情報を更新
        </button>
      </div>
    )
  }

  // Expired banner
  if (license.status === 'expired' || license.status === 'none') {
    return (
      <div className="flex items-center justify-between bg-gradient-to-r from-gray-500/20 to-gray-600/20 px-4 py-2 border-b border-gray-500/30">
        <div className="flex items-center gap-3">
          <XCircle className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-200">
            サブスクリプションが終了しました。機能が制限されています。
          </span>
        </div>
        <button
          onClick={handleUpgrade}
          className="rounded-lg bg-blue-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        >
          プランを選択
        </button>
      </div>
    )
  }

  return null
}
