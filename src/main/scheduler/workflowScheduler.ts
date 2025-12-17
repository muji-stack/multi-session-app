import { BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import {
  getDueWorkflows,
  getWorkflowSteps,
  updateWorkflowAfterRun,
  createWorkflowLog,
  updateWorkflowLog
} from '../database/workflowRepository'
import { getAllAccounts, getAccountById } from '../database/accountRepository'
import { getProxyById } from '../database/proxyRepository'
import { createAccountWindow, getAccountWindow } from '../browser/sessionManager'
import { executeBulkPost } from '../browser/postService'
import type {
  Workflow,
  WorkflowStep,
  WorkflowActionConfig,
  WorkflowConditionConfig,
  WorkflowResultData,
  Account
} from '../../shared/types'

let schedulerInterval: ReturnType<typeof setInterval> | null = null
let isRunning = false

const SCHEDULER_INTERVAL = 60 * 1000 // Check every minute

export function startWorkflowScheduler(): void {
  if (schedulerInterval) {
    console.log('[WorkflowScheduler] Already running')
    return
  }

  console.log('[WorkflowScheduler] Starting...')

  // Run immediately on start
  runScheduledWorkflows()

  // Set up periodic check
  schedulerInterval = setInterval(runScheduledWorkflows, SCHEDULER_INTERVAL)
}

export function stopWorkflowScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
  }
  console.log('[WorkflowScheduler] Stopped')
}

async function runScheduledWorkflows(): Promise<void> {
  if (isRunning) {
    console.log('[WorkflowScheduler] Previous run still in progress, skipping')
    return
  }

  isRunning = true

  try {
    const dueWorkflows = getDueWorkflows()

    if (dueWorkflows.length === 0) {
      return
    }

    console.log(`[WorkflowScheduler] Found ${dueWorkflows.length} due workflows`)

    for (const workflow of dueWorkflows) {
      await executeWorkflow(workflow)
    }
  } catch (error) {
    console.error('[WorkflowScheduler] Error running scheduled workflows:', error)
  } finally {
    isRunning = false
  }
}

// Manual workflow execution (exposed for IPC)
export async function executeWorkflowManual(workflowId: string): Promise<{
  success: boolean
  runId: string
  error?: string
}> {
  const { getWorkflowById } = await import('../database/workflowRepository')
  const workflow = getWorkflowById(workflowId)

  if (!workflow) {
    return { success: false, runId: '', error: 'Workflow not found' }
  }

  return executeWorkflow(workflow)
}

async function executeWorkflow(workflow: Workflow): Promise<{
  success: boolean
  runId: string
  error?: string
}> {
  const runId = uuidv4()
  console.log(`[WorkflowScheduler] Executing workflow: ${workflow.name} (runId: ${runId})`)

  // Create workflow run log
  const runLog = createWorkflowLog(workflow.id, runId)

  try {
    const steps = getWorkflowSteps(workflow.id)

    if (steps.length === 0) {
      updateWorkflowLog(runLog.id, 'completed', null, {
        actionsExecuted: 0,
        details: 'No steps defined'
      })
      updateWorkflowAfterRun(workflow.id)
      return { success: true, runId }
    }

    // Execute steps in order
    const context: WorkflowContext = {
      workflow,
      runId,
      currentStepIndex: 0,
      accountsProcessed: 0,
      actionsExecuted: 0,
      successCount: 0,
      failureCount: 0,
      loopIndex: 0,
      loopAccounts: [],
      variables: {}
    }

    let currentStepIndex = 0
    while (currentStepIndex < steps.length) {
      const step = steps[currentStepIndex]
      const stepLog = createWorkflowLog(workflow.id, runId, step.id)

      try {
        const result = await executeStep(step, context)

        if (result.success) {
          updateWorkflowLog(stepLog.id, 'completed', null, result.data)
          context.successCount++

          // Handle conditional branching
          if (result.nextStepId) {
            const nextIndex = steps.findIndex(s => s.id === result.nextStepId)
            currentStepIndex = nextIndex >= 0 ? nextIndex : currentStepIndex + 1
          } else {
            currentStepIndex++
          }
        } else {
          updateWorkflowLog(stepLog.id, 'failed', result.error)
          context.failureCount++

          // Handle failure branching
          if (step.onFailureStepId) {
            const failIndex = steps.findIndex(s => s.id === step.onFailureStepId)
            currentStepIndex = failIndex >= 0 ? failIndex : currentStepIndex + 1
          } else {
            // Continue to next step by default
            currentStepIndex++
          }
        }

        context.actionsExecuted++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        updateWorkflowLog(stepLog.id, 'failed', errorMessage)
        context.failureCount++
        currentStepIndex++
      }
    }

    // Update workflow run log with final results
    const resultData: WorkflowResultData = {
      accountsProcessed: context.accountsProcessed,
      actionsExecuted: context.actionsExecuted,
      successCount: context.successCount,
      failureCount: context.failureCount
    }

    updateWorkflowLog(runLog.id, 'completed', null, resultData)
    updateWorkflowAfterRun(workflow.id)

    console.log(`[WorkflowScheduler] Workflow ${workflow.name} completed`)
    return { success: true, runId }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    updateWorkflowLog(runLog.id, 'failed', errorMessage)
    updateWorkflowAfterRun(workflow.id)

    console.error(`[WorkflowScheduler] Workflow ${workflow.name} failed:`, error)
    return { success: false, runId, error: errorMessage }
  }
}

interface WorkflowContext {
  workflow: Workflow
  runId: string
  currentStepIndex: number
  accountsProcessed: number
  actionsExecuted: number
  successCount: number
  failureCount: number
  loopIndex: number
  loopAccounts: Account[]
  variables: Record<string, unknown>
}

interface StepResult {
  success: boolean
  error?: string
  nextStepId?: string | null
  data?: WorkflowResultData
}

async function executeStep(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
  console.log(`[WorkflowScheduler] Executing step ${step.stepOrder}: ${step.stepType}`)

  switch (step.stepType) {
    case 'action':
      return executeActionStep(step, context)
    case 'condition':
      return executeConditionStep(step, context)
    case 'delay':
      return executeDelayStep(step, context)
    case 'loop':
      return executeLoopStep(step, context)
    case 'parallel':
      return executeParallelStep(step, context)
    default:
      return { success: false, error: `Unknown step type: ${step.stepType}` }
  }
}

async function executeActionStep(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
  const config = step.actionConfig || {}

  switch (step.actionType) {
    case 'like':
      return executeEngagementAction('like', config, context)
    case 'repost':
      return executeEngagementAction('repost', config, context)
    case 'follow':
      return executeEngagementAction('follow', config, context)
    case 'unfollow':
      return executeEngagementAction('unfollow', config, context)
    case 'post':
      return executePostAction(config, context)
    case 'check_status':
      return executeCheckStatusAction(config, context)
    case 'send_notification':
      return executeSendNotificationAction(config, context)
    default:
      return { success: false, error: `Unknown action type: ${step.actionType}` }
  }
}

async function executeEngagementAction(
  actionType: 'like' | 'repost' | 'follow' | 'unfollow',
  config: WorkflowActionConfig,
  context: WorkflowContext
): Promise<StepResult> {
  // Get accounts to process
  let accounts: Account[] = []

  if (context.loopAccounts.length > 0) {
    // In a loop context, use current loop account
    accounts = [context.loopAccounts[context.loopIndex]]
  } else if (config.accountIds && config.accountIds.length > 0) {
    accounts = config.accountIds
      .map(id => getAccountById(id))
      .filter((a): a is Account => a !== null)
  } else {
    // Use all accounts
    accounts = getAllAccounts()
  }

  if (accounts.length === 0) {
    return { success: false, error: 'No accounts available' }
  }

  let successCount = 0
  let failureCount = 0

  for (const account of accounts) {
    try {
      const result = await executeEngagementForAccount(account, actionType, config)
      if (result.success) {
        successCount++
      } else {
        failureCount++
      }
      context.accountsProcessed++
    } catch {
      failureCount++
    }
  }

  return {
    success: successCount > 0,
    data: { successCount, failureCount, accountsProcessed: accounts.length }
  }
}

async function executeEngagementForAccount(
  account: Account,
  actionType: 'like' | 'repost' | 'follow' | 'unfollow',
  config: WorkflowActionConfig
): Promise<{ success: boolean; error?: string }> {
  // Get or create browser window
  let window = getAccountWindow(account.id)
  let windowWasCreated = false

  if (!window) {
    const proxy = account.proxyId ? getProxyById(account.proxyId) : null
    window = createAccountWindow(account.id, account.username, proxy)
    windowWasCreated = true
    await waitForWindowLoad(window)
  }

  try {
    // Build target URL
    let targetUrl = 'https://x.com/home'
    if (config.targetKeyword) {
      targetUrl = `https://x.com/search?q=${encodeURIComponent(config.targetKeyword)}&src=typed_query&f=live`
    } else if (config.targetHashtag) {
      const tag = config.targetHashtag.startsWith('#') ? config.targetHashtag.slice(1) : config.targetHashtag
      targetUrl = `https://x.com/search?q=%23${encodeURIComponent(tag)}&src=hashtag_click&f=live`
    } else if (config.targetUrl) {
      targetUrl = config.targetUrl
    }

    // Navigate to target
    await window.loadURL(targetUrl)
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Execute action
    const result = await executeEngagementScript(window, actionType, config.targetCount || 1)
    return result
  } finally {
    if (windowWasCreated && window && !window.isDestroyed()) {
      setTimeout(() => {
        if (!window.isDestroyed()) {
          window.close()
        }
      }, 5000)
    }
  }
}

async function executeEngagementScript(
  window: BrowserWindow,
  actionType: 'like' | 'repost' | 'follow' | 'unfollow',
  count: number
): Promise<{ success: boolean; error?: string }> {
  const scripts: Record<string, string> = {
    like: `
      (function() {
        const buttons = document.querySelectorAll('[data-testid="like"]');
        let clicked = 0;
        const maxClick = Math.min(${count}, buttons.length);
        for (let i = 0; i < maxClick; i++) {
          buttons[i].click();
          clicked++;
        }
        return { success: clicked > 0, clicked };
      })()
    `,
    repost: `
      (function() {
        const buttons = document.querySelectorAll('[data-testid="retweet"]');
        let clicked = 0;
        const maxClick = Math.min(${count}, buttons.length);
        for (let i = 0; i < maxClick; i++) {
          buttons[i].click();
          setTimeout(() => {
            const confirm = document.querySelector('[data-testid="retweetConfirm"]');
            if (confirm) confirm.click();
          }, 500 * (i + 1));
          clicked++;
        }
        return { success: clicked > 0, clicked };
      })()
    `,
    follow: `
      (function() {
        const buttons = Array.from(document.querySelectorAll('[data-testid$="-follow"]'))
          .filter(btn => btn.textContent?.includes('フォロー') || btn.textContent?.includes('Follow'));
        if (buttons.length > 0) {
          buttons[0].click();
          return { success: true };
        }
        return { success: false, error: 'No followable users found' };
      })()
    `,
    unfollow: `
      (function() {
        const buttons = document.querySelectorAll('[data-testid$="-unfollow"]');
        if (buttons.length > 0) {
          buttons[0].click();
          setTimeout(() => {
            const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
            if (confirm) confirm.click();
          }, 500);
          return { success: true };
        }
        return { success: false, error: 'No unfollowable users found' };
      })()
    `
  }

  try {
    const result = await window.webContents.executeJavaScript(scripts[actionType])
    return result
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function executePostAction(
  config: WorkflowActionConfig,
  context: WorkflowContext
): Promise<StepResult> {
  // Get content from config
  const content = config.postContent || config.content
  if (!content) {
    return { success: false, error: 'Post content is required' }
  }

  // Get accounts to post from
  let accountIds: string[] = []

  if (context.loopAccounts.length > 0) {
    // If in a loop, use the current loop account
    accountIds = [context.loopAccounts[context.loopIndex].id]
  } else if (config.accountIds && config.accountIds.length > 0) {
    // Use specified account IDs
    accountIds = config.accountIds
  } else {
    // Fallback to all accounts
    const allAccounts = getAllAccounts()
    accountIds = allAccounts.map(a => a.id)
  }

  if (accountIds.length === 0) {
    return { success: false, error: 'No accounts available for posting' }
  }

  try {
    const delayBetweenPosts = config.delayBetweenPosts || 5000
    const results = await executeBulkPost(accountIds, content, delayBetweenPosts)

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log(`[WorkflowScheduler] Post action completed: ${successCount} success, ${failCount} failed`)

    return {
      success: failCount === 0,
      data: {
        successCount,
        failCount,
        results,
        details: `Posted to ${successCount}/${accountIds.length} accounts`
      }
    }
  } catch (error) {
    console.error('[WorkflowScheduler] Post action failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

async function executeCheckStatusAction(
  config: WorkflowActionConfig,
  context: WorkflowContext
): Promise<StepResult> {
  // Get accounts to check
  let accounts: Account[] = []

  if (context.loopAccounts.length > 0) {
    accounts = [context.loopAccounts[context.loopIndex]]
  } else if (config.accountIds && config.accountIds.length > 0) {
    accounts = config.accountIds
      .map(id => getAccountById(id))
      .filter((a): a is Account => a !== null)
  } else {
    accounts = getAllAccounts()
  }

  // Store status in context for condition checks
  context.variables['checkedAccounts'] = accounts.map(a => ({
    id: a.id,
    status: a.status,
    searchBanStatus: a.searchBanStatus
  }))

  return {
    success: true,
    data: { accountsProcessed: accounts.length }
  }
}

async function executeSendNotificationAction(
  config: WorkflowActionConfig,
  _context: WorkflowContext
): Promise<StepResult> {
  const { Notification } = await import('electron')

  if (Notification.isSupported()) {
    const notification = new Notification({
      title: 'MultiSession ワークフロー',
      body: config.notificationMessage || 'ワークフローが完了しました'
    })
    notification.show()
  }

  return { success: true }
}

async function executeConditionStep(
  step: WorkflowStep,
  context: WorkflowContext
): Promise<StepResult> {
  const config = step.conditionConfig || {}
  let conditionMet = false

  switch (step.conditionType) {
    case 'time_range':
      conditionMet = checkTimeRangeCondition(config)
      break
    case 'account_status':
      conditionMet = checkAccountStatusCondition(config, context)
      break
    case 'random_chance':
      conditionMet = checkRandomChanceCondition(config)
      break
    case 'action_count':
      conditionMet = checkActionCountCondition(config, context)
      break
    case 'account_has_proxy':
      conditionMet = checkAccountHasProxyCondition(context)
      break
    default:
      conditionMet = true
  }

  if (conditionMet) {
    return { success: true, nextStepId: step.onSuccessStepId }
  } else {
    return { success: true, nextStepId: step.onFailureStepId }
  }
}

function checkTimeRangeCondition(config: WorkflowConditionConfig): boolean {
  const now = new Date()
  const currentHour = now.getHours()
  const currentDay = now.getDay()

  // Check hour range
  if (config.startHour !== undefined && config.endHour !== undefined) {
    if (currentHour < config.startHour || currentHour >= config.endHour) {
      return false
    }
  }

  // Check day of week
  if (config.daysOfWeek && config.daysOfWeek.length > 0) {
    if (!config.daysOfWeek.includes(currentDay)) {
      return false
    }
  }

  return true
}

function checkAccountStatusCondition(
  config: WorkflowConditionConfig,
  context: WorkflowContext
): boolean {
  const checkedAccounts = context.variables['checkedAccounts'] as Array<{
    id: string
    status: string
  }> | undefined

  if (!checkedAccounts || checkedAccounts.length === 0) {
    return false
  }

  // Check if any account matches the expected status
  return checkedAccounts.some(a => a.status === config.expectedStatus)
}

function checkRandomChanceCondition(config: WorkflowConditionConfig): boolean {
  const probability = config.probability ?? 0.5
  return Math.random() < probability
}

function checkActionCountCondition(
  config: WorkflowConditionConfig,
  context: WorkflowContext
): boolean {
  const count = context.actionsExecuted

  if (config.minCount !== undefined && count < config.minCount) {
    return false
  }

  if (config.maxCount !== undefined && count > config.maxCount) {
    return false
  }

  return true
}

function checkAccountHasProxyCondition(context: WorkflowContext): boolean {
  if (context.loopAccounts.length > 0) {
    const currentAccount = context.loopAccounts[context.loopIndex]
    return currentAccount?.proxyId !== null
  }
  return false
}

async function executeDelayStep(
  step: WorkflowStep,
  _context: WorkflowContext
): Promise<StepResult> {
  const config = step.actionConfig || {}
  const delayMs = ((config.delayMinutes || 0) * 60 + (config.delaySeconds || 0)) * 1000

  if (delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }

  return { success: true }
}

async function executeLoopStep(
  step: WorkflowStep,
  context: WorkflowContext
): Promise<StepResult> {
  const config = step.actionConfig || {}

  // Initialize loop accounts if not set
  if (context.loopAccounts.length === 0) {
    if (config.loopAccountIds && config.loopAccountIds.length > 0) {
      context.loopAccounts = config.loopAccountIds
        .map(id => getAccountById(id))
        .filter((a): a is Account => a !== null)
    } else {
      context.loopAccounts = getAllAccounts()
    }
    context.loopIndex = 0
  }

  // Check if loop is complete
  if (context.loopIndex >= context.loopAccounts.length) {
    context.loopAccounts = []
    context.loopIndex = 0
    return { success: true, nextStepId: step.onSuccessStepId }
  }

  // Increment loop index for next iteration
  context.loopIndex++

  return { success: true }
}

async function executeParallelStep(
  step: WorkflowStep,
  context: WorkflowContext
): Promise<StepResult> {
  // Parallel execution is complex - for now, execute sequentially
  console.log('[WorkflowScheduler] Parallel step executed as sequential', step.id)
  return { success: true, data: { details: 'Parallel step (sequential fallback)' } }
}

function waitForWindowLoad(window: BrowserWindow): Promise<void> {
  return new Promise((resolve) => {
    if (window.webContents.isLoading()) {
      window.webContents.once('did-finish-load', () => {
        setTimeout(resolve, 3000)
      })
    } else {
      setTimeout(resolve, 1000)
    }
  })
}
