import { create } from 'zustand'
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
  WorkflowTemplateCategory,
  WorkflowTemplateData
} from '../../shared/types'

interface WorkflowStats {
  totalWorkflows: number
  enabledWorkflows: number
  totalRuns: number
  successRate: number
}

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

interface WorkflowState {
  workflows: Workflow[]
  currentWorkflow: WorkflowWithSteps | null
  templates: WorkflowTemplate[]
  logs: WorkflowLog[]
  stats: WorkflowStats | null
  isLoading: boolean
  isExecuting: boolean
  error: string | null

  // Workflow CRUD
  fetchWorkflows: () => Promise<void>
  fetchWorkflowWithSteps: (id: string) => Promise<void>
  createWorkflow: (input: CreateWorkflowInput) => Promise<Workflow>
  updateWorkflow: (id: string, updates: UpdateWorkflowInput) => Promise<void>
  toggleWorkflow: (id: string) => Promise<void>
  deleteWorkflow: (id: string) => Promise<void>
  executeWorkflow: (id: string) => Promise<{ success: boolean; runId: string; error?: string }>

  // Step CRUD
  createStep: (input: CreateStepInput) => Promise<WorkflowStep>
  updateStep: (id: string, updates: UpdateStepInput) => Promise<void>
  deleteStep: (id: string) => Promise<void>
  reorderSteps: (workflowId: string, stepIds: string[]) => Promise<void>

  // Templates
  fetchTemplates: () => Promise<void>
  createFromTemplate: (templateId: string, name: string, description?: string | null) => Promise<Workflow | null>
  createTemplate: (input: CreateTemplateInput) => Promise<WorkflowTemplate>
  deleteTemplate: (id: string) => Promise<void>

  // Logs
  fetchLogs: (limit?: number, offset?: number) => Promise<void>
  fetchLogsByWorkflow: (workflowId: string, limit?: number) => Promise<void>

  // Stats
  fetchStats: () => Promise<void>

  // Clear current workflow
  clearCurrentWorkflow: () => void
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  currentWorkflow: null,
  templates: [],
  logs: [],
  stats: null,
  isLoading: false,
  isExecuting: false,
  error: null,

  // Workflow CRUD
  fetchWorkflows: async () => {
    set({ isLoading: true, error: null })
    try {
      const workflows = (await window.api.workflow.getAll()) as Workflow[]
      set({ workflows, isLoading: false })
    } catch (error) {
      set({ error: 'ワークフローの取得に失敗しました', isLoading: false })
    }
  },

  fetchWorkflowWithSteps: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const workflow = (await window.api.workflow.getWithSteps(id)) as WorkflowWithSteps
      set({ currentWorkflow: workflow, isLoading: false })
    } catch (error) {
      set({ error: 'ワークフローの取得に失敗しました', isLoading: false })
    }
  },

  createWorkflow: async (input: CreateWorkflowInput) => {
    const workflow = (await window.api.workflow.create(input)) as Workflow
    set((state) => ({ workflows: [workflow, ...state.workflows] }))
    get().fetchStats()
    return workflow
  },

  updateWorkflow: async (id: string, updates: UpdateWorkflowInput) => {
    const updatedWorkflow = (await window.api.workflow.update(id, updates)) as Workflow
    if (updatedWorkflow) {
      set((state) => ({
        workflows: state.workflows.map((w) => (w.id === id ? updatedWorkflow : w)),
        currentWorkflow:
          state.currentWorkflow?.id === id
            ? { ...state.currentWorkflow, ...updatedWorkflow }
            : state.currentWorkflow
      }))
      get().fetchStats()
    }
  },

  toggleWorkflow: async (id: string) => {
    const updatedWorkflow = (await window.api.workflow.toggle(id)) as Workflow
    if (updatedWorkflow) {
      set((state) => ({
        workflows: state.workflows.map((w) => (w.id === id ? updatedWorkflow : w)),
        currentWorkflow:
          state.currentWorkflow?.id === id
            ? { ...state.currentWorkflow, ...updatedWorkflow }
            : state.currentWorkflow
      }))
      get().fetchStats()
    }
  },

  deleteWorkflow: async (id: string) => {
    const success = await window.api.workflow.delete(id)
    if (success) {
      set((state) => ({
        workflows: state.workflows.filter((w) => w.id !== id),
        currentWorkflow: state.currentWorkflow?.id === id ? null : state.currentWorkflow
      }))
      get().fetchStats()
    }
  },

  executeWorkflow: async (id: string) => {
    set({ isExecuting: true })
    try {
      const result = await window.api.workflow.execute(id)
      set({ isExecuting: false })
      // Refresh workflow to get updated run count
      get().fetchWorkflows()
      get().fetchStats()
      return result
    } catch (error) {
      set({ isExecuting: false })
      return { success: false, runId: '', error: 'ワークフローの実行に失敗しました' }
    }
  },

  // Step CRUD
  createStep: async (input: CreateStepInput) => {
    const step = (await window.api.workflow.createStep(input)) as WorkflowStep
    if (get().currentWorkflow?.id === input.workflowId) {
      set((state) => ({
        currentWorkflow: state.currentWorkflow
          ? {
              ...state.currentWorkflow,
              steps: [...state.currentWorkflow.steps, step].sort((a, b) => a.stepOrder - b.stepOrder)
            }
          : null
      }))
    }
    return step
  },

  updateStep: async (id: string, updates: UpdateStepInput) => {
    const updatedStep = (await window.api.workflow.updateStep(id, updates)) as WorkflowStep
    if (updatedStep) {
      set((state) => ({
        currentWorkflow: state.currentWorkflow
          ? {
              ...state.currentWorkflow,
              steps: state.currentWorkflow.steps
                .map((s) => (s.id === id ? updatedStep : s))
                .sort((a, b) => a.stepOrder - b.stepOrder)
            }
          : null
      }))
    }
  },

  deleteStep: async (id: string) => {
    const success = await window.api.workflow.deleteStep(id)
    if (success) {
      set((state) => ({
        currentWorkflow: state.currentWorkflow
          ? {
              ...state.currentWorkflow,
              steps: state.currentWorkflow.steps.filter((s) => s.id !== id)
            }
          : null
      }))
    }
  },

  reorderSteps: async (workflowId: string, stepIds: string[]) => {
    const steps = (await window.api.workflow.reorderSteps(workflowId, stepIds)) as WorkflowStep[]
    if (get().currentWorkflow?.id === workflowId) {
      set((state) => ({
        currentWorkflow: state.currentWorkflow
          ? { ...state.currentWorkflow, steps }
          : null
      }))
    }
  },

  // Templates
  fetchTemplates: async () => {
    try {
      const templates = (await window.api.workflow.getTemplates()) as WorkflowTemplate[]
      set({ templates })
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    }
  },

  createFromTemplate: async (templateId: string, name: string, description?: string | null) => {
    try {
      const workflow = (await window.api.workflow.createFromTemplate(
        templateId,
        name,
        description
      )) as WorkflowWithSteps | null
      if (workflow) {
        set((state) => ({ workflows: [workflow, ...state.workflows] }))
        get().fetchStats()
        return workflow
      }
      return null
    } catch (error) {
      console.error('Failed to create from template:', error)
      return null
    }
  },

  createTemplate: async (input: CreateTemplateInput) => {
    const template = (await window.api.workflow.createTemplate(input)) as WorkflowTemplate
    set((state) => ({ templates: [...state.templates, template] }))
    return template
  },

  deleteTemplate: async (id: string) => {
    const success = await window.api.workflow.deleteTemplate(id)
    if (success) {
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id)
      }))
    }
  },

  // Logs
  fetchLogs: async (limit = 100, offset = 0) => {
    try {
      const logs = (await window.api.workflow.getLogs(limit, offset)) as WorkflowLog[]
      set({ logs })
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    }
  },

  fetchLogsByWorkflow: async (workflowId: string, limit = 50) => {
    try {
      const logs = (await window.api.workflow.getLogsByWorkflow(workflowId, limit)) as WorkflowLog[]
      set({ logs })
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    }
  },

  // Stats
  fetchStats: async () => {
    try {
      const stats = (await window.api.workflow.getStats()) as WorkflowStats
      set({ stats })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  },

  // Clear current workflow
  clearCurrentWorkflow: () => {
    set({ currentWorkflow: null })
  }
}))
