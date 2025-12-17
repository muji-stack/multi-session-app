import { ipcMain } from 'electron'
import * as monitoringRepo from '../database/monitoringRepository'
import { triggerManualCheck } from '../scheduler/monitoringScheduler'
import type {
  MonitoringAlertType,
  AlertSeverity,
  ReportType,
  MonitoringReportData
} from '../../shared/types'

export function registerMonitoringHandlers(): void {
  // Alert handlers
  ipcMain.handle('monitoring:getAlerts', async (_event, limit?: number, offset?: number) => {
    return monitoringRepo.getAllAlerts(limit, offset)
  })

  ipcMain.handle('monitoring:getUnresolvedAlerts', async () => {
    return monitoringRepo.getUnresolvedAlerts()
  })

  ipcMain.handle('monitoring:getAlertsByAccount', async (_event, accountId: string, limit?: number) => {
    return monitoringRepo.getAlertsByAccount(accountId, limit)
  })

  ipcMain.handle('monitoring:getAlertsByType', async (_event, alertType: MonitoringAlertType, limit?: number) => {
    return monitoringRepo.getAlertsByType(alertType, limit)
  })

  ipcMain.handle('monitoring:getRecentAlerts', async (_event, hours?: number) => {
    return monitoringRepo.getRecentAlerts(hours)
  })

  ipcMain.handle(
    'monitoring:createAlert',
    async (
      _event,
      input: {
        accountId: string
        alertType: MonitoringAlertType
        severity: AlertSeverity
        message: string
        details?: string | null
      }
    ) => {
      return monitoringRepo.createAlert(input)
    }
  )

  ipcMain.handle('monitoring:markAlertAsRead', async (_event, id: string) => {
    return monitoringRepo.markAlertAsRead(id)
  })

  ipcMain.handle('monitoring:markAllAlertsAsRead', async () => {
    return monitoringRepo.markAllAlertsAsRead()
  })

  ipcMain.handle('monitoring:resolveAlert', async (_event, id: string) => {
    return monitoringRepo.resolveAlert(id)
  })

  ipcMain.handle('monitoring:resolveAlertsByAccount', async (_event, accountId: string) => {
    return monitoringRepo.resolveAlertsByAccount(accountId)
  })

  ipcMain.handle('monitoring:deleteAlert', async (_event, id: string) => {
    return monitoringRepo.deleteAlert(id)
  })

  ipcMain.handle('monitoring:deleteOldAlerts', async (_event, daysOld?: number) => {
    return monitoringRepo.deleteOldAlerts(daysOld)
  })

  // Config handlers
  ipcMain.handle('monitoring:getConfig', async () => {
    return monitoringRepo.getOrCreateConfig()
  })

  ipcMain.handle(
    'monitoring:updateConfig',
    async (
      _event,
      updates: {
        isEnabled?: boolean
        checkIntervalMinutes?: number
        autoCheckShadowBan?: boolean
        autoCheckLoginStatus?: boolean
        alertOnLock?: boolean
        alertOnSuspend?: boolean
        alertOnShadowBan?: boolean
        alertOnLoginFailure?: boolean
        notifyDesktop?: boolean
        notifySound?: boolean
      }
    ) => {
      return monitoringRepo.updateConfig(updates)
    }
  )

  // Report handlers
  ipcMain.handle('monitoring:getReports', async (_event, limit?: number, offset?: number) => {
    return monitoringRepo.getAllReports(limit, offset)
  })

  ipcMain.handle('monitoring:getReportById', async (_event, id: string) => {
    return monitoringRepo.getReportById(id)
  })

  ipcMain.handle('monitoring:getReportsByType', async (_event, reportType: ReportType, limit?: number) => {
    return monitoringRepo.getReportsByType(reportType, limit)
  })

  ipcMain.handle(
    'monitoring:createReport',
    async (
      _event,
      input: {
        reportType: ReportType
        periodStart: number
        periodEnd: number
        data: MonitoringReportData
      }
    ) => {
      return monitoringRepo.createReport(input)
    }
  )

  ipcMain.handle('monitoring:deleteReport', async (_event, id: string) => {
    return monitoringRepo.deleteReport(id)
  })

  ipcMain.handle('monitoring:deleteOldReports', async (_event, daysOld?: number) => {
    return monitoringRepo.deleteOldReports(daysOld)
  })

  // Stats handlers
  ipcMain.handle('monitoring:getStats', async () => {
    return monitoringRepo.getMonitoringStats()
  })

  ipcMain.handle('monitoring:getAlertStats', async (_event, days?: number) => {
    return monitoringRepo.getAlertStats(days)
  })

  // Manual check trigger
  ipcMain.handle('monitoring:triggerCheck', async () => {
    return triggerManualCheck()
  })
}
