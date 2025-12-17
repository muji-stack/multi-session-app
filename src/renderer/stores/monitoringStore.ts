import { create } from 'zustand'
import type {
  MonitoringAlert,
  MonitoringConfig,
  MonitoringReport,
  MonitoringStats,
  MonitoringAlertType,
  AlertSeverity,
  ReportType,
  MonitoringReportData,
  MonitoringCheckResult
} from '../../shared/types'

interface MonitoringState {
  alerts: MonitoringAlert[]
  unresolvedAlerts: MonitoringAlert[]
  config: MonitoringConfig | null
  reports: MonitoringReport[]
  stats: MonitoringStats | null
  isLoading: boolean
  isChecking: boolean
  error: string | null

  // Alert actions
  fetchAlerts: (limit?: number, offset?: number) => Promise<void>
  fetchUnresolvedAlerts: () => Promise<void>
  fetchAlertsByAccount: (accountId: string, limit?: number) => Promise<MonitoringAlert[]>
  markAlertAsRead: (id: string) => Promise<void>
  markAllAlertsAsRead: () => Promise<void>
  resolveAlert: (id: string) => Promise<void>
  resolveAlertsByAccount: (accountId: string) => Promise<void>
  deleteAlert: (id: string) => Promise<void>

  // Config actions
  fetchConfig: () => Promise<void>
  updateConfig: (updates: Partial<Omit<MonitoringConfig, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>

  // Report actions
  fetchReports: (limit?: number, offset?: number) => Promise<void>
  fetchReportById: (id: string) => Promise<MonitoringReport | null>
  generateReport: (reportType: ReportType, periodStart: number, periodEnd: number) => Promise<MonitoringReport | null>
  deleteReport: (id: string) => Promise<void>

  // Stats actions
  fetchStats: () => Promise<void>

  // Monitoring actions
  triggerCheck: () => Promise<MonitoringCheckResult[]>

  // Helper
  clearError: () => void
}

export const useMonitoringStore = create<MonitoringState>((set, get) => ({
  alerts: [],
  unresolvedAlerts: [],
  config: null,
  reports: [],
  stats: null,
  isLoading: false,
  isChecking: false,
  error: null,

  fetchAlerts: async (limit = 100, offset = 0) => {
    set({ isLoading: true, error: null })
    try {
      const alerts = (await window.api.monitoring.getAlerts(limit, offset)) as MonitoringAlert[]
      set({ alerts, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchUnresolvedAlerts: async () => {
    try {
      const unresolvedAlerts = (await window.api.monitoring.getUnresolvedAlerts()) as MonitoringAlert[]
      set({ unresolvedAlerts })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  fetchAlertsByAccount: async (accountId: string, limit = 50) => {
    try {
      const alerts = (await window.api.monitoring.getAlertsByAccount(accountId, limit)) as MonitoringAlert[]
      return alerts
    } catch {
      return []
    }
  },

  markAlertAsRead: async (id: string) => {
    try {
      await window.api.monitoring.markAlertAsRead(id)
      set((state) => ({
        alerts: state.alerts.map((a) => (a.id === id ? { ...a, isRead: true } : a)),
        unresolvedAlerts: state.unresolvedAlerts.map((a) => (a.id === id ? { ...a, isRead: true } : a))
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  markAllAlertsAsRead: async () => {
    try {
      await window.api.monitoring.markAllAlertsAsRead()
      set((state) => ({
        alerts: state.alerts.map((a) => ({ ...a, isRead: true })),
        unresolvedAlerts: state.unresolvedAlerts.map((a) => ({ ...a, isRead: true }))
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  resolveAlert: async (id: string) => {
    try {
      await window.api.monitoring.resolveAlert(id)
      const now = Date.now()
      set((state) => ({
        alerts: state.alerts.map((a) => (a.id === id ? { ...a, isResolved: true, resolvedAt: now } : a)),
        unresolvedAlerts: state.unresolvedAlerts.filter((a) => a.id !== id)
      }))
      // Refresh stats
      get().fetchStats()
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  resolveAlertsByAccount: async (accountId: string) => {
    try {
      await window.api.monitoring.resolveAlertsByAccount(accountId)
      const now = Date.now()
      set((state) => ({
        alerts: state.alerts.map((a) =>
          a.accountId === accountId ? { ...a, isResolved: true, resolvedAt: now } : a
        ),
        unresolvedAlerts: state.unresolvedAlerts.filter((a) => a.accountId !== accountId)
      }))
      get().fetchStats()
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  deleteAlert: async (id: string) => {
    try {
      await window.api.monitoring.deleteAlert(id)
      set((state) => ({
        alerts: state.alerts.filter((a) => a.id !== id),
        unresolvedAlerts: state.unresolvedAlerts.filter((a) => a.id !== id)
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  fetchConfig: async () => {
    try {
      const config = (await window.api.monitoring.getConfig()) as MonitoringConfig
      set({ config })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  updateConfig: async (updates) => {
    try {
      const config = (await window.api.monitoring.updateConfig(updates)) as MonitoringConfig
      set({ config })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  fetchReports: async (limit = 50, offset = 0) => {
    set({ isLoading: true, error: null })
    try {
      const reports = (await window.api.monitoring.getReports(limit, offset)) as MonitoringReport[]
      set({ reports, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchReportById: async (id: string) => {
    try {
      const report = (await window.api.monitoring.getReportById(id)) as MonitoringReport | null
      return report
    } catch {
      return null
    }
  },

  generateReport: async (reportType: ReportType, periodStart: number, periodEnd: number) => {
    set({ isLoading: true, error: null })
    try {
      // Generate report data
      const stats = (await window.api.monitoring.getStats()) as MonitoringStats
      const alertStats = (await window.api.monitoring.getAlertStats(
        Math.ceil((periodEnd - periodStart) / (24 * 60 * 60 * 1000))
      )) as { total: number; byType: Record<string, number>; bySeverity: Record<string, number> }

      // Get action stats from analytics
      const actionStats = (await window.api.analytics.getActionStats()) as {
        total: number
        success: number
        failed: number
        pending: number
      }

      const reportData: MonitoringReportData = {
        accountStats: {
          total: stats.totalAccounts,
          normal: stats.normalAccounts,
          locked: stats.lockedAccounts,
          suspended: stats.suspendedAccounts,
          shadowBanned: stats.shadowBannedAccounts
        },
        alertStats: {
          total: alertStats.total,
          byType: alertStats.byType as Record<MonitoringAlertType, number>,
          bySeverity: alertStats.bySeverity as Record<AlertSeverity, number>
        },
        actionStats: {
          totalActions: actionStats.total,
          successfulActions: actionStats.success,
          failedActions: actionStats.failed,
          successRate: actionStats.total > 0 ? (actionStats.success / actionStats.total) * 100 : 0,
          byType: {}
        },
        topIssueAccounts: [],
        trends: []
      }

      const report = (await window.api.monitoring.createReport({
        reportType,
        periodStart,
        periodEnd,
        data: reportData
      })) as MonitoringReport

      set((state) => ({
        reports: [report, ...state.reports],
        isLoading: false
      }))

      return report
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
      return null
    }
  },

  deleteReport: async (id: string) => {
    try {
      await window.api.monitoring.deleteReport(id)
      set((state) => ({
        reports: state.reports.filter((r) => r.id !== id)
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  fetchStats: async () => {
    try {
      const stats = (await window.api.monitoring.getStats()) as MonitoringStats
      set({ stats })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  triggerCheck: async () => {
    set({ isChecking: true, error: null })
    try {
      const results = (await window.api.monitoring.triggerCheck()) as MonitoringCheckResult[]
      // Refresh stats and alerts after check
      get().fetchStats()
      get().fetchUnresolvedAlerts()
      set({ isChecking: false })
      return results
    } catch (error) {
      set({ error: (error as Error).message, isChecking: false })
      return []
    }
  },

  clearError: () => set({ error: null })
}))
