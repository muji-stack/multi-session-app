import { v4 as uuidv4 } from 'uuid'
import { app } from 'electron'
import { join, extname, basename } from 'path'
import { existsSync, mkdirSync, copyFileSync, unlinkSync, statSync } from 'fs'
import { getDatabase } from './index'
import type { MediaItem, MediaTag, MediaType, MediaStats } from '../../shared/types'

// Row types for database mapping
interface MediaItemRow {
  id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  media_type: string
  width: number | null
  height: number | null
  duration: number | null
  thumbnail_path: string | null
  tags: string
  description: string | null
  is_favorite: number
  use_count: number
  last_used_at: number | null
  created_at: number
  updated_at: number
}

interface MediaTagRow {
  id: string
  name: string
  color: string
  use_count: number
  created_at: number
}

// Row to model converters
function rowToMediaItem(row: MediaItemRow): MediaItem {
  return {
    id: row.id,
    fileName: row.file_name,
    filePath: row.file_path,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    mediaType: row.media_type as MediaType,
    width: row.width,
    height: row.height,
    duration: row.duration,
    thumbnailPath: row.thumbnail_path,
    tags: JSON.parse(row.tags),
    description: row.description,
    isFavorite: row.is_favorite === 1,
    useCount: row.use_count,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function rowToMediaTag(row: MediaTagRow): MediaTag {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    useCount: row.use_count,
    createdAt: row.created_at
  }
}

// Get media storage directory
function getMediaStorageDir(): string {
  const userDataPath = app.getPath('userData')
  const mediaDir = join(userDataPath, 'media')
  if (!existsSync(mediaDir)) {
    mkdirSync(mediaDir, { recursive: true })
  }
  return mediaDir
}

function getThumbnailDir(): string {
  const mediaDir = getMediaStorageDir()
  const thumbDir = join(mediaDir, 'thumbnails')
  if (!existsSync(thumbDir)) {
    mkdirSync(thumbDir, { recursive: true })
  }
  return thumbDir
}

// Determine media type from mime type
function getMediaTypeFromMime(mimeType: string): MediaType {
  if (mimeType === 'image/gif') return 'gif'
  if (mimeType.startsWith('video/')) return 'video'
  return 'image'
}

// =====================
// Media Item CRUD
// =====================

export function getAllMedia(options?: {
  mediaType?: MediaType
  tags?: string[]
  isFavorite?: boolean
  search?: string
  limit?: number
  offset?: number
  sortBy?: 'created_at' | 'file_name' | 'use_count' | 'file_size'
  sortOrder?: 'asc' | 'desc'
}): MediaItem[] {
  const db = getDatabase()
  let query = 'SELECT * FROM media_library WHERE 1=1'
  const params: unknown[] = []

  if (options?.mediaType) {
    query += ' AND media_type = ?'
    params.push(options.mediaType)
  }

  if (options?.isFavorite !== undefined) {
    query += ' AND is_favorite = ?'
    params.push(options.isFavorite ? 1 : 0)
  }

  if (options?.search) {
    query += ' AND (file_name LIKE ? OR description LIKE ?)'
    const searchTerm = `%${options.search}%`
    params.push(searchTerm, searchTerm)
  }

  // Sort
  const sortBy = options?.sortBy || 'created_at'
  const sortOrder = options?.sortOrder || 'desc'
  query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`

  // Pagination
  if (options?.limit) {
    query += ' LIMIT ?'
    params.push(options.limit)
    if (options?.offset) {
      query += ' OFFSET ?'
      params.push(options.offset)
    }
  }

  const rows = db.prepare(query).all(...params) as MediaItemRow[]
  let items = rows.map(rowToMediaItem)

  // Filter by tags (post-query since tags are stored as JSON)
  if (options?.tags && options.tags.length > 0) {
    items = items.filter((item) =>
      options.tags!.some((tag) => item.tags.includes(tag))
    )
  }

  return items
}

export function getMediaById(id: string): MediaItem | null {
  const db = getDatabase()
  const row = db
    .prepare('SELECT * FROM media_library WHERE id = ?')
    .get(id) as MediaItemRow | undefined
  return row ? rowToMediaItem(row) : null
}

export function getMediaByIds(ids: string[]): MediaItem[] {
  if (ids.length === 0) return []
  const db = getDatabase()
  const placeholders = ids.map(() => '?').join(',')
  const rows = db
    .prepare(`SELECT * FROM media_library WHERE id IN (${placeholders})`)
    .all(...ids) as MediaItemRow[]
  return rows.map(rowToMediaItem)
}

interface UploadMediaInput {
  sourcePath: string
  fileName?: string
  mimeType: string
  width?: number | null
  height?: number | null
  duration?: number | null
  tags?: string[]
  description?: string | null
}

export function uploadMedia(input: UploadMediaInput): MediaItem {
  const db = getDatabase()
  const id = uuidv4()
  const now = Date.now()

  // Get file info
  const stats = statSync(input.sourcePath)
  const fileSize = stats.size
  const originalFileName = input.fileName || basename(input.sourcePath)
  const ext = extname(originalFileName)

  // Generate unique filename
  const uniqueFileName = `${id}${ext}`
  const mediaDir = getMediaStorageDir()
  const destPath = join(mediaDir, uniqueFileName)

  // Copy file to media storage
  copyFileSync(input.sourcePath, destPath)

  const mediaType = getMediaTypeFromMime(input.mimeType)

  db.prepare(`
    INSERT INTO media_library (
      id, file_name, file_path, file_size, mime_type, media_type,
      width, height, duration, thumbnail_path, tags, description,
      is_favorite, use_count, last_used_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    originalFileName,
    destPath,
    fileSize,
    input.mimeType,
    mediaType,
    input.width ?? null,
    input.height ?? null,
    input.duration ?? null,
    null,
    JSON.stringify(input.tags || []),
    input.description ?? null,
    0,
    0,
    null,
    now,
    now
  )

  // Update tag use counts
  if (input.tags && input.tags.length > 0) {
    for (const tagName of input.tags) {
      incrementTagUseCount(tagName)
    }
  }

  return getMediaById(id)!
}

interface UpdateMediaInput {
  fileName?: string
  tags?: string[]
  description?: string | null
  isFavorite?: boolean
}

export function updateMedia(id: string, updates: UpdateMediaInput): MediaItem | null {
  const db = getDatabase()
  const existing = getMediaById(id)
  if (!existing) return null

  const now = Date.now()
  const fileName = updates.fileName ?? existing.fileName
  const tags = updates.tags ?? existing.tags
  const description = updates.description !== undefined ? updates.description : existing.description
  const isFavorite = updates.isFavorite !== undefined ? (updates.isFavorite ? 1 : 0) : (existing.isFavorite ? 1 : 0)

  // Update tag counts if tags changed
  if (updates.tags) {
    const oldTags = new Set(existing.tags)
    const newTags = new Set(updates.tags)

    // Decrement old tags that are removed
    for (const tag of oldTags) {
      if (!newTags.has(tag)) {
        decrementTagUseCount(tag)
      }
    }

    // Increment new tags that are added
    for (const tag of newTags) {
      if (!oldTags.has(tag)) {
        incrementTagUseCount(tag)
      }
    }
  }

  db.prepare(`
    UPDATE media_library
    SET file_name = ?, tags = ?, description = ?, is_favorite = ?, updated_at = ?
    WHERE id = ?
  `).run(fileName, JSON.stringify(tags), description, isFavorite, now, id)

  return getMediaById(id)
}

export function deleteMedia(id: string): boolean {
  const db = getDatabase()
  const existing = getMediaById(id)
  if (!existing) return false

  // Decrement tag use counts
  for (const tag of existing.tags) {
    decrementTagUseCount(tag)
  }

  // Delete file from storage
  if (existsSync(existing.filePath)) {
    try {
      unlinkSync(existing.filePath)
    } catch {
      console.error('Failed to delete media file:', existing.filePath)
    }
  }

  // Delete thumbnail if exists
  if (existing.thumbnailPath && existsSync(existing.thumbnailPath)) {
    try {
      unlinkSync(existing.thumbnailPath)
    } catch {
      console.error('Failed to delete thumbnail:', existing.thumbnailPath)
    }
  }

  const result = db.prepare('DELETE FROM media_library WHERE id = ?').run(id)
  return result.changes > 0
}

export function deleteMediaBatch(ids: string[]): number {
  let deleted = 0
  for (const id of ids) {
    if (deleteMedia(id)) {
      deleted++
    }
  }
  return deleted
}

export function toggleFavorite(id: string): MediaItem | null {
  const existing = getMediaById(id)
  if (!existing) return null
  return updateMedia(id, { isFavorite: !existing.isFavorite })
}

export function incrementUseCount(id: string): void {
  const db = getDatabase()
  const now = Date.now()
  db.prepare(`
    UPDATE media_library
    SET use_count = use_count + 1, last_used_at = ?, updated_at = ?
    WHERE id = ?
  `).run(now, now, id)
}

// =====================
// Media Tags CRUD
// =====================

export function getAllTags(): MediaTag[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM media_tags ORDER BY use_count DESC, name ASC')
    .all() as MediaTagRow[]
  return rows.map(rowToMediaTag)
}

export function getTagByName(name: string): MediaTag | null {
  const db = getDatabase()
  const row = db
    .prepare('SELECT * FROM media_tags WHERE name = ?')
    .get(name) as MediaTagRow | undefined
  return row ? rowToMediaTag(row) : null
}

export function createTag(name: string, color?: string): MediaTag {
  const db = getDatabase()
  const existing = getTagByName(name)
  if (existing) return existing

  const id = uuidv4()
  const now = Date.now()

  db.prepare(`
    INSERT INTO media_tags (id, name, color, use_count, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name.toLowerCase().trim(), color || '#6366f1', 0, now)

  return getTagByName(name)!
}

export function updateTag(id: string, updates: { name?: string; color?: string }): MediaTag | null {
  const db = getDatabase()
  const existing = db.prepare('SELECT * FROM media_tags WHERE id = ?').get(id) as MediaTagRow | undefined
  if (!existing) return null

  const name = updates.name ?? existing.name
  const color = updates.color ?? existing.color

  db.prepare('UPDATE media_tags SET name = ?, color = ? WHERE id = ?').run(name, color, id)

  return { ...rowToMediaTag(existing), name, color }
}

export function deleteTag(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM media_tags WHERE id = ?').run(id)
  return result.changes > 0
}

function incrementTagUseCount(tagName: string): void {
  const db = getDatabase()
  const tag = getTagByName(tagName)
  if (tag) {
    db.prepare('UPDATE media_tags SET use_count = use_count + 1 WHERE name = ?').run(tagName)
  } else {
    createTag(tagName)
    db.prepare('UPDATE media_tags SET use_count = 1 WHERE name = ?').run(tagName)
  }
}

function decrementTagUseCount(tagName: string): void {
  const db = getDatabase()
  db.prepare('UPDATE media_tags SET use_count = MAX(0, use_count - 1) WHERE name = ?').run(tagName)
}

// =====================
// Stats
// =====================

export function getMediaStats(): MediaStats {
  const db = getDatabase()

  const stats = db
    .prepare(`
      SELECT
        COUNT(*) as total_items,
        SUM(CASE WHEN media_type = 'image' THEN 1 ELSE 0 END) as total_images,
        SUM(CASE WHEN media_type = 'video' THEN 1 ELSE 0 END) as total_videos,
        SUM(CASE WHEN media_type = 'gif' THEN 1 ELSE 0 END) as total_gifs,
        SUM(file_size) as total_size,
        SUM(is_favorite) as favorite_count
      FROM media_library
    `)
    .get() as {
      total_items: number
      total_images: number
      total_videos: number
      total_gifs: number
      total_size: number
      favorite_count: number
    }

  return {
    totalItems: stats.total_items || 0,
    totalImages: stats.total_images || 0,
    totalVideos: stats.total_videos || 0,
    totalGifs: stats.total_gifs || 0,
    totalSize: stats.total_size || 0,
    favoriteCount: stats.favorite_count || 0
  }
}

// =====================
// Utilities
// =====================

export function getMediaStoragePath(): string {
  return getMediaStorageDir()
}

export function cleanupOrphanedFiles(): number {
  const db = getDatabase()
  const mediaDir = getMediaStorageDir()
  let cleaned = 0

  // Get all file paths in database
  const rows = db.prepare('SELECT file_path FROM media_library').all() as { file_path: string }[]
  const dbPaths = new Set(rows.map((r) => r.file_path))

  // Check files in media directory
  const { readdirSync } = require('fs')
  const files = readdirSync(mediaDir) as string[]

  for (const file of files) {
    if (file === 'thumbnails') continue
    const filePath = join(mediaDir, file)
    if (!dbPaths.has(filePath)) {
      try {
        unlinkSync(filePath)
        cleaned++
      } catch {
        // Ignore errors
      }
    }
  }

  return cleaned
}
