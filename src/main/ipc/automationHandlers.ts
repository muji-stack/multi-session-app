import { ipcMain } from 'electron'
import {
  getAllAutomationTasks,
  getAutomationTaskById,
  getEnabledAutomationTasks,
  createAutomationTask,
  updateAutomationTask,
  deleteAutomationTask,
  getAutomationLogs,
  getAutomationLogsByTask,
  getAutomationStats
} from '../database/automationRepository'
import type { AutomationActionType, AutomationTargetType } from '../../shared/types'

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

export function registerAutomationHandlers(): void {
  // Get all tasks
  ipcMain.handle('automation:getTasks', () => {
    return getAllAutomationTasks()
  })

  // Get task by ID
  ipcMain.handle('automation:getTaskById', (_event, id: string) => {
    return getAutomationTaskById(id)
  })

  // Get enabled tasks
  ipcMain.handle('automation:getEnabledTasks', () => {
    return getEnabledAutomationTasks()
  })

  // Create task
  ipcMain.handle('automation:createTask', (_event, input: CreateTaskInput) => {
    return createAutomationTask(input)
  })

  // Update task
  ipcMain.handle('automation:updateTask', (_event, id: string, updates: UpdateTaskInput) => {
    return updateAutomationTask(id, updates)
  })

  // Toggle task enabled state
  ipcMain.handle('automation:toggleTask', (_event, id: string) => {
    const task = getAutomationTaskById(id)
    if (!task) return null
    return updateAutomationTask(id, { isEnabled: !task.isEnabled })
  })

  // Delete task
  ipcMain.handle('automation:deleteTask', (_event, id: string) => {
    return deleteAutomationTask(id)
  })

  // Get logs
  ipcMain.handle('automation:getLogs', (_event, limit?: number, offset?: number) => {
    return getAutomationLogs(limit, offset)
  })

  // Get logs by task
  ipcMain.handle('automation:getLogsByTask', (_event, taskId: string, limit?: number) => {
    return getAutomationLogsByTask(taskId, limit)
  })

  // Get stats
  ipcMain.handle('automation:getStats', () => {
    return getAutomationStats()
  })
}
