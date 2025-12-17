import { create } from 'zustand'

interface PostTemplate {
  id: string
  name: string
  content: string
  imageCategory: string | null
  createdAt: number
}

interface PostResult {
  accountId: string
  success: boolean
  error?: string
}

interface PostState {
  // Templates
  templates: PostTemplate[]
  isLoadingTemplates: boolean

  // Posting state
  selectedAccountIds: string[]
  loginStatusMap: Map<string, boolean>
  isCheckingLoginStatus: boolean
  isPosting: boolean
  postProgress: { completed: number; total: number } | null
  postResults: PostResult[]

  // Actions
  fetchTemplates: () => Promise<void>
  createTemplate: (name: string, content: string) => Promise<void>
  updateTemplate: (id: string, updates: { name?: string; content?: string }) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>

  setSelectedAccountIds: (ids: string[]) => void
  checkLoginStatus: (accountIds: string[]) => Promise<void>
  executeBulkPost: (content: string, delayBetweenPosts?: number) => Promise<PostResult[]>
  resetPostState: () => void
}

export const usePostStore = create<PostState>((set, get) => ({
  // Initial state
  templates: [],
  isLoadingTemplates: false,
  selectedAccountIds: [],
  loginStatusMap: new Map(),
  isCheckingLoginStatus: false,
  isPosting: false,
  postProgress: null,
  postResults: [],

  // Template actions
  fetchTemplates: async (): Promise<void> => {
    set({ isLoadingTemplates: true })
    try {
      const templates = (await window.api.post.getTemplates()) as PostTemplate[]
      set({ templates })
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      set({ isLoadingTemplates: false })
    }
  },

  createTemplate: async (name: string, content: string): Promise<void> => {
    try {
      const template = (await window.api.post.createTemplate(name, content)) as PostTemplate
      set((state) => ({ templates: [...state.templates, template] }))
    } catch (error) {
      console.error('Failed to create template:', error)
      throw error
    }
  },

  updateTemplate: async (
    id: string,
    updates: { name?: string; content?: string }
  ): Promise<void> => {
    try {
      const template = (await window.api.post.updateTemplate(id, updates)) as PostTemplate | null
      if (template) {
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? template : t))
        }))
      }
    } catch (error) {
      console.error('Failed to update template:', error)
      throw error
    }
  },

  deleteTemplate: async (id: string): Promise<void> => {
    try {
      await window.api.post.deleteTemplate(id)
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id)
      }))
    } catch (error) {
      console.error('Failed to delete template:', error)
      throw error
    }
  },

  // Account selection
  setSelectedAccountIds: (ids: string[]): void => {
    set({ selectedAccountIds: ids })
  },

  // Login status check
  checkLoginStatus: async (accountIds: string[]): Promise<void> => {
    set({ isCheckingLoginStatus: true })
    try {
      const results = await window.api.post.checkMultipleLoginStatus(accountIds)
      const statusMap = new Map<string, boolean>()
      results.forEach((r) => statusMap.set(r.accountId, r.loggedIn))
      set({ loginStatusMap: statusMap })
    } catch (error) {
      console.error('Failed to check login status:', error)
    } finally {
      set({ isCheckingLoginStatus: false })
    }
  },

  // Execute bulk post
  executeBulkPost: async (content: string, delayBetweenPosts = 5000): Promise<PostResult[]> => {
    const { selectedAccountIds } = get()

    if (selectedAccountIds.length === 0) {
      throw new Error('No accounts selected')
    }

    set({
      isPosting: true,
      postProgress: { completed: 0, total: selectedAccountIds.length },
      postResults: []
    })

    // Set up progress listener
    const unsubscribe = window.api.post.onProgress((data) => {
      set({
        postProgress: { completed: data.completed, total: data.total },
        postResults: (prev) => {
          const currentResults = get().postResults
          return [...currentResults, data.result as PostResult]
        }
      })
    })

    try {
      const results = (await window.api.post.executeBulk({
        accountIds: selectedAccountIds,
        content,
        delayBetweenPosts
      })) as PostResult[]

      set({ postResults: results })
      return results
    } catch (error) {
      console.error('Failed to execute bulk post:', error)
      throw error
    } finally {
      unsubscribe()
      set({ isPosting: false })
    }
  },

  // Reset state
  resetPostState: (): void => {
    set({
      selectedAccountIds: [],
      postProgress: null,
      postResults: []
    })
  }
}))
