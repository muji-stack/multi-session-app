import { ipcMain, BrowserWindow } from 'electron'
import {
  getAllWorkflows,
  getWorkflowById,
  getWorkflowWithSteps,
  getEnabledWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  getWorkflowSteps,
  createWorkflowStep,
  updateWorkflowStep,
  deleteWorkflowStep,
  deleteWorkflowSteps,
  reorderWorkflowSteps,
  getWorkflowLogs,
  getWorkflowLogsByWorkflow,
  getWorkflowLogsByRunId,
  getAllWorkflowTemplates,
  getWorkflowTemplateById,
  getWorkflowTemplatesByCategory,
  createWorkflowTemplate,
  deleteWorkflowTemplate,
  createWorkflowFromTemplate,
  getWorkflowStats,
  initializeDefaultTemplates
} from '../database/workflowRepository'
import type {
  WorkflowTriggerType,
  WorkflowTriggerConfig,
  WorkflowStepType,
  WorkflowActionType,
  WorkflowActionConfig,
  WorkflowConditionType,
  WorkflowConditionConfig,
  WorkflowTemplateCategory,
  WorkflowTemplateData
} from '../../shared/types'

// Input types
interface CreateWorkflowInput {
  name: string
  description?: string | null
  triggerType?: WorkflowTriggerType
  triggerConfig?: WorkflowTriggerConfig | null
}

interface UpdateWorkflowInput {
  name?: string
  description?: string | null
  isEnabled?: boolean
  triggerType?: WorkflowTriggerType
  triggerConfig?: WorkflowTriggerConfig | null
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

interface CreateTemplateInput {
  name: string
  description?: string | null
  category?: WorkflowTemplateCategory
  templateData: WorkflowTemplateData
}

export function registerWorkflowHandlers(): void {
  // Initialize default templates on first run
  initializeDefaultTemplates()

  // =====================
  // Workflow CRUD
  // =====================

  // Get all workflows
  ipcMain.handle('workflow:getAll', () => {
    return getAllWorkflows()
  })

  // Get workflow by ID
  ipcMain.handle('workflow:getById', (_event, id: string) => {
    return getWorkflowById(id)
  })

  // Get workflow with steps
  ipcMain.handle('workflow:getWithSteps', (_event, id: string) => {
    return getWorkflowWithSteps(id)
  })

  // Get enabled workflows
  ipcMain.handle('workflow:getEnabled', () => {
    return getEnabledWorkflows()
  })

  // Create workflow
  ipcMain.handle('workflow:create', (_event, input: CreateWorkflowInput) => {
    return createWorkflow(input)
  })

  // Update workflow
  ipcMain.handle('workflow:update', (_event, id: string, updates: UpdateWorkflowInput) => {
    return updateWorkflow(id, updates)
  })

  // Toggle workflow enabled state
  ipcMain.handle('workflow:toggle', (_event, id: string) => {
    const workflow = getWorkflowById(id)
    if (!workflow) return null
    return updateWorkflow(id, { isEnabled: !workflow.isEnabled })
  })

  // Delete workflow
  ipcMain.handle('workflow:delete', (_event, id: string) => {
    return deleteWorkflow(id)
  })

  // =====================
  // Workflow Steps
  // =====================

  // Get steps for a workflow
  ipcMain.handle('workflow:getSteps', (_event, workflowId: string) => {
    return getWorkflowSteps(workflowId)
  })

  // Create step
  ipcMain.handle('workflow:createStep', (_event, input: CreateStepInput) => {
    return createWorkflowStep(input)
  })

  // Update step
  ipcMain.handle('workflow:updateStep', (_event, id: string, updates: UpdateStepInput) => {
    return updateWorkflowStep(id, updates)
  })

  // Delete step
  ipcMain.handle('workflow:deleteStep', (_event, id: string) => {
    return deleteWorkflowStep(id)
  })

  // Delete all steps for a workflow
  ipcMain.handle('workflow:deleteSteps', (_event, workflowId: string) => {
    return deleteWorkflowSteps(workflowId)
  })

  // Reorder steps
  ipcMain.handle('workflow:reorderSteps', (_event, workflowId: string, stepIds: string[]) => {
    reorderWorkflowSteps(workflowId, stepIds)
    return getWorkflowSteps(workflowId)
  })

  // =====================
  // Workflow Logs
  // =====================

  // Get all logs
  ipcMain.handle('workflow:getLogs', (_event, limit?: number, offset?: number) => {
    return getWorkflowLogs(limit, offset)
  })

  // Get logs by workflow
  ipcMain.handle('workflow:getLogsByWorkflow', (_event, workflowId: string, limit?: number) => {
    return getWorkflowLogsByWorkflow(workflowId, limit)
  })

  // Get logs by run ID
  ipcMain.handle('workflow:getLogsByRunId', (_event, runId: string) => {
    return getWorkflowLogsByRunId(runId)
  })

  // =====================
  // Workflow Templates
  // =====================

  // Get all templates
  ipcMain.handle('workflow:getTemplates', () => {
    return getAllWorkflowTemplates()
  })

  // Get template by ID
  ipcMain.handle('workflow:getTemplateById', (_event, id: string) => {
    return getWorkflowTemplateById(id)
  })

  // Get templates by category
  ipcMain.handle('workflow:getTemplatesByCategory', (_event, category: WorkflowTemplateCategory) => {
    return getWorkflowTemplatesByCategory(category)
  })

  // Create template
  ipcMain.handle('workflow:createTemplate', (_event, input: CreateTemplateInput) => {
    return createWorkflowTemplate(input)
  })

  // Delete template
  ipcMain.handle('workflow:deleteTemplate', (_event, id: string) => {
    return deleteWorkflowTemplate(id)
  })

  // Create workflow from template
  ipcMain.handle(
    'workflow:createFromTemplate',
    (_event, templateId: string, name: string, description?: string | null) => {
      return createWorkflowFromTemplate(templateId, name, description)
    }
  )

  // =====================
  // Stats
  // =====================

  // Get workflow stats
  ipcMain.handle('workflow:getStats', () => {
    return getWorkflowStats()
  })

  // Execute workflow manually
  ipcMain.handle('workflow:execute', async (_event, id: string) => {
    const { executeWorkflowManual } = await import('../scheduler/workflowScheduler')
    return executeWorkflowManual(id)
  })

  // Send progress events to renderer
  ipcMain.handle('workflow:onProgress', (_event) => {
    // Progress events will be sent via webContents.send
    const windows = BrowserWindow.getAllWindows()
    return windows.length > 0
  })
}
