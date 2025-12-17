import { create } from 'zustand'
import type { ScheduledPost, ScheduledPostStatus } from '../../shared/types'

interface ScheduledPostStats {
  pending: number
  completed: number
  failed: number
  cancelled: number
}

interface ScheduledPostState {
  scheduledPosts: ScheduledPost[]
  stats: ScheduledPostStats | null
  isLoading: boolean
  filterStatus: ScheduledPostStatus | 'all'

  fetchScheduledPosts: () => Promise<void>
  fetchStats: () => Promise<void>
  createScheduledPost: (input: {
    accountId: string
    content: string
    mediaIds?: string[]
    scheduledAt: number
  }) => Promise<ScheduledPost>
  updateScheduledPost: (
    id: string,
    updates: { content?: string; mediaIds?: string[] | null; scheduledAt?: number }
  ) => Promise<void>
  deleteScheduledPost: (id: string) => Promise<void>
  cancelScheduledPost: (id: string) => Promise<void>
  setFilterStatus: (status: ScheduledPostStatus | 'all') => void
  getScheduledPostById: (id: string) => ScheduledPost | undefined
  getScheduledPostsByAccount: (accountId: string) => ScheduledPost[]
}

export const useScheduledPostStore = create<ScheduledPostState>((set, get) => ({
  scheduledPosts: [],
  stats: null,
  isLoading: false,
  filterStatus: 'all',

  fetchScheduledPosts: async (): Promise<void> => {
    set({ isLoading: true })
    try {
      const scheduledPosts = (await window.api.scheduledPost.getAll()) as ScheduledPost[]
      set({ scheduledPosts })
    } catch (error) {
      console.error('Failed to fetch scheduled posts:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  fetchStats: async (): Promise<void> => {
    try {
      const stats = await window.api.scheduledPost.getStats()
      set({ stats })
    } catch (error) {
      console.error('Failed to fetch scheduled post stats:', error)
    }
  },

  createScheduledPost: async (input): Promise<ScheduledPost> => {
    try {
      const scheduledPost = (await window.api.scheduledPost.create(input)) as ScheduledPost
      set((state) => ({
        scheduledPosts: [...state.scheduledPosts, scheduledPost].sort(
          (a, b) => a.scheduledAt - b.scheduledAt
        )
      }))
      // Update stats
      get().fetchStats()
      return scheduledPost
    } catch (error) {
      console.error('Failed to create scheduled post:', error)
      throw error
    }
  },

  updateScheduledPost: async (id, updates): Promise<void> => {
    try {
      const scheduledPost = (await window.api.scheduledPost.update(id, updates)) as ScheduledPost | null
      if (scheduledPost) {
        set((state) => ({
          scheduledPosts: state.scheduledPosts
            .map((sp) => (sp.id === id ? scheduledPost : sp))
            .sort((a, b) => a.scheduledAt - b.scheduledAt)
        }))
      }
    } catch (error) {
      console.error('Failed to update scheduled post:', error)
      throw error
    }
  },

  deleteScheduledPost: async (id): Promise<void> => {
    try {
      await window.api.scheduledPost.delete(id)
      set((state) => ({
        scheduledPosts: state.scheduledPosts.filter((sp) => sp.id !== id)
      }))
      get().fetchStats()
    } catch (error) {
      console.error('Failed to delete scheduled post:', error)
      throw error
    }
  },

  cancelScheduledPost: async (id): Promise<void> => {
    try {
      const scheduledPost = (await window.api.scheduledPost.cancel(id)) as ScheduledPost | null
      if (scheduledPost) {
        set((state) => ({
          scheduledPosts: state.scheduledPosts.map((sp) => (sp.id === id ? scheduledPost : sp))
        }))
        get().fetchStats()
      }
    } catch (error) {
      console.error('Failed to cancel scheduled post:', error)
      throw error
    }
  },

  setFilterStatus: (status): void => {
    set({ filterStatus: status })
  },

  getScheduledPostById: (id): ScheduledPost | undefined => {
    return get().scheduledPosts.find((sp) => sp.id === id)
  },

  getScheduledPostsByAccount: (accountId): ScheduledPost[] => {
    return get().scheduledPosts.filter((sp) => sp.accountId === accountId)
  }
}))
