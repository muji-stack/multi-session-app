// Billing IPC Handlers

import { ipcMain } from 'electron'
import {
  getSubscription,
  openCheckout,
  openPortal,
  checkLicenseValidity,
  getAvailablePlans,
  getPriceId,
} from '../services/billingService'
import type { SubscriptionPlan } from '../../shared/billingTypes'

export function registerBillingHandlers(): void {
  // Get current subscription
  ipcMain.handle('billing:get-subscription', async (_event, userId: string) => {
    return getSubscription(userId)
  })

  // Create checkout and open in browser
  ipcMain.handle(
    'billing:create-checkout',
    async (
      _event,
      userId: string,
      email: string,
      plan: Exclude<SubscriptionPlan, 'free' | 'enterprise'>,
      billingPeriod: 'monthly' | 'yearly'
    ) => {
      return openCheckout(userId, email, plan, billingPeriod)
    }
  )

  // Create portal and open in browser
  ipcMain.handle('billing:create-portal', async (_event, userId: string) => {
    return openPortal(userId)
  })

  // Check license validity
  ipcMain.handle('billing:check-license', async (_event, userId: string) => {
    return checkLicenseValidity(userId)
  })

  // Get available plans
  ipcMain.handle('billing:get-plans', async () => {
    return getAvailablePlans()
  })

  // Get price ID for a plan
  ipcMain.handle(
    'billing:get-price-id',
    async (
      _event,
      plan: Exclude<SubscriptionPlan, 'free' | 'enterprise'>,
      billingPeriod: 'monthly' | 'yearly'
    ) => {
      return getPriceId(plan, billingPeriod)
    }
  )
}
