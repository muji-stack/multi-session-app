import { create } from 'zustand'
import type { MediaItem, MediaTag, MediaType, MediaStats } from '../../shared/types'

interface GetAllMediaOptions {
  mediaType?: MediaType
  tags?: string[]
  isFavorite?: boolean
  search?: string
  limit?: number
  offset?: number
  sortBy?: 'created_at' | 'file_name' | 'use_count' | 'file_size'
  sortOrder?: 'asc' | 'desc'
}

interface UpdateMediaInput {
  fileName?: string
  tags?: string[]
  description?: string | null
  isFavorite?: boolean
}

interface MediaState {
  mediaItems: MediaItem[]
  selectedMedia: MediaItem | null
  selectedMediaIds: string[]
  tags: MediaTag[]
  stats: MediaStats | null
  isLoading: boolean
  isUploading: boolean
  error: string | null
  filters: GetAllMediaOptions

  // Media CRUD
  fetchMedia: (options?: GetAllMediaOptions) => Promise<void>
  fetchMediaById: (id: string) => Promise<MediaItem | null>
  uploadMedia: (filePaths?: string[], tags?: string[]) => Promise<{ success: boolean; uploaded: MediaItem[]; errors?: string[] }>
  updateMedia: (id: string, updates: UpdateMediaInput) => Promise<void>
  deleteMedia: (id: string) => Promise<boolean>
  deleteMediaBatch: (ids: string[]) => Promise<{ success: number; failed: number }>
  toggleFavorite: (id: string) => Promise<void>
  incrementUseCount: (id: string) => Promise<void>

  // Tags
  fetchTags: () => Promise<void>
  createTag: (name: string, color?: string) => Promise<MediaTag>
  updateTag: (id: string, updates: { name?: string; color?: string }) => Promise<void>
  deleteTag: (id: string) => Promise<void>

  // Stats
  fetchStats: () => Promise<void>

  // Selection
  selectMedia: (media: MediaItem | null) => void
  toggleMediaSelection: (id: string) => void
  selectAllMedia: () => void
  clearSelection: () => void

  // Filters
  setFilters: (filters: Partial<GetAllMediaOptions>) => void
  clearFilters: () => void

  // Storage
  getStoragePath: () => Promise<string>
  openStorageFolder: () => Promise<void>
  getFilePath: (id: string) => Promise<string | null>
}

const defaultFilters: GetAllMediaOptions = {
  sortBy: 'created_at',
  sortOrder: 'desc',
  limit: 100,
  offset: 0
}

export const useMediaStore = create<MediaState>((set, get) => ({
  mediaItems: [],
  selectedMedia: null,
  selectedMediaIds: [],
  tags: [],
  stats: null,
  isLoading: false,
  isUploading: false,
  error: null,
  filters: defaultFilters,

  // Media CRUD
  fetchMedia: async (options?: GetAllMediaOptions) => {
    set({ isLoading: true, error: null })
    try {
      const mergedOptions = { ...get().filters, ...options }
      const mediaItems = (await window.api.media.getAll(mergedOptions)) as MediaItem[]
      set({ mediaItems, isLoading: false, filters: mergedOptions })
    } catch (error) {
      set({ error: 'メディアの取得に失敗しました', isLoading: false })
    }
  },

  fetchMediaById: async (id: string) => {
    try {
      const media = (await window.api.media.getById(id)) as MediaItem | null
      if (media) {
        set({ selectedMedia: media })
      }
      return media
    } catch (error) {
      console.error('Failed to fetch media:', error)
      return null
    }
  },

  uploadMedia: async (filePaths?: string[], tags?: string[]) => {
    set({ isUploading: true, error: null })
    try {
      const result = await window.api.media.upload({ filePaths, tags })
      if (result.success) {
        // Refresh media list
        await get().fetchMedia()
        await get().fetchStats()
      }
      set({ isUploading: false })
      return {
        success: result.success,
        uploaded: result.uploaded as MediaItem[],
        errors: result.errors
      }
    } catch (error) {
      set({ error: 'メディアのアップロードに失敗しました', isUploading: false })
      return { success: false, uploaded: [], errors: ['アップロードに失敗しました'] }
    }
  },

  updateMedia: async (id: string, updates: UpdateMediaInput) => {
    try {
      const updatedMedia = (await window.api.media.update(id, updates)) as MediaItem | null
      if (updatedMedia) {
        set((state) => ({
          mediaItems: state.mediaItems.map((m) => (m.id === id ? updatedMedia : m)),
          selectedMedia: state.selectedMedia?.id === id ? updatedMedia : state.selectedMedia
        }))
      }
    } catch (error) {
      console.error('Failed to update media:', error)
    }
  },

  deleteMedia: async (id: string) => {
    try {
      const success = await window.api.media.delete(id)
      if (success) {
        set((state) => ({
          mediaItems: state.mediaItems.filter((m) => m.id !== id),
          selectedMedia: state.selectedMedia?.id === id ? null : state.selectedMedia,
          selectedMediaIds: state.selectedMediaIds.filter((mid) => mid !== id)
        }))
        await get().fetchStats()
      }
      return success
    } catch (error) {
      console.error('Failed to delete media:', error)
      return false
    }
  },

  deleteMediaBatch: async (ids: string[]) => {
    try {
      const result = await window.api.media.deleteBatch(ids)
      if (result.success > 0) {
        set((state) => ({
          mediaItems: state.mediaItems.filter((m) => !ids.includes(m.id)),
          selectedMedia: state.selectedMedia && ids.includes(state.selectedMedia.id) ? null : state.selectedMedia,
          selectedMediaIds: state.selectedMediaIds.filter((id) => !ids.includes(id))
        }))
        await get().fetchStats()
      }
      return result
    } catch (error) {
      console.error('Failed to delete media batch:', error)
      return { success: 0, failed: ids.length }
    }
  },

  toggleFavorite: async (id: string) => {
    try {
      const updatedMedia = (await window.api.media.toggleFavorite(id)) as MediaItem | null
      if (updatedMedia) {
        set((state) => ({
          mediaItems: state.mediaItems.map((m) => (m.id === id ? updatedMedia : m)),
          selectedMedia: state.selectedMedia?.id === id ? updatedMedia : state.selectedMedia
        }))
        await get().fetchStats()
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  },

  incrementUseCount: async (id: string) => {
    try {
      await window.api.media.incrementUseCount(id)
      set((state) => ({
        mediaItems: state.mediaItems.map((m) =>
          m.id === id ? { ...m, useCount: m.useCount + 1 } : m
        )
      }))
    } catch (error) {
      console.error('Failed to increment use count:', error)
    }
  },

  // Tags
  fetchTags: async () => {
    try {
      const tags = (await window.api.media.getTags()) as MediaTag[]
      set({ tags })
    } catch (error) {
      console.error('Failed to fetch tags:', error)
    }
  },

  createTag: async (name: string, color?: string) => {
    const tag = (await window.api.media.createTag(name, color)) as MediaTag
    set((state) => ({ tags: [...state.tags, tag] }))
    return tag
  },

  updateTag: async (id: string, updates: { name?: string; color?: string }) => {
    try {
      const updatedTag = (await window.api.media.updateTag(id, updates)) as MediaTag | null
      if (updatedTag) {
        set((state) => ({
          tags: state.tags.map((t) => (t.id === id ? updatedTag : t))
        }))
      }
    } catch (error) {
      console.error('Failed to update tag:', error)
    }
  },

  deleteTag: async (id: string) => {
    try {
      const success = await window.api.media.deleteTag(id)
      if (success) {
        set((state) => ({
          tags: state.tags.filter((t) => t.id !== id)
        }))
      }
    } catch (error) {
      console.error('Failed to delete tag:', error)
    }
  },

  // Stats
  fetchStats: async () => {
    try {
      const stats = (await window.api.media.getStats()) as MediaStats
      set({ stats })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  },

  // Selection
  selectMedia: (media: MediaItem | null) => {
    set({ selectedMedia: media })
  },

  toggleMediaSelection: (id: string) => {
    set((state) => {
      const isSelected = state.selectedMediaIds.includes(id)
      return {
        selectedMediaIds: isSelected
          ? state.selectedMediaIds.filter((mid) => mid !== id)
          : [...state.selectedMediaIds, id]
      }
    })
  },

  selectAllMedia: () => {
    set((state) => ({
      selectedMediaIds: state.mediaItems.map((m) => m.id)
    }))
  },

  clearSelection: () => {
    set({ selectedMediaIds: [] })
  },

  // Filters
  setFilters: (filters: Partial<GetAllMediaOptions>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters }
    }))
  },

  clearFilters: () => {
    set({ filters: defaultFilters })
  },

  // Storage
  getStoragePath: async () => {
    return await window.api.media.getStoragePath()
  },

  openStorageFolder: async () => {
    await window.api.media.openStorageFolder()
  },

  getFilePath: async (id: string) => {
    return await window.api.media.getFilePath(id)
  }
}))
