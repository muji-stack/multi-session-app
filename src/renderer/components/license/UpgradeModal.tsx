// Upgrade Modal Component
// Shows when user tries to use a feature that requires upgrade

import { X, Crown, Zap, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PLANS, type SubscriptionPlan } from '@shared/billingTypes'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  feature: string
  requiredPlan?: SubscriptionPlan
  currentPlan?: SubscriptionPlan
  reason?: string
}

export function UpgradeModal({
  isOpen,
  onClose,
  feature,
  requiredPlan = 'starter',
  currentPlan = 'free',
  reason,
}: UpgradeModalProps) {
  const navigate = useNavigate()

  if (!isOpen) return null

  const requiredPlanInfo = PLANS[requiredPlan]
  const currentPlanInfo = PLANS[currentPlan]

  const handleUpgrade = () => {
    onClose()
    navigate('/billing')
  }

  // Get features that will be unlocked
  const getUpgradeFeatures = (): string[] => {
    switch (requiredPlan) {
      case 'starter':
        return [
          '5アカウントまで管理可能',
          '予約投稿機能',
          '自動化機能（いいね/リポスト）',
          '基本的なレポート',
        ]
      case 'basic':
        return [
          '15アカウントまで管理可能',
          'ワークフロー機能',
          'モニタリング機能',
          '高度なレポート',
        ]
      case 'pro':
        return [
          '30アカウントまで管理可能',
          '全機能利用可能',
          '優先サポート',
          'API アクセス',
        ]
      case 'business':
        return [
          '100アカウントまで管理可能',
          '全機能利用可能',
          '専用サポート',
          'カスタム連携',
        ]
      default:
        return []
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-gray-900 p-6 shadow-2xl border border-gray-700">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">
            アップグレードが必要です
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {reason || `「${feature}」機能を利用するには${requiredPlanInfo.name}以上のプランが必要です`}
          </p>
        </div>

        {/* Current vs Required Plan */}
        <div className="mb-6 rounded-xl bg-gray-800/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">現在のプラン</p>
              <p className="font-medium text-gray-300">{currentPlanInfo.name}</p>
            </div>
            <Zap className="h-5 w-5 text-blue-400" />
            <div className="text-right">
              <p className="text-xs text-gray-500">必要なプラン</p>
              <p className="font-medium text-blue-400">{requiredPlanInfo.name}</p>
            </div>
          </div>
        </div>

        {/* Features list */}
        <div className="mb-6">
          <p className="mb-3 text-sm font-medium text-gray-300">
            {requiredPlanInfo.name}で利用できる機能:
          </p>
          <ul className="space-y-2">
            {getUpgradeFeatures().map((feat, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-gray-400">
                <Check className="h-4 w-4 text-green-400" />
                {feat}
              </li>
            ))}
          </ul>
        </div>

        {/* Price */}
        <div className="mb-6 text-center">
          <p className="text-3xl font-bold text-white">
            ¥{requiredPlanInfo.priceMonthly.toLocaleString()}
            <span className="text-base font-normal text-gray-400">/月</span>
          </p>
          <p className="text-xs text-gray-500">
            年払いなら¥{Math.floor(requiredPlanInfo.priceYearly / 12).toLocaleString()}/月
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
          >
            キャンセル
          </button>
          <button
            onClick={handleUpgrade}
            className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            プランを見る
          </button>
        </div>
      </div>
    </div>
  )
}
