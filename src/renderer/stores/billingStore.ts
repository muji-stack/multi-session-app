import { create } from 'zustand'
import type { Subscription, SubscriptionPlan } from '@shared/billingTypes'

interface BillingState {
  subscription: Subscription | null
  isLoading: boolean
  error: string | null
  billingPeriod: 'monthly' | 'yearly'

  // Actions
  setSubscription: (subscription: Subscription | null) => void
  setBillingPeriod: (period: 'monthly' | 'yearly') => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Async actions
  fetchSubscription: (userId: string) => Promise<void>
  createCheckout: (
    userId: string,
    email: string,
    plan: Exclude<SubscriptionPlan, 'free' | 'enterprise'>,
    billingPeriod: 'monthly' | 'yearly'
  ) => Promise<boolean>
  openPortal: (userId: string) => Promise<boolean>
}

export const useBillingStore = create<BillingState>((set, get) => ({
  subscription: null,
  isLoading: false,
  error: null,
  billingPeriod: 'monthly',

  setSubscription: (subscription) => set({ subscription }),
  setBillingPeriod: (billingPeriod) => set({ billingPeriod }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  fetchSubscription: async (userId: string) => {
    set({ isLoading: true, error: null })
    try {
      const subscription = await window.api.billing.getSubscription(userId)
      set({ subscription, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'サブスクリプションの取得に失敗しました',
        isLoading: false,
      })
    }
  },

  createCheckout: async (userId, email, plan, billingPeriod) => {
    set({ isLoading: true, error: null })
    try {
      const result = await window.api.billing.createCheckout(
        userId,
        email,
        plan,
        billingPeriod
      )
      set({ isLoading: false })

      if (!result.success) {
        set({ error: result.error || 'チェックアウトの作成に失敗しました' })
        return false
      }

      return true
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'チェックアウトの作成に失敗しました',
        isLoading: false,
      })
      return false
    }
  },

  openPortal: async (userId) => {
    set({ isLoading: true, error: null })
    try {
      const result = await window.api.billing.createPortal(userId)
      set({ isLoading: false })

      if (!result.success) {
        set({ error: result.error || 'ポータルの作成に失敗しました' })
        return false
      }

      return true
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'ポータルの作成に失敗しました',
        isLoading: false,
      })
      return false
    }
  },
}))
