import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function initializeDatabase(): void {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'data')

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  const dbPath = join(dbDir, 'multisession.db')
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  createTables()
}

function createTables(): void {
  const database = getDatabase()

  // Groups table
  database.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `)

  // Proxy Groups table
  database.exec(`
    CREATE TABLE IF NOT EXISTS proxy_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `)

  // Proxies table
  database.exec(`
    CREATE TABLE IF NOT EXISTS proxies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      username TEXT,
      password TEXT,
      protocol TEXT NOT NULL DEFAULT 'http',
      group_id TEXT,
      status TEXT NOT NULL DEFAULT 'unknown',
      last_checked_at INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (group_id) REFERENCES proxy_groups(id) ON DELETE SET NULL
    )
  `)

  // Migration: Add status and last_checked_at columns if they don't exist
  try {
    database.exec(`ALTER TABLE proxies ADD COLUMN status TEXT NOT NULL DEFAULT 'unknown'`)
  } catch {
    // Column already exists
  }
  try {
    database.exec(`ALTER TABLE proxies ADD COLUMN last_checked_at INTEGER`)
  } catch {
    // Column already exists
  }

  // Accounts table
  database.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      display_name TEXT,
      profile_image TEXT,
      group_id TEXT,
      proxy_id TEXT,
      memo TEXT,
      status TEXT NOT NULL DEFAULT 'unknown',
      search_ban_status TEXT NOT NULL DEFAULT 'unknown',
      last_checked_at INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL,
      FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE SET NULL
    )
  `)

  // Image Pool table (legacy - kept for compatibility)
  database.exec(`
    CREATE TABLE IF NOT EXISTS image_pool (
      id TEXT PRIMARY KEY,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      category TEXT,
      created_at INTEGER NOT NULL
    )
  `)

  // Media Library table
  database.exec(`
    CREATE TABLE IF NOT EXISTS media_library (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      media_type TEXT NOT NULL DEFAULT 'image',
      width INTEGER,
      height INTEGER,
      duration INTEGER,
      thumbnail_path TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      description TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      use_count INTEGER NOT NULL DEFAULT 0,
      last_used_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Media Tags table
  database.exec(`
    CREATE TABLE IF NOT EXISTS media_tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#6366f1',
      use_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `)

  // Post Templates table
  database.exec(`
    CREATE TABLE IF NOT EXISTS post_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      image_category TEXT,
      created_at INTEGER NOT NULL
    )
  `)

  // Action Logs table
  database.exec(`
    CREATE TABLE IF NOT EXISTS action_logs (
      id TEXT PRIMARY KEY,
      account_id TEXT,
      action_type TEXT NOT NULL,
      target_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
    )
  `)

  // Scheduled Posts table
  database.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_posts (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      content TEXT NOT NULL,
      media_ids TEXT,
      scheduled_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      executed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `)

  // Automation Tasks table
  database.exec(`
    CREATE TABLE IF NOT EXISTS automation_tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      action_type TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 0,
      account_ids TEXT NOT NULL DEFAULT '[]',
      target_type TEXT NOT NULL,
      target_value TEXT,
      interval_minutes INTEGER NOT NULL DEFAULT 60,
      daily_limit INTEGER NOT NULL DEFAULT 50,
      today_count INTEGER NOT NULL DEFAULT 0,
      last_run_at INTEGER,
      next_run_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Automation Logs table
  database.exec(`
    CREATE TABLE IF NOT EXISTS automation_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      target_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES automation_tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `)

  // Workflows table
  database.exec(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_enabled INTEGER NOT NULL DEFAULT 0,
      trigger_type TEXT NOT NULL DEFAULT 'manual',
      trigger_config TEXT,
      last_run_at INTEGER,
      next_run_at INTEGER,
      run_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Workflow Steps table
  database.exec(`
    CREATE TABLE IF NOT EXISTS workflow_steps (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      step_order INTEGER NOT NULL,
      step_type TEXT NOT NULL,
      action_type TEXT,
      action_config TEXT,
      condition_type TEXT,
      condition_config TEXT,
      on_success_step_id TEXT,
      on_failure_step_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
    )
  `)

  // Workflow Logs table
  database.exec(`
    CREATE TABLE IF NOT EXISTS workflow_logs (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      step_id TEXT,
      status TEXT NOT NULL DEFAULT 'running',
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      error_message TEXT,
      result_data TEXT,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
      FOREIGN KEY (step_id) REFERENCES workflow_steps(id) ON DELETE SET NULL
    )
  `)

  // Workflow Templates table
  database.exec(`
    CREATE TABLE IF NOT EXISTS workflow_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'general',
      template_data TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `)

  // Monitoring Alerts table
  database.exec(`
    CREATE TABLE IF NOT EXISTS monitoring_alerts (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      message TEXT NOT NULL,
      details TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      is_resolved INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      resolved_at INTEGER,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `)

  // Monitoring Config table
  database.exec(`
    CREATE TABLE IF NOT EXISTS monitoring_config (
      id TEXT PRIMARY KEY,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      check_interval_minutes INTEGER NOT NULL DEFAULT 30,
      auto_check_shadow_ban INTEGER NOT NULL DEFAULT 1,
      auto_check_login_status INTEGER NOT NULL DEFAULT 1,
      alert_on_lock INTEGER NOT NULL DEFAULT 1,
      alert_on_suspend INTEGER NOT NULL DEFAULT 1,
      alert_on_shadow_ban INTEGER NOT NULL DEFAULT 1,
      alert_on_login_failure INTEGER NOT NULL DEFAULT 1,
      notify_desktop INTEGER NOT NULL DEFAULT 1,
      notify_sound INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Monitoring Reports table
  database.exec(`
    CREATE TABLE IF NOT EXISTS monitoring_reports (
      id TEXT PRIMARY KEY,
      report_type TEXT NOT NULL,
      period_start INTEGER NOT NULL,
      period_end INTEGER NOT NULL,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `)

  // Security Config table
  database.exec(`
    CREATE TABLE IF NOT EXISTS security_config (
      id TEXT PRIMARY KEY,
      master_password_hash TEXT,
      master_password_salt TEXT,
      is_lock_enabled INTEGER NOT NULL DEFAULT 0,
      auto_lock_minutes INTEGER NOT NULL DEFAULT 5,
      lock_on_minimize INTEGER NOT NULL DEFAULT 0,
      lock_on_sleep INTEGER NOT NULL DEFAULT 1,
      encrypt_session_data INTEGER NOT NULL DEFAULT 0,
      last_unlocked_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Secure Credentials table
  database.exec(`
    CREATE TABLE IF NOT EXISTS secure_credentials (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      credential_type TEXT NOT NULL,
      encrypted_data TEXT NOT NULL,
      iv TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `)

  // App Notifications table
  database.exec(`
    CREATE TABLE IF NOT EXISTS app_notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      account_id TEXT,
      action_url TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'normal',
      created_at INTEGER NOT NULL,
      read_at INTEGER,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
    )
  `)

  // Notification Settings table
  database.exec(`
    CREATE TABLE IF NOT EXISTS notification_settings (
      id TEXT PRIMARY KEY,
      enable_desktop_notifications INTEGER NOT NULL DEFAULT 1,
      enable_sound_notifications INTEGER NOT NULL DEFAULT 0,
      enable_in_app_notifications INTEGER NOT NULL DEFAULT 1,
      sound_volume INTEGER NOT NULL DEFAULT 50,
      show_preview INTEGER NOT NULL DEFAULT 1,
      group_by_category INTEGER NOT NULL DEFAULT 0,
      auto_mark_read_seconds INTEGER,
      quiet_hours_enabled INTEGER NOT NULL DEFAULT 0,
      quiet_hours_start TEXT,
      quiet_hours_end TEXT,
      enabled_categories TEXT NOT NULL DEFAULT '["account","post","automation","workflow","system","security"]',
      enabled_priorities TEXT NOT NULL DEFAULT '["low","normal","high","urgent"]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Create indexes
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_accounts_group_id ON accounts(group_id);
    CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
    CREATE INDEX IF NOT EXISTS idx_action_logs_account_id ON action_logs(account_id);
    CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON action_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_scheduled_posts_account_id ON scheduled_posts(account_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
    CREATE INDEX IF NOT EXISTS idx_automation_tasks_is_enabled ON automation_tasks(is_enabled);
    CREATE INDEX IF NOT EXISTS idx_automation_tasks_next_run_at ON automation_tasks(next_run_at);
    CREATE INDEX IF NOT EXISTS idx_automation_logs_task_id ON automation_logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON automation_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_workflows_is_enabled ON workflows(is_enabled);
    CREATE INDEX IF NOT EXISTS idx_workflows_next_run_at ON workflows(next_run_at);
    CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_steps_step_order ON workflow_steps(step_order);
    CREATE INDEX IF NOT EXISTS idx_workflow_logs_workflow_id ON workflow_logs(workflow_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_logs_run_id ON workflow_logs(run_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category);
    CREATE INDEX IF NOT EXISTS idx_media_library_media_type ON media_library(media_type);
    CREATE INDEX IF NOT EXISTS idx_media_library_is_favorite ON media_library(is_favorite);
    CREATE INDEX IF NOT EXISTS idx_media_library_created_at ON media_library(created_at);
    CREATE INDEX IF NOT EXISTS idx_media_tags_name ON media_tags(name);
    CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_account_id ON monitoring_alerts(account_id);
    CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_alert_type ON monitoring_alerts(alert_type);
    CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_is_resolved ON monitoring_alerts(is_resolved);
    CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_created_at ON monitoring_alerts(created_at);
    CREATE INDEX IF NOT EXISTS idx_monitoring_reports_report_type ON monitoring_reports(report_type);
    CREATE INDEX IF NOT EXISTS idx_monitoring_reports_created_at ON monitoring_reports(created_at);
    CREATE INDEX IF NOT EXISTS idx_secure_credentials_account_id ON secure_credentials(account_id);
    CREATE INDEX IF NOT EXISTS idx_secure_credentials_credential_type ON secure_credentials(credential_type);
    CREATE INDEX IF NOT EXISTS idx_app_notifications_category ON app_notifications(category);
    CREATE INDEX IF NOT EXISTS idx_app_notifications_is_read ON app_notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_app_notifications_is_archived ON app_notifications(is_archived);
    CREATE INDEX IF NOT EXISTS idx_app_notifications_priority ON app_notifications(priority);
    CREATE INDEX IF NOT EXISTS idx_app_notifications_created_at ON app_notifications(created_at);
    CREATE INDEX IF NOT EXISTS idx_app_notifications_account_id ON app_notifications(account_id);
  `)
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
