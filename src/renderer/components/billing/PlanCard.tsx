import { Check } from 'lucide-react'
import type { SubscriptionPlan } from '@shared/billingTypes'

interface PlanCardProps {
  id: SubscriptionPlan
  name: string
  description: string
  maxAccounts: number
  priceMonthly: number
  priceYearly: number
  features: string[]
  popular?: boolean
  currentPlan: SubscriptionPlan
  billingPeriod: 'monthly' | 'yearly'
  onSelect: (plan: SubscriptionPlan) => void
  loading?: boolean
}

export function PlanCard({
  id,
  name,
  description,
  maxAccounts,
  priceMonthly,
  priceYearly,
  features,
  popular,
  currentPlan,
  billingPeriod,
  onSelect,
  loading,
}: PlanCardProps) {
  const price = billingPeriod === 'monthly' ? priceMonthly : priceYearly
  const isCurrentPlan = currentPlan === id
  const isFree = id === 'free'
  const isEnterprise = id === 'enterprise'
  const isUpgrade = !isCurrentPlan && !isFree && !isEnterprise

  const formatPrice = (price: number) => {
    if (price === 0) return isFree ? '無料' : 'お問い合わせ'
    return `¥${price.toLocaleString()}`
  }

  return (
    <div
      className={`relative rounded-xl border p-6 ${
        popular
          ? 'border-blue-500 bg-blue-500/5'
          : isCurrentPlan
          ? 'border-green-500 bg-green-500/5'
          : 'border-gray-700 bg-gray-800/50'
      }`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-3 py-1 text-xs font-medium text-white">
          人気
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-3 py-1 text-xs font-medium text-white">
          現在のプラン
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-xl font-bold text-white">{name}</h3>
        <p className="mt-1 text-sm text-gray-400">{description}</p>
      </div>

      <div className="mb-6">
        <span className="text-3xl font-bold text-white">{formatPrice(price)}</span>
        {!isFree && !isEnterprise && (
          <span className="text-gray-400">
            /{billingPeriod === 'monthly' ? '月' : '年'}
          </span>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <span className="font-medium">最大{maxAccounts}アカウント</span>
        </div>
      </div>

      <ul className="mb-6 space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(id)}
        disabled={isCurrentPlan || loading}
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
          isCurrentPlan
            ? 'cursor-not-allowed bg-gray-700 text-gray-400'
            : isEnterprise
            ? 'bg-gray-700 text-white hover:bg-gray-600'
            : popular
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-700 text-white hover:bg-gray-600'
        } disabled:opacity-50`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            処理中...
          </span>
        ) : isCurrentPlan ? (
          '現在のプラン'
        ) : isEnterprise ? (
          'お問い合わせ'
        ) : isUpgrade ? (
          'アップグレード'
        ) : (
          'ダウングレード'
        )}
      </button>
    </div>
  )
}
