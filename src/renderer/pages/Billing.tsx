import { useEffect, useState, useCallback } from 'react'
import { CreditCard, ExternalLink, RefreshCw } from 'lucide-react'
import { PlanCard } from '@components/billing/PlanCard'
import { CurrentPlanBanner } from '@components/billing/CurrentPlanBanner'
import { useBillingStore } from '@stores/billingStore'
import { useAuthStore } from '@stores/authStore'
import { useToast } from '@components/ui/Toast'
import { PLANS, type SubscriptionPlan } from '@shared/billingTypes'

export default function Billing() {
  const { user } = useAuthStore()
  const {
    subscription,
    isLoading,
    error,
    billingPeriod,
    setBillingPeriod,
    fetchSubscription,
    createCheckout,
    openPortal,
  } = useBillingStore()

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)

  useEffect(() => {
    const userId = user?.uid || 'local-user'
    fetchSubscription(userId)
  }, [user?.uid, fetchSubscription])

  const handlePlanSelect = async (plan: SubscriptionPlan) => {
    // Firebase認証が設定されていない場合のフォールバック
    const userId = user?.uid || 'local-user'
    const userEmail = user?.email || 'local@example.com'

    if (plan === 'free') {
      // ダウングレードはポータルで行う
      await openPortal(userId)
      return
    }

    if (plan === 'enterprise') {
      // Enterpriseはお問い合わせ
      window.open('mailto:support@multisession.app?subject=Enterprise Plan Inquiry', '_blank')
      return
    }

    setSelectedPlan(plan)
    const success = await createCheckout(
      userId,
      userEmail,
      plan as Exclude<SubscriptionPlan, 'free' | 'enterprise'>,
      billingPeriod
    )

    if (success) {
      // チェックアウトページが開かれた
      // ウィンドウがフォーカスを戻した時にサブスクリプションを更新
      const handleFocus = (): void => {
        const userId = user?.uid || 'local-user'
        fetchSubscription(userId)
        window.removeEventListener('focus', handleFocus)
      }
      window.addEventListener('focus', handleFocus)
    }

    setSelectedPlan(null)
  }

  const handleManageBilling = async () => {
    const userId = user?.uid || 'local-user'
    await openPortal(userId)
  }

  const handleRefresh = () => {
    const userId = user?.uid || 'local-user'
    fetchSubscription(userId)
  }

  const currentPlan = subscription?.plan || 'free'

  // プランの配列を作成（表示順）
  const planOrder: SubscriptionPlan[] = ['free', 'starter', 'basic', 'pro', 'business', 'enterprise']

  return (
    <div className="min-h-screen bg-gradient-dark p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header - Premium Design */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/30 to-blue-600/20 shadow-lg shadow-blue-500/10">
              <CreditCard className="h-7 w-7 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">プランと請求</h1>
              <p className="text-sm text-gray-400">
                サブスクリプションを管理し、プランを選択できます
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-gray-300 transition-all hover:bg-white/10 hover:border-white/20 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            更新
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {/* Current Plan Banner */}
        {subscription && (
          <div className="mb-8">
            <CurrentPlanBanner
              subscription={subscription}
              onManageBilling={handleManageBilling}
              loading={isLoading}
            />
          </div>
        )}

        {/* Billing Period Toggle - Premium Design */}
        <div className="mb-8 flex items-center justify-center">
          <div className="inline-flex items-center gap-4 px-6 py-3 rounded-2xl bg-white/5 border border-white/10">
            <span
              className={`text-sm font-medium transition-colors ${
                billingPeriod === 'monthly' ? 'text-white' : 'text-gray-500'
              }`}
            >
              月払い
            </span>
            <button
              onClick={() =>
                setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')
              }
              className={`relative h-7 w-14 rounded-full transition-all ${
                billingPeriod === 'yearly' ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30' : 'bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                  billingPeriod === 'yearly' ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium transition-colors ${
                billingPeriod === 'yearly' ? 'text-white' : 'text-gray-500'
              }`}
            >
              年払い
              <span className="ml-2 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 px-2 py-0.5 text-xs font-medium text-green-400">
                2ヶ月分お得
              </span>
            </span>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {planOrder.map((planId) => {
            const plan = PLANS[planId]
            return (
              <PlanCard
                key={planId}
                id={planId}
                name={plan.name}
                description={plan.description}
                maxAccounts={plan.maxAccounts}
                priceMonthly={plan.priceMonthly}
                priceYearly={plan.priceYearly}
                features={plan.features}
                popular={plan.popular}
                currentPlan={currentPlan}
                billingPeriod={billingPeriod}
                onSelect={handlePlanSelect}
                loading={isLoading && selectedPlan === planId}
              />
            )
          })}
        </div>

        {/* FAQ / Help Section - Premium Design */}
        <div className="mt-12 card-premium rounded-2xl p-8">
          <h2 className="mb-6 text-xl font-semibold text-white">
            よくある質問
          </h2>

          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <h3 className="font-medium text-white mb-2">プランはいつでも変更できますか？</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                はい、いつでもアップグレードまたはダウングレードできます。
                アップグレードは即座に反映され、ダウングレードは次回請求サイクルから適用されます。
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <h3 className="font-medium text-white mb-2">返金ポリシーはありますか？</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                7日間の返金保証があります。ご満足いただけない場合は、
                サポートまでお問い合わせください。
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <h3 className="font-medium text-white mb-2">支払い方法は何が使えますか？</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                クレジットカード（Visa、Mastercard、AMEX、JCB）をご利用いただけます。
              </p>
            </div>
          </div>

          <a
            href="mailto:support@multisession.app"
            className="mt-8 inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500 rounded-xl transition-all"
          >
            <ExternalLink className="h-4 w-4" />
            その他のご質問はサポートまで
          </a>
        </div>
      </div>
    </div>
  )
}
