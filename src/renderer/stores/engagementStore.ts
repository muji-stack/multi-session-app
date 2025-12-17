import { create } from 'zustand'

interface EngagementResult {
  accountId: string
  success: boolean
  error?: string
}

type ActionType = 'like' | 'retweet' | 'follow'

interface EngagementState {
  selectedAccountIds: string[]
  targetUrl: string
  actionType: ActionType
  isExecuting: boolean
  progress: { completed: number; total: number } | null
  results: EngagementResult[]

  setSelectedAccountIds: (ids: string[]) => void
  setTargetUrl: (url: string) => void
  setActionType: (type: ActionType) => void
  executeEngagement: (delayBetweenActions?: number) => Promise<EngagementResult[]>
  resetState: () => void
}

export const useEngagementStore = create<EngagementState>((set, get) => ({
  selectedAccountIds: [],
  targetUrl: '',
  actionType: 'like',
  isExecuting: false,
  progress: null,
  results: [],

  setSelectedAccountIds: (ids: string[]): void => {
    set({ selectedAccountIds: ids })
  },

  setTargetUrl: (url: string): void => {
    set({ targetUrl: url })
  },

  setActionType: (type: ActionType): void => {
    set({ actionType: type })
  },

  executeEngagement: async (delayBetweenActions = 3000): Promise<EngagementResult[]> => {
    const { selectedAccountIds, targetUrl, actionType } = get()

    if (selectedAccountIds.length === 0 || !targetUrl.trim()) {
      throw new Error('No accounts selected or target URL is empty')
    }

    set({
      isExecuting: true,
      progress: { completed: 0, total: selectedAccountIds.length },
      results: []
    })

    const unsubscribe = window.api.engagement.onProgress((data) => {
      set({
        progress: { completed: data.completed, total: data.total }
      })
    })

    try {
      const results = (await window.api.engagement.executeBulk({
        accountIds: selectedAccountIds,
        targetUrl,
        actionType,
        delayBetweenActions
      })) as EngagementResult[]

      set({ results })
      return results
    } catch (error) {
      console.error('Failed to execute engagement:', error)
      throw error
    } finally {
      unsubscribe()
      set({ isExecuting: false })
    }
  },

  resetState: (): void => {
    set({
      selectedAccountIds: [],
      targetUrl: '',
      progress: null,
      results: []
    })
  }
}))
