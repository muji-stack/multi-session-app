import { CreditCard, AlertTriangle, Clock } from 'lucide-react'
import type { Subscription } from '@shared/billingTypes'
import { PLANS } from '@shared/billingTypes'

interface CurrentPlanBannerProps {
  subscription: Subscription
  onManageBilling: () => void
  loading?: boolean
}

export function CurrentPlanBanner({
  subscription,
  onManageBilling,
  loading,
}: CurrentPlanBannerProps) {
  const plan = PLANS[subscription.plan]
  const isPastDue = subscription.status === 'past_due'
  const isCanceled = subscription.cancelAtPeriodEnd
  const periodEnd = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd)
    : null

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div
      className={`rounded-xl border p-6 ${
        isPastDue
          ? 'border-red-500/50 bg-red-500/10'
          : isCanceled
          ? 'border-yellow-500/50 bg-yellow-500/10'
          : 'border-gray-700 bg-gray-800/50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`rounded-lg p-3 ${
              isPastDue
                ? 'bg-red-500/20'
                : isCanceled
                ? 'bg-yellow-500/20'
                : 'bg-blue-500/20'
            }`}
          >
            {isPastDue ? (
              <AlertTriangle className="h-6 w-6 text-red-400" />
            ) : isCanceled ? (
              <Clock className="h-6 w-6 text-yellow-400" />
            ) : (
              <CreditCard className="h-6 w-6 text-blue-400" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">
              {plan.name}プラン
            </h3>
            <p className="mt-1 text-sm text-gray-400">{plan.description}</p>

            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <div className="text-gray-300">
                <span className="text-gray-500">アカウント上限:</span>{' '}
                <span className="font-medium">{subscription.maxAccounts}</span>
              </div>

              {periodEnd && (
                <div className="text-gray-300">
                  <span className="text-gray-500">
                    {isCanceled ? '終了日:' : '次回更新日:'}
                  </span>{' '}
                  <span className="font-medium">{formatDate(periodEnd)}</span>
                </div>
              )}
            </div>

            {isPastDue && (
              <div className="mt-3 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-300">
                支払いが失敗しました。請求情報を更新してください。
              </div>
            )}

            {isCanceled && !isPastDue && (
              <div className="mt-3 rounded-lg bg-yellow-500/20 px-3 py-2 text-sm text-yellow-300">
                このプランは {periodEnd ? formatDate(periodEnd) : '期間終了時'}{' '}
                に解約されます。
              </div>
            )}
          </div>
        </div>

        {subscription.plan !== 'free' && (
          <button
            onClick={onManageBilling}
            disabled={loading}
            className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                読み込み中...
              </span>
            ) : (
              '請求管理'
            )}
          </button>
        )}
      </div>
    </div>
  )
}
