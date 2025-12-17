import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from './index'
import type {
  MonitoringAlert,
  MonitoringAlertType,
  AlertSeverity,
  MonitoringConfig,
  MonitoringReport,
  ReportType,
  MonitoringReportData,
  MonitoringStats
} from '../../shared/types'

interface AlertRow {
  id: string
  account_id: string
  alert_type: string
  severity: string
  message: string
  details: string | null
  is_read: number
  is_resolved: number
  created_at: number
  resolved_at: number | null
}

interface ConfigRow {
  id: string
  is_enabled: number
  check_interval_minutes: number
  auto_check_shadow_ban: number
  auto_check_login_status: number
  alert_on_lock: number
  alert_on_suspend: number
  alert_on_shadow_ban: number
  alert_on_login_failure: number
  notify_desktop: number
  notify_sound: number
  created_at: number
  updated_at: number
}

interface ReportRow {
  id: string
  report_type: string
  period_start: number
  period_end: number
  data: string
  created_at: number
}

function rowToAlert(row: AlertRow): MonitoringAlert {
  return {
    id: row.id,
    accountId: row.account_id,
    alertType: row.alert_type as MonitoringAlertType,
    severity: row.severity as AlertSeverity,
    message: row.message,
    details: row.details,
    isRead: row.is_read === 1,
    isResolved: row.is_resolved === 1,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at
  }
}

function rowToConfig(row: ConfigRow): MonitoringConfig {
  return {
    id: row.id,
    isEnabled: row.is_enabled === 1,
    checkIntervalMinutes: row.check_interval_minutes,
    autoCheckShadowBan: row.auto_check_shadow_ban === 1,
    autoCheckLoginStatus: row.auto_check_login_status === 1,
    alertOnLock: row.alert_on_lock === 1,
    alertOnSuspend: row.alert_on_suspend === 1,
    alertOnShadowBan: row.alert_on_shadow_ban === 1,
    alertOnLoginFailure: row.alert_on_login_failure === 1,
    notifyDesktop: row.notify_desktop === 1,
    notifySound: row.notify_sound === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function rowToReport(row: ReportRow): MonitoringReport {
  return {
    id: row.id,
    reportType: row.report_type as ReportType,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    data: JSON.parse(row.data) as MonitoringReportData,
    createdAt: row.created_at
  }
}

// Alert functions
export function getAllAlerts(limit = 100, offset = 0): MonitoringAlert[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT * FROM monitoring_alerts
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as AlertRow[]
  return rows.map(rowToAlert)
}

export function getUnresolvedAlerts(): MonitoringAlert[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT * FROM monitoring_alerts
       WHERE is_resolved = 0
       ORDER BY created_at DESC`
    )
    .all() as AlertRow[]
  return rows.map(rowToAlert)
}

export function getAlertsByAccount(accountId: string, limit = 50): MonitoringAlert[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT * FROM monitoring_alerts
       WHERE account_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(accountId, limit) as AlertRow[]
  return rows.map(rowToAlert)
}

export function getAlertsByType(alertType: MonitoringAlertType, limit = 50): MonitoringAlert[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT * FROM monitoring_alerts
       WHERE alert_type = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(alertType, limit) as AlertRow[]
  return rows.map(rowToAlert)
}

export function getRecentAlerts(hours = 24): MonitoringAlert[] {
  const db = getDatabase()
  const since = Date.now() - hours * 60 * 60 * 1000
  const rows = db
    .prepare(
      `SELECT * FROM monitoring_alerts
       WHERE created_at >= ?
       ORDER BY created_at DESC`
    )
    .all(since) as AlertRow[]
  return rows.map(rowToAlert)
}

export function createAlert(input: {
  accountId: string
  alertType: MonitoringAlertType
  severity: AlertSeverity
  message: string
  details?: string | null
}): MonitoringAlert {
  const db = getDatabase()
  const now = Date.now()
  const id = uuidv4()

  db.prepare(
    `INSERT INTO monitoring_alerts
     (id, account_id, alert_type, severity, message, details, is_read, is_resolved, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)`
  ).run(id, input.accountId, input.alertType, input.severity, input.message, input.details ?? null, now)

  return {
    id,
    accountId: input.accountId,
    alertType: input.alertType,
    severity: input.severity,
    message: input.message,
    details: input.details ?? null,
    isRead: false,
    isResolved: false,
    createdAt: now,
    resolvedAt: null
  }
}

export function markAlertAsRead(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare(`UPDATE monitoring_alerts SET is_read = 1 WHERE id = ?`).run(id)
  return result.changes > 0
}

export function markAllAlertsAsRead(): number {
  const db = getDatabase()
  const result = db.prepare(`UPDATE monitoring_alerts SET is_read = 1 WHERE is_read = 0`).run()
  return result.changes
}

export function resolveAlert(id: string): boolean {
  const db = getDatabase()
  const now = Date.now()
  const result = db
    .prepare(`UPDATE monitoring_alerts SET is_resolved = 1, resolved_at = ? WHERE id = ?`)
    .run(now, id)
  return result.changes > 0
}

export function resolveAlertsByAccount(accountId: string): number {
  const db = getDatabase()
  const now = Date.now()
  const result = db
    .prepare(
      `UPDATE monitoring_alerts
       SET is_resolved = 1, resolved_at = ?
       WHERE account_id = ? AND is_resolved = 0`
    )
    .run(now, accountId)
  return result.changes
}

export function deleteAlert(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare(`DELETE FROM monitoring_alerts WHERE id = ?`).run(id)
  return result.changes > 0
}

export function deleteOldAlerts(daysOld = 30): number {
  const db = getDatabase()
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000
  const result = db.prepare(`DELETE FROM monitoring_alerts WHERE created_at < ?`).run(cutoff)
  return result.changes
}

// Config functions
export function getConfig(): MonitoringConfig | null {
  const db = getDatabase()
  const row = db.prepare(`SELECT * FROM monitoring_config LIMIT 1`).get() as ConfigRow | undefined
  return row ? rowToConfig(row) : null
}

export function getOrCreateConfig(): MonitoringConfig {
  let config = getConfig()
  if (!config) {
    config = createDefaultConfig()
  }
  return config
}

export function createDefaultConfig(): MonitoringConfig {
  const db = getDatabase()
  const now = Date.now()
  const id = uuidv4()

  db.prepare(
    `INSERT INTO monitoring_config
     (id, is_enabled, check_interval_minutes, auto_check_shadow_ban, auto_check_login_status,
      alert_on_lock, alert_on_suspend, alert_on_shadow_ban, alert_on_login_failure,
      notify_desktop, notify_sound, created_at, updated_at)
     VALUES (?, 1, 30, 1, 1, 1, 1, 1, 1, 1, 0, ?, ?)`
  ).run(id, now, now)

  return {
    id,
    isEnabled: true,
    checkIntervalMinutes: 30,
    autoCheckShadowBan: true,
    autoCheckLoginStatus: true,
    alertOnLock: true,
    alertOnSuspend: true,
    alertOnShadowBan: true,
    alertOnLoginFailure: true,
    notifyDesktop: true,
    notifySound: false,
    createdAt: now,
    updatedAt: now
  }
}

export function updateConfig(updates: Partial<Omit<MonitoringConfig, 'id' | 'createdAt' | 'updatedAt'>>): MonitoringConfig | null {
  const db = getDatabase()
  const config = getOrCreateConfig()
  const now = Date.now()

  const fields: string[] = []
  const values: (string | number)[] = []

  if (updates.isEnabled !== undefined) {
    fields.push('is_enabled = ?')
    values.push(updates.isEnabled ? 1 : 0)
  }
  if (updates.checkIntervalMinutes !== undefined) {
    fields.push('check_interval_minutes = ?')
    values.push(updates.checkIntervalMinutes)
  }
  if (updates.autoCheckShadowBan !== undefined) {
    fields.push('auto_check_shadow_ban = ?')
    values.push(updates.autoCheckShadowBan ? 1 : 0)
  }
  if (updates.autoCheckLoginStatus !== undefined) {
    fields.push('auto_check_login_status = ?')
    values.push(updates.autoCheckLoginStatus ? 1 : 0)
  }
  if (updates.alertOnLock !== undefined) {
    fields.push('alert_on_lock = ?')
    values.push(updates.alertOnLock ? 1 : 0)
  }
  if (updates.alertOnSuspend !== undefined) {
    fields.push('alert_on_suspend = ?')
    values.push(updates.alertOnSuspend ? 1 : 0)
  }
  if (updates.alertOnShadowBan !== undefined) {
    fields.push('alert_on_shadow_ban = ?')
    values.push(updates.alertOnShadowBan ? 1 : 0)
  }
  if (updates.alertOnLoginFailure !== undefined) {
    fields.push('alert_on_login_failure = ?')
    values.push(updates.alertOnLoginFailure ? 1 : 0)
  }
  if (updates.notifyDesktop !== undefined) {
    fields.push('notify_desktop = ?')
    values.push(updates.notifyDesktop ? 1 : 0)
  }
  if (updates.notifySound !== undefined) {
    fields.push('notify_sound = ?')
    values.push(updates.notifySound ? 1 : 0)
  }

  if (fields.length === 0) {
    return config
  }

  fields.push('updated_at = ?')
  values.push(now)
  values.push(config.id)

  db.prepare(`UPDATE monitoring_config SET ${fields.join(', ')} WHERE id = ?`).run(...values)

  return getConfig()
}

// Report functions
export function getAllReports(limit = 50, offset = 0): MonitoringReport[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT * FROM monitoring_reports
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as ReportRow[]
  return rows.map(rowToReport)
}

export function getReportById(id: string): MonitoringReport | null {
  const db = getDatabase()
  const row = db.prepare(`SELECT * FROM monitoring_reports WHERE id = ?`).get(id) as ReportRow | undefined
  return row ? rowToReport(row) : null
}

export function getReportsByType(reportType: ReportType, limit = 10): MonitoringReport[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT * FROM monitoring_reports
       WHERE report_type = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(reportType, limit) as ReportRow[]
  return rows.map(rowToReport)
}

export function createReport(input: {
  reportType: ReportType
  periodStart: number
  periodEnd: number
  data: MonitoringReportData
}): MonitoringReport {
  const db = getDatabase()
  const now = Date.now()
  const id = uuidv4()

  db.prepare(
    `INSERT INTO monitoring_reports
     (id, report_type, period_start, period_end, data, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, input.reportType, input.periodStart, input.periodEnd, JSON.stringify(input.data), now)

  return {
    id,
    reportType: input.reportType,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    data: input.data,
    createdAt: now
  }
}

export function deleteReport(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare(`DELETE FROM monitoring_reports WHERE id = ?`).run(id)
  return result.changes > 0
}

export function deleteOldReports(daysOld = 90): number {
  const db = getDatabase()
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000
  const result = db.prepare(`DELETE FROM monitoring_reports WHERE created_at < ?`).run(cutoff)
  return result.changes
}

// Stats functions
export function getMonitoringStats(): MonitoringStats {
  const db = getDatabase()

  // Account stats
  const accountStats = db
    .prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normal,
         SUM(CASE WHEN status = 'locked' THEN 1 ELSE 0 END) as locked,
         SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended,
         SUM(CASE WHEN search_ban_status = 'hidden' THEN 1 ELSE 0 END) as shadow_banned,
         MAX(last_checked_at) as last_check
       FROM accounts`
    )
    .get() as {
    total: number
    normal: number
    locked: number
    suspended: number
    shadow_banned: number
    last_check: number | null
  }

  // Alert stats
  const unresolvedCount = db
    .prepare(`SELECT COUNT(*) as count FROM monitoring_alerts WHERE is_resolved = 0`)
    .get() as { count: number }

  const last24Hours = Date.now() - 24 * 60 * 60 * 1000
  const recentCount = db
    .prepare(`SELECT COUNT(*) as count FROM monitoring_alerts WHERE created_at >= ?`)
    .get(last24Hours) as { count: number }

  return {
    totalAccounts: accountStats.total,
    normalAccounts: accountStats.normal,
    lockedAccounts: accountStats.locked,
    suspendedAccounts: accountStats.suspended,
    shadowBannedAccounts: accountStats.shadow_banned,
    unresolvedAlerts: unresolvedCount.count,
    recentAlerts: recentCount.count,
    lastCheckAt: accountStats.last_check
  }
}

export function getAlertStats(days = 7): {
  total: number
  byType: Record<MonitoringAlertType, number>
  bySeverity: Record<AlertSeverity, number>
} {
  const db = getDatabase()
  const since = Date.now() - days * 24 * 60 * 60 * 1000

  const total = db
    .prepare(`SELECT COUNT(*) as count FROM monitoring_alerts WHERE created_at >= ?`)
    .get(since) as { count: number }

  const byTypeRows = db
    .prepare(
      `SELECT alert_type, COUNT(*) as count
       FROM monitoring_alerts
       WHERE created_at >= ?
       GROUP BY alert_type`
    )
    .all(since) as { alert_type: string; count: number }[]

  const bySeverityRows = db
    .prepare(
      `SELECT severity, COUNT(*) as count
       FROM monitoring_alerts
       WHERE created_at >= ?
       GROUP BY severity`
    )
    .all(since) as { severity: string; count: number }[]

  const byType: Record<MonitoringAlertType, number> = {
    account_locked: 0,
    account_suspended: 0,
    shadow_ban_detected: 0,
    login_failed: 0,
    rate_limit: 0,
    action_failed: 0,
    proxy_error: 0,
    session_expired: 0
  }

  const bySeverity: Record<AlertSeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  }

  for (const row of byTypeRows) {
    byType[row.alert_type as MonitoringAlertType] = row.count
  }

  for (const row of bySeverityRows) {
    bySeverity[row.severity as AlertSeverity] = row.count
  }

  return {
    total: total.count,
    byType,
    bySeverity
  }
}
