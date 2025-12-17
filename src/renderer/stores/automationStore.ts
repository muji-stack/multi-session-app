import { create } from 'zustand'
import type {
  AutomationTask,
  AutomationLog,
  AutomationActionType,
  AutomationTargetType
} from '../../shared/types'

interface AutomationStats {
  totalTasks: number
  enabledTasks: number
  totalActionsToday: number
  successRate: number
}

interface CreateTaskInput {
  name: string
  actionType: AutomationActionType
  accountIds: string[]
  targetType: AutomationTargetType
  targetValue?: string | null
  intervalMinutes?: number
  dailyLimit?: number
}

interface UpdateTaskInput {
  name?: string
  actionType?: AutomationActionType
  isEnabled?: boolean
  accountIds?: string[]
  targetType?: AutomationTargetType
  targetValue?: string | null
  intervalMinutes?: number
  dailyLimit?: number
}

interface AutomationState {
  tasks: AutomationTask[]
  logs: AutomationLog[]
  stats: AutomationStats | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchTasks: () => Promise<void>
  fetchLogs: (limit?: number, offset?: number) => Promise<void>
  fetchStats: () => Promise<void>
  createTask: (input: CreateTaskInput) => Promise<AutomationTask>
  updateTask: (id: string, updates: UpdateTaskInput) => Promise<void>
  toggleTask: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
  tasks: [],
  logs: [],
  stats: null,
  isLoading: false,
  error: null,

  fetchTasks: async () => {
    set({ isLoading: true, error: null })
    try {
      const tasks = (await window.api.automation.getTasks()) as AutomationTask[]
      set({ tasks, isLoading: false })
    } catch (error) {
      set({ error: 'Failed to fetch tasks', isLoading: false })
    }
  },

  fetchLogs: async (limit = 100, offset = 0) => {
    try {
      const logs = (await window.api.automation.getLogs(limit, offset)) as AutomationLog[]
      set({ logs })
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    }
  },

  fetchStats: async () => {
    try {
      const stats = (await window.api.automation.getStats()) as AutomationStats
      set({ stats })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  },

  createTask: async (input: CreateTaskInput) => {
    const task = (await window.api.automation.createTask(input)) as AutomationTask
    set((state) => ({ tasks: [task, ...state.tasks] }))
    get().fetchStats()
    return task
  },

  updateTask: async (id: string, updates: UpdateTaskInput) => {
    const updatedTask = (await window.api.automation.updateTask(id, updates)) as AutomationTask
    if (updatedTask) {
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t))
      }))
      get().fetchStats()
    }
  },

  toggleTask: async (id: string) => {
    const updatedTask = (await window.api.automation.toggleTask(id)) as AutomationTask
    if (updatedTask) {
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t))
      }))
      get().fetchStats()
    }
  },

  deleteTask: async (id: string) => {
    const success = await window.api.automation.deleteTask(id)
    if (success) {
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id)
      }))
      get().fetchStats()
    }
  }
}))
