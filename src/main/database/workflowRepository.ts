import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from './index'
import type {
  Workflow,
  WorkflowStep,
  WorkflowLog,
  WorkflowTemplate,
  WorkflowWithSteps,
  WorkflowTriggerType,
  WorkflowTriggerConfig,
  WorkflowStepType,
  WorkflowActionType,
  WorkflowActionConfig,
  WorkflowConditionType,
  WorkflowConditionConfig,
  WorkflowLogStatus,
  WorkflowResultData,
  WorkflowTemplateCategory,
  WorkflowTemplateData
} from '../../shared/types'

// Row types for database mapping
interface WorkflowRow {
  id: string
  name: string
  description: string | null
  is_enabled: number
  trigger_type: string
  trigger_config: string | null
  last_run_at: number | null
  next_run_at: number | null
  run_count: number
  created_at: number
  updated_at: number
}

interface WorkflowStepRow {
  id: string
  workflow_id: string
  step_order: number
  step_type: string
  action_type: string | null
  action_config: string | null
  condition_type: string | null
  condition_config: string | null
  on_success_step_id: string | null
  on_failure_step_id: string | null
  created_at: number
  updated_at: number
}

interface WorkflowLogRow {
  id: string
  workflow_id: string
  run_id: string
  step_id: string | null
  status: string
  started_at: number
  completed_at: number | null
  error_message: string | null
  result_data: string | null
}

interface WorkflowTemplateRow {
  id: string
  name: string
  description: string | null
  category: string
  template_data: string
  created_at: number
}

// Row to model converters
function rowToWorkflow(row: WorkflowRow): Workflow {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isEnabled: row.is_enabled === 1,
    triggerType: row.trigger_type as WorkflowTriggerType,
    triggerConfig: row.trigger_config ? JSON.parse(row.trigger_config) : null,
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
    runCount: row.run_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function rowToStep(row: WorkflowStepRow): WorkflowStep {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    stepOrder: row.step_order,
    stepType: row.step_type as WorkflowStepType,
    actionType: row.action_type as WorkflowActionType | null,
    actionConfig: row.action_config ? JSON.parse(row.action_config) : null,
    conditionType: row.condition_type as WorkflowConditionType | null,
    conditionConfig: row.condition_config ? JSON.parse(row.condition_config) : null,
    onSuccessStepId: row.on_success_step_id,
    onFailureStepId: row.on_failure_step_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function rowToLog(row: WorkflowLogRow): WorkflowLog {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    runId: row.run_id,
    stepId: row.step_id,
    status: row.status as WorkflowLogStatus,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    errorMessage: row.error_message,
    resultData: row.result_data ? JSON.parse(row.result_data) : null
  }
}

function rowToTemplate(row: WorkflowTemplateRow): WorkflowTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category as WorkflowTemplateCategory,
    templateData: JSON.parse(row.template_data),
    createdAt: row.created_at
  }
}

// =====================
// Workflow CRUD
// =====================

export function getAllWorkflows(): Workflow[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM workflows ORDER BY created_at DESC')
    .all() as WorkflowRow[]
  return rows.map(rowToWorkflow)
}

export function getWorkflowById(id: string): Workflow | null {
  const db = getDatabase()
  const row = db
    .prepare('SELECT * FROM workflows WHERE id = ?')
    .get(id) as WorkflowRow | undefined
  return row ? rowToWorkflow(row) : null
}

export function getWorkflowWithSteps(id: string): WorkflowWithSteps | null {
  const workflow = getWorkflowById(id)
  if (!workflow) return null

  const steps = getWorkflowSteps(id)
  return { ...workflow, steps }
}

export function getEnabledWorkflows(): Workflow[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM workflows WHERE is_enabled = 1 ORDER BY next_run_at ASC')
    .all() as WorkflowRow[]
  return rows.map(rowToWorkflow)
}

export function getDueWorkflows(): Workflow[] {
  const db = getDatabase()
  const now = Date.now()
  const rows = db
    .prepare(`
      SELECT * FROM workflows
      WHERE is_enabled = 1
        AND trigger_type = 'schedule'
        AND (next_run_at IS NULL OR next_run_at <= ?)
      ORDER BY next_run_at ASC
    `)
    .all(now) as WorkflowRow[]
  return rows.map(rowToWorkflow)
}

interface CreateWorkflowInput {
  name: string
  description?: string | null
  triggerType?: WorkflowTriggerType
  triggerConfig?: WorkflowTriggerConfig | null
}

export function createWorkflow(input: CreateWorkflowInput): Workflow {
  const db = getDatabase()
  const id = uuidv4()
  const now = Date.now()

  db.prepare(`
    INSERT INTO workflows (
      id, name, description, is_enabled, trigger_type, trigger_config,
      last_run_at, next_run_at, run_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.name,
    input.description ?? null,
    0, // disabled by default
    input.triggerType ?? 'manual',
    input.triggerConfig ? JSON.stringify(input.triggerConfig) : null,
    null,
    null,
    0,
    now,
    now
  )

  return getWorkflowById(id)!
}

interface UpdateWorkflowInput {
  name?: string
  description?: string | null
  isEnabled?: boolean
  triggerType?: WorkflowTriggerType
  triggerConfig?: WorkflowTriggerConfig | null
}

export function updateWorkflow(id: string, updates: UpdateWorkflowInput): Workflow | null {
  const db = getDatabase()
  const existing = getWorkflowById(id)
  if (!existing) return null

  const now = Date.now()
  const name = updates.name ?? existing.name
  const description = updates.description !== undefined ? updates.description : existing.description
  const isEnabled = updates.isEnabled !== undefined ? (updates.isEnabled ? 1 : 0) : (existing.isEnabled ? 1 : 0)
  const triggerType = updates.triggerType ?? existing.triggerType
  const triggerConfig = updates.triggerConfig !== undefined
    ? (updates.triggerConfig ? JSON.stringify(updates.triggerConfig) : null)
    : (existing.triggerConfig ? JSON.stringify(existing.triggerConfig) : null)

  // Calculate next run time if enabling a scheduled workflow
  let nextRunAt = existing.nextRunAt
  if (updates.isEnabled === true && !existing.isEnabled && triggerType === 'schedule') {
    const config = updates.triggerConfig ?? existing.triggerConfig
    if (config?.intervalMinutes) {
      nextRunAt = now + config.intervalMinutes * 60 * 1000
    }
  } else if (updates.isEnabled === false) {
    nextRunAt = null
  }

  db.prepare(`
    UPDATE workflows
    SET name = ?, description = ?, is_enabled = ?, trigger_type = ?, trigger_config = ?,
        next_run_at = ?, updated_at = ?
    WHERE id = ?
  `).run(name, description, isEnabled, triggerType, triggerConfig, nextRunAt, now, id)

  return getWorkflowById(id)
}

export function updateWorkflowAfterRun(id: string): Workflow | null {
  const db = getDatabase()
  const existing = getWorkflowById(id)
  if (!existing) return null

  const now = Date.now()
  let nextRunAt: number | null = null

  if (existing.triggerType === 'schedule' && existing.triggerConfig?.intervalMinutes) {
    nextRunAt = now + existing.triggerConfig.intervalMinutes * 60 * 1000
  }

  db.prepare(`
    UPDATE workflows
    SET last_run_at = ?, next_run_at = ?, run_count = run_count + 1, updated_at = ?
    WHERE id = ?
  `).run(now, nextRunAt, now, id)

  return getWorkflowById(id)
}

export function deleteWorkflow(id: string): boolean {
  const db = getDatabase()
  // Steps and logs will be cascade deleted
  const result = db.prepare('DELETE FROM workflows WHERE id = ?').run(id)
  return result.changes > 0
}

// =====================
// Workflow Steps CRUD
// =====================

export function getWorkflowSteps(workflowId: string): WorkflowStep[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY step_order ASC')
    .all(workflowId) as WorkflowStepRow[]
  return rows.map(rowToStep)
}

export function getWorkflowStepById(id: string): WorkflowStep | null {
  const db = getDatabase()
  const row = db
    .prepare('SELECT * FROM workflow_steps WHERE id = ?')
    .get(id) as WorkflowStepRow | undefined
  return row ? rowToStep(row) : null
}

interface CreateStepInput {
  workflowId: string
  stepOrder: number
  stepType: WorkflowStepType
  actionType?: WorkflowActionType | null
  actionConfig?: WorkflowActionConfig | null
  conditionType?: WorkflowConditionType | null
  conditionConfig?: WorkflowConditionConfig | null
  onSuccessStepId?: string | null
  onFailureStepId?: string | null
}

export function createWorkflowStep(input: CreateStepInput): WorkflowStep {
  const db = getDatabase()
  const id = uuidv4()
  const now = Date.now()

  db.prepare(`
    INSERT INTO workflow_steps (
      id, workflow_id, step_order, step_type, action_type, action_config,
      condition_type, condition_config, on_success_step_id, on_failure_step_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.workflowId,
    input.stepOrder,
    input.stepType,
    input.actionType ?? null,
    input.actionConfig ? JSON.stringify(input.actionConfig) : null,
    input.conditionType ?? null,
    input.conditionConfig ? JSON.stringify(input.conditionConfig) : null,
    input.onSuccessStepId ?? null,
    input.onFailureStepId ?? null,
    now,
    now
  )

  return getWorkflowStepById(id)!
}

interface UpdateStepInput {
  stepOrder?: number
  stepType?: WorkflowStepType
  actionType?: WorkflowActionType | null
  actionConfig?: WorkflowActionConfig | null
  conditionType?: WorkflowConditionType | null
  conditionConfig?: WorkflowConditionConfig | null
  onSuccessStepId?: string | null
  onFailureStepId?: string | null
}

export function updateWorkflowStep(id: string, updates: UpdateStepInput): WorkflowStep | null {
  const db = getDatabase()
  const existing = getWorkflowStepById(id)
  if (!existing) return null

  const now = Date.now()

  db.prepare(`
    UPDATE workflow_steps
    SET step_order = ?, step_type = ?, action_type = ?, action_config = ?,
        condition_type = ?, condition_config = ?, on_success_step_id = ?,
        on_failure_step_id = ?, updated_at = ?
    WHERE id = ?
  `).run(
    updates.stepOrder ?? existing.stepOrder,
    updates.stepType ?? existing.stepType,
    updates.actionType !== undefined ? updates.actionType : existing.actionType,
    updates.actionConfig !== undefined
      ? (updates.actionConfig ? JSON.stringify(updates.actionConfig) : null)
      : (existing.actionConfig ? JSON.stringify(existing.actionConfig) : null),
    updates.conditionType !== undefined ? updates.conditionType : existing.conditionType,
    updates.conditionConfig !== undefined
      ? (updates.conditionConfig ? JSON.stringify(updates.conditionConfig) : null)
      : (existing.conditionConfig ? JSON.stringify(existing.conditionConfig) : null),
    updates.onSuccessStepId !== undefined ? updates.onSuccessStepId : existing.onSuccessStepId,
    updates.onFailureStepId !== undefined ? updates.onFailureStepId : existing.onFailureStepId,
    now,
    id
  )

  return getWorkflowStepById(id)
}

export function deleteWorkflowStep(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM workflow_steps WHERE id = ?').run(id)
  return result.changes > 0
}

export function deleteWorkflowSteps(workflowId: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM workflow_steps WHERE workflow_id = ?').run(workflowId)
  return result.changes > 0
}

export function reorderWorkflowSteps(workflowId: string, stepIds: string[]): void {
  const db = getDatabase()
  const now = Date.now()
  const stmt = db.prepare('UPDATE workflow_steps SET step_order = ?, updated_at = ? WHERE id = ?')

  const transaction = db.transaction(() => {
    stepIds.forEach((stepId, index) => {
      stmt.run(index, now, stepId)
    })
  })

  transaction()
}

// =====================
// Workflow Logs
// =====================

export function getWorkflowLogs(limit: number = 100, offset: number = 0): WorkflowLog[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM workflow_logs ORDER BY started_at DESC LIMIT ? OFFSET ?')
    .all(limit, offset) as WorkflowLogRow[]
  return rows.map(rowToLog)
}

export function getWorkflowLogsByWorkflow(workflowId: string, limit: number = 50): WorkflowLog[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM workflow_logs WHERE workflow_id = ? ORDER BY started_at DESC LIMIT ?')
    .all(workflowId, limit) as WorkflowLogRow[]
  return rows.map(rowToLog)
}

export function getWorkflowLogsByRunId(runId: string): WorkflowLog[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM workflow_logs WHERE run_id = ? ORDER BY started_at ASC')
    .all(runId) as WorkflowLogRow[]
  return rows.map(rowToLog)
}

export function createWorkflowLog(
  workflowId: string,
  runId: string,
  stepId: string | null = null
): WorkflowLog {
  const db = getDatabase()
  const id = uuidv4()
  const now = Date.now()

  db.prepare(`
    INSERT INTO workflow_logs (
      id, workflow_id, run_id, step_id, status, started_at, completed_at, error_message, result_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, workflowId, runId, stepId, 'running', now, null, null, null)

  return {
    id,
    workflowId,
    runId,
    stepId,
    status: 'running',
    startedAt: now,
    completedAt: null,
    errorMessage: null,
    resultData: null
  }
}

export function updateWorkflowLog(
  id: string,
  status: WorkflowLogStatus,
  errorMessage: string | null = null,
  resultData: WorkflowResultData | null = null
): WorkflowLog | null {
  const db = getDatabase()
  const now = Date.now()

  db.prepare(`
    UPDATE workflow_logs
    SET status = ?, completed_at = ?, error_message = ?, result_data = ?
    WHERE id = ?
  `).run(
    status,
    now,
    errorMessage,
    resultData ? JSON.stringify(resultData) : null,
    id
  )

  const row = db
    .prepare('SELECT * FROM workflow_logs WHERE id = ?')
    .get(id) as WorkflowLogRow | undefined
  return row ? rowToLog(row) : null
}

// =====================
// Workflow Templates
// =====================

export function getAllWorkflowTemplates(): WorkflowTemplate[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM workflow_templates ORDER BY category, name')
    .all() as WorkflowTemplateRow[]
  return rows.map(rowToTemplate)
}

export function getWorkflowTemplateById(id: string): WorkflowTemplate | null {
  const db = getDatabase()
  const row = db
    .prepare('SELECT * FROM workflow_templates WHERE id = ?')
    .get(id) as WorkflowTemplateRow | undefined
  return row ? rowToTemplate(row) : null
}

export function getWorkflowTemplatesByCategory(category: WorkflowTemplateCategory): WorkflowTemplate[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM workflow_templates WHERE category = ? ORDER BY name')
    .all(category) as WorkflowTemplateRow[]
  return rows.map(rowToTemplate)
}

interface CreateTemplateInput {
  name: string
  description?: string | null
  category?: WorkflowTemplateCategory
  templateData: WorkflowTemplateData
}

export function createWorkflowTemplate(input: CreateTemplateInput): WorkflowTemplate {
  const db = getDatabase()
  const id = uuidv4()
  const now = Date.now()

  db.prepare(`
    INSERT INTO workflow_templates (id, name, description, category, template_data, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.name,
    input.description ?? null,
    input.category ?? 'general',
    JSON.stringify(input.templateData),
    now
  )

  return getWorkflowTemplateById(id)!
}

export function deleteWorkflowTemplate(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM workflow_templates WHERE id = ?').run(id)
  return result.changes > 0
}

// =====================
// Create Workflow from Template
// =====================

export function createWorkflowFromTemplate(
  templateId: string,
  name: string,
  description?: string | null
): WorkflowWithSteps | null {
  const template = getWorkflowTemplateById(templateId)
  if (!template) return null

  const db = getDatabase()
  const workflowId = uuidv4()
  const now = Date.now()

  const transaction = db.transaction(() => {
    // Create workflow
    db.prepare(`
      INSERT INTO workflows (
        id, name, description, is_enabled, trigger_type, trigger_config,
        last_run_at, next_run_at, run_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      workflowId,
      name,
      description ?? template.description,
      0,
      template.templateData.triggerType,
      template.templateData.triggerConfig ? JSON.stringify(template.templateData.triggerConfig) : null,
      null,
      null,
      0,
      now,
      now
    )

    // Create steps
    const stepStmt = db.prepare(`
      INSERT INTO workflow_steps (
        id, workflow_id, step_order, step_type, action_type, action_config,
        condition_type, condition_config, on_success_step_id, on_failure_step_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    template.templateData.steps.forEach((step, index) => {
      stepStmt.run(
        uuidv4(),
        workflowId,
        step.stepOrder ?? index,
        step.stepType,
        step.actionType ?? null,
        step.actionConfig ? JSON.stringify(step.actionConfig) : null,
        step.conditionType ?? null,
        step.conditionConfig ? JSON.stringify(step.conditionConfig) : null,
        step.onSuccessStepId ?? null,
        step.onFailureStepId ?? null,
        now,
        now
      )
    })
  })

  transaction()
  return getWorkflowWithSteps(workflowId)
}

// =====================
// Stats
// =====================

export function getWorkflowStats(): {
  totalWorkflows: number
  enabledWorkflows: number
  totalRuns: number
  successRate: number
} {
  const db = getDatabase()

  const workflowStats = db
    .prepare('SELECT COUNT(*) as total, SUM(is_enabled) as enabled, SUM(run_count) as runs FROM workflows')
    .get() as { total: number; enabled: number; runs: number }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.getTime()

  const logStats = db
    .prepare(`
      SELECT
        COUNT(DISTINCT run_id) as total_runs,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM workflow_logs
      WHERE started_at >= ?
    `)
    .get(todayStart) as { total_runs: number; success: number; failed: number }

  const total = (logStats.success || 0) + (logStats.failed || 0)
  const successRate = total > 0 ? ((logStats.success || 0) / total) * 100 : 0

  return {
    totalWorkflows: workflowStats.total,
    enabledWorkflows: workflowStats.enabled || 0,
    totalRuns: workflowStats.runs || 0,
    successRate: Math.round(successRate)
  }
}

// =====================
// Initialize Default Templates
// =====================

export function initializeDefaultTemplates(): void {
  const db = getDatabase()
  const existing = db.prepare('SELECT COUNT(*) as count FROM workflow_templates').get() as { count: number }

  if (existing.count > 0) return

  const defaultTemplates: CreateTemplateInput[] = [
    {
      name: '自動いいねワークフロー',
      description: 'キーワードで検索してツイートに自動でいいねします',
      category: 'engagement',
      templateData: {
        triggerType: 'schedule',
        triggerConfig: { intervalMinutes: 60 },
        steps: [
          {
            stepOrder: 0,
            stepType: 'action',
            actionType: 'like',
            actionConfig: { targetKeyword: '', targetCount: 5 },
            conditionType: null,
            conditionConfig: null,
            onSuccessStepId: null,
            onFailureStepId: null
          }
        ]
      }
    },
    {
      name: '新規アカウント初期設定',
      description: '新規追加されたアカウントの初期設定を自動実行',
      category: 'general',
      templateData: {
        triggerType: 'event',
        triggerConfig: { eventType: 'account_added' },
        steps: [
          {
            stepOrder: 0,
            stepType: 'action',
            actionType: 'check_status',
            actionConfig: {},
            conditionType: null,
            conditionConfig: null,
            onSuccessStepId: null,
            onFailureStepId: null
          },
          {
            stepOrder: 1,
            stepType: 'delay',
            actionType: null,
            actionConfig: { delaySeconds: 10 },
            conditionType: null,
            conditionConfig: null,
            onSuccessStepId: null,
            onFailureStepId: null
          },
          {
            stepOrder: 2,
            stepType: 'action',
            actionType: 'send_notification',
            actionConfig: { notificationMessage: 'アカウントの初期設定が完了しました' },
            conditionType: null,
            conditionConfig: null,
            onSuccessStepId: null,
            onFailureStepId: null
          }
        ]
      }
    },
    {
      name: '定期投稿ワークフロー',
      description: '定期的にテンプレートから投稿を実行',
      category: 'posting',
      templateData: {
        triggerType: 'schedule',
        triggerConfig: { intervalMinutes: 120 },
        steps: [
          {
            stepOrder: 0,
            stepType: 'condition',
            actionType: null,
            actionConfig: null,
            conditionType: 'time_range',
            conditionConfig: { startHour: 9, endHour: 21 },
            onSuccessStepId: null,
            onFailureStepId: null
          },
          {
            stepOrder: 1,
            stepType: 'action',
            actionType: 'post',
            actionConfig: { templateId: '' },
            conditionType: null,
            conditionConfig: null,
            onSuccessStepId: null,
            onFailureStepId: null
          }
        ]
      }
    },
    {
      name: 'アカウント監視',
      description: 'アカウントのステータスを定期的にチェック',
      category: 'monitoring',
      templateData: {
        triggerType: 'schedule',
        triggerConfig: { intervalMinutes: 30 },
        steps: [
          {
            stepOrder: 0,
            stepType: 'loop',
            actionType: null,
            actionConfig: { loopAccountIds: [] },
            conditionType: null,
            conditionConfig: null,
            onSuccessStepId: null,
            onFailureStepId: null
          },
          {
            stepOrder: 1,
            stepType: 'action',
            actionType: 'check_status',
            actionConfig: {},
            conditionType: null,
            conditionConfig: null,
            onSuccessStepId: null,
            onFailureStepId: null
          },
          {
            stepOrder: 2,
            stepType: 'condition',
            actionType: null,
            actionConfig: null,
            conditionType: 'account_status',
            conditionConfig: { expectedStatus: 'locked' },
            onSuccessStepId: null,
            onFailureStepId: null
          },
          {
            stepOrder: 3,
            stepType: 'action',
            actionType: 'send_notification',
            actionConfig: { notificationMessage: 'アカウントがロックされています' },
            conditionType: null,
            conditionConfig: null,
            onSuccessStepId: null,
            onFailureStepId: null
          }
        ]
      }
    }
  ]

  defaultTemplates.forEach(template => {
    createWorkflowTemplate(template)
  })
}
