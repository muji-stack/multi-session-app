import { ipcMain, dialog, shell } from 'electron'
import { extname } from 'path'
import {
  getAllMedia,
  getMediaById,
  getMediaByIds,
  uploadMedia,
  updateMedia,
  deleteMedia,
  deleteMediaBatch,
  toggleFavorite,
  incrementUseCount,
  getAllTags,
  createTag,
  updateTag,
  deleteTag,
  getMediaStats,
  getMediaStoragePath
} from '../database/mediaRepository'
import type { MediaType } from '../../shared/types'

// MIME type mapping
const mimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime'
}

function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  return mimeTypes[ext] || 'application/octet-stream'
}

// Input types
interface GetAllMediaInput {
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

interface UploadFilesInput {
  filePaths: string[]
  tags?: string[]
}

export function registerMediaHandlers(): void {
  // =====================
  // Media Items
  // =====================

  // Get all media with filters
  ipcMain.handle('media:getAll', (_event, options?: GetAllMediaInput) => {
    return getAllMedia(options)
  })

  // Get media by ID
  ipcMain.handle('media:getById', (_event, id: string) => {
    return getMediaById(id)
  })

  // Get media by IDs
  ipcMain.handle('media:getByIds', (_event, ids: string[]) => {
    return getMediaByIds(ids)
  })

  // Upload media files (from file dialog)
  ipcMain.handle('media:upload', async (_event, input?: UploadFilesInput) => {
    let filePaths = input?.filePaths
    const tags = input?.tags || []

    // If no paths provided, open file dialog
    if (!filePaths || filePaths.length === 0) {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
          {
            name: 'Media Files',
            extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov']
          }
        ]
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, uploaded: [], error: 'No files selected' }
      }

      filePaths = result.filePaths
    }

    const uploaded: unknown[] = []
    const errors: string[] = []

    for (const sourcePath of filePaths) {
      try {
        const mimeType = getMimeType(sourcePath)
        const media = uploadMedia({
          sourcePath,
          mimeType,
          tags
        })
        uploaded.push(media)
      } catch (error) {
        errors.push(`Failed to upload ${sourcePath}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return {
      success: uploaded.length > 0,
      uploaded,
      errors: errors.length > 0 ? errors : undefined
    }
  })

  // Update media
  ipcMain.handle('media:update', (_event, id: string, updates: UpdateMediaInput) => {
    return updateMedia(id, updates)
  })

  // Delete media
  ipcMain.handle('media:delete', (_event, id: string) => {
    return deleteMedia(id)
  })

  // Delete multiple media
  ipcMain.handle('media:deleteBatch', (_event, ids: string[]) => {
    return deleteMediaBatch(ids)
  })

  // Toggle favorite
  ipcMain.handle('media:toggleFavorite', (_event, id: string) => {
    return toggleFavorite(id)
  })

  // Increment use count (when media is used in a post)
  ipcMain.handle('media:incrementUseCount', (_event, id: string) => {
    incrementUseCount(id)
    return true
  })

  // =====================
  // Tags
  // =====================

  // Get all tags
  ipcMain.handle('media:getTags', () => {
    return getAllTags()
  })

  // Create tag
  ipcMain.handle('media:createTag', (_event, name: string, color?: string) => {
    return createTag(name, color)
  })

  // Update tag
  ipcMain.handle('media:updateTag', (_event, id: string, updates: { name?: string; color?: string }) => {
    return updateTag(id, updates)
  })

  // Delete tag
  ipcMain.handle('media:deleteTag', (_event, id: string) => {
    return deleteTag(id)
  })

  // =====================
  // Stats & Utilities
  // =====================

  // Get media stats
  ipcMain.handle('media:getStats', () => {
    return getMediaStats()
  })

  // Get storage path
  ipcMain.handle('media:getStoragePath', () => {
    return getMediaStoragePath()
  })

  // Open storage folder
  ipcMain.handle('media:openStorageFolder', () => {
    const storagePath = getMediaStoragePath()
    shell.openPath(storagePath)
    return true
  })

  // Get media file (for display in renderer)
  ipcMain.handle('media:getFilePath', (_event, id: string) => {
    const media = getMediaById(id)
    return media?.filePath || null
  })
}
