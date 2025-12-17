import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Upload,
  Search,
  Filter,
  Grid,
  List,
  Heart,
  Trash2,
  FolderOpen,
  Image as ImageIcon,
  Video,
  Tag,
  Plus,
  X,
  Check,
  MoreVertical,
  Download,
  Edit2,
  Star,
  HardDrive
} from 'lucide-react'
import { useMediaStore } from '../stores/mediaStore'
import { useToastStore } from '../stores/toastStore'
import type { MediaItem, MediaTag, MediaType } from '../../shared/types'

type ViewMode = 'grid' | 'list'
type SortBy = 'created_at' | 'file_name' | 'use_count' | 'file_size'

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Media Card Component
function MediaCard({
  media,
  isSelected,
  onSelect,
  onToggleFavorite,
  onDelete,
  onClick
}: {
  media: MediaItem
  isSelected: boolean
  onSelect: () => void
  onToggleFavorite: () => void
  onDelete: () => void
  onClick: () => void
}): JSX.Element {
  const [showMenu, setShowMenu] = useState(false)
  const isImage = media.mediaType === 'image'

  return (
    <div
      className={`relative group rounded-xl overflow-hidden bg-surface-dark border transition-all cursor-pointer ${
        isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-white/10 hover:border-white/20'
      }`}
      onClick={onClick}
    >
      {/* Checkbox */}
      <div
        className="absolute top-2 left-2 z-10"
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      >
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-primary border-primary'
              : 'border-white/30 bg-black/50 opacity-0 group-hover:opacity-100'
          }`}
        >
          {isSelected && <Check size={12} className="text-white" />}
        </div>
      </div>

      {/* Favorite Button */}
      <button
        className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite()
        }}
      >
        <Heart
          size={16}
          className={media.isFavorite ? 'text-red-500 fill-red-500' : 'text-white'}
        />
      </button>

      {/* Thumbnail */}
      <div className="aspect-square bg-surface flex items-center justify-center overflow-hidden">
        {isImage ? (
          <img
            src={`file://${media.filePath}`}
            alt={media.fileName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="relative w-full h-full">
            {media.thumbnailPath ? (
              <img
                src={`file://${media.thumbnailPath}`}
                alt={media.fileName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <Video size={48} className="text-gray-500" />
              </div>
            )}
            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 rounded text-xs text-white">
              {media.duration ? `${Math.floor(media.duration / 60)}:${String(media.duration % 60).padStart(2, '0')}` : 'VIDEO'}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm text-white truncate">{media.fileName}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-400">{formatFileSize(media.fileSize)}</span>
          {media.useCount > 0 && (
            <span className="text-xs text-gray-400">使用: {media.useCount}回</span>
          )}
        </div>
        {media.tags && media.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {media.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-xs rounded bg-white/10 text-gray-300"
              >
                {tag}
              </span>
            ))}
            {media.tags.length > 3 && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-white/10 text-gray-300">
                +{media.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Menu Button */}
      <div className="absolute bottom-2 right-2">
        <button
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
        >
          <MoreVertical size={16} className="text-gray-400" />
        </button>
        {showMenu && (
          <div className="absolute bottom-full right-0 mb-1 py-1 bg-surface-dark border border-white/10 rounded-lg shadow-xl z-20">
            <button
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-white/5 flex items-center gap-2 text-red-400"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
                setShowMenu(false)
              }}
            >
              <Trash2 size={14} />
              削除
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Media List Item Component
function MediaListItem({
  media,
  isSelected,
  onSelect,
  onToggleFavorite,
  onDelete,
  onClick
}: {
  media: MediaItem
  isSelected: boolean
  onSelect: () => void
  onToggleFavorite: () => void
  onDelete: () => void
  onClick: () => void
}): JSX.Element {
  const isImage = media.mediaType === 'image'

  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-xl bg-surface-dark border transition-all cursor-pointer ${
        isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-white/10 hover:border-white/20'
      }`}
      onClick={onClick}
    >
      {/* Checkbox */}
      <div
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      >
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            isSelected ? 'bg-primary border-primary' : 'border-white/30 hover:border-white/50'
          }`}
        >
          {isSelected && <Check size={12} className="text-white" />}
        </div>
      </div>

      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
        {isImage ? (
          <img
            src={`file://${media.filePath}`}
            alt={media.fileName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : media.thumbnailPath ? (
          <img
            src={`file://${media.thumbnailPath}`}
            alt={media.fileName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <Video size={24} className="text-gray-500" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{media.fileName}</p>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            {isImage ? <ImageIcon size={14} /> : <Video size={14} />}
            {isImage ? '画像' : '動画'}
          </span>
          <span>{formatFileSize(media.fileSize)}</span>
          <span>{formatDate(media.createdAt)}</span>
        </div>
        {media.tags && media.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {media.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-xs rounded bg-white/10 text-gray-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
        >
          <Heart
            size={18}
            className={media.isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-400'}
          />
        </button>
        <button
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-red-400"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  )
}

// Tag Manager Modal
function TagManagerModal({
  isOpen,
  onClose,
  tags,
  onCreateTag,
  onDeleteTag
}: {
  isOpen: boolean
  onClose: () => void
  tags: MediaTag[]
  onCreateTag: (name: string, color?: string) => Promise<void>
  onDeleteTag: (id: string) => Promise<void>
}): JSX.Element | null {
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3b82f6')

  if (!isOpen) return null

  const handleCreateTag = async (): Promise<void> => {
    if (!newTagName.trim()) return
    await onCreateTag(newTagName.trim(), newTagColor)
    setNewTagName('')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-dark rounded-2xl p-6 w-full max-w-md border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">タグ管理</h2>
          <button
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            onClick={onClose}
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Create Tag */}
        <div className="flex items-center gap-2 mb-6">
          <input
            type="color"
            value={newTagColor}
            onChange={(e) => setNewTagColor(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer"
          />
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="新しいタグ名"
            className="flex-1 px-4 py-2 bg-surface rounded-lg text-white placeholder-gray-500 border border-white/10 focus:border-primary outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
          />
          <button
            onClick={handleCreateTag}
            disabled={!newTagName.trim()}
            className="px-4 py-2 bg-primary rounded-lg text-white font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
          >
            追加
          </button>
        </div>

        {/* Tag List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-3 bg-surface rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: tag.color || '#3b82f6' }}
                />
                <span className="text-white">{tag.name}</span>
                <span className="text-sm text-gray-400">({tag.mediaCount}件)</span>
              </div>
              <button
                onClick={() => onDeleteTag(tag.id)}
                className="p-1 rounded hover:bg-white/10 text-red-400 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {tags.length === 0 && (
            <p className="text-center text-gray-400 py-4">タグがありません</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Media Detail Modal
function MediaDetailModal({
  media,
  onClose,
  onUpdate,
  onDelete,
  onToggleFavorite,
  tags
}: {
  media: MediaItem
  onClose: () => void
  onUpdate: (updates: { fileName?: string; tags?: string[]; description?: string | null }) => Promise<void>
  onDelete: () => Promise<void>
  onToggleFavorite: () => Promise<void>
  tags: MediaTag[]
}): JSX.Element {
  const [isEditing, setIsEditing] = useState(false)
  const [fileName, setFileName] = useState(media.fileName)
  const [description, setDescription] = useState(media.description || '')
  const [selectedTags, setSelectedTags] = useState<string[]>(media.tags || [])
  const isImage = media.mediaType === 'image'

  const handleSave = async (): Promise<void> => {
    await onUpdate({
      fileName,
      tags: selectedTags,
      description: description || null
    })
    setIsEditing(false)
  }

  const toggleTag = (tagName: string): void => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-surface-dark rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/10 flex">
        {/* Preview */}
        <div className="flex-1 bg-black flex items-center justify-center p-4">
          {isImage ? (
            <img
              src={`file://${media.filePath}`}
              alt={media.fileName}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <video
              src={`file://${media.filePath}`}
              controls
              className="max-w-full max-h-full"
            />
          )}
        </div>

        {/* Details Panel */}
        <div className="w-80 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">詳細</h2>
            <button
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={onClose}
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          {/* File Name */}
          <div className="mb-4">
            <label className="text-sm text-gray-400 mb-1 block">ファイル名</label>
            {isEditing ? (
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full px-3 py-2 bg-surface rounded-lg text-white border border-white/10 focus:border-primary outline-none"
              />
            ) : (
              <p className="text-white">{media.fileName}</p>
            )}
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="text-sm text-gray-400 mb-1 block">説明</label>
            {isEditing ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-surface rounded-lg text-white border border-white/10 focus:border-primary outline-none resize-none"
                placeholder="説明を入力..."
              />
            ) : (
              <p className="text-white">{media.description || '-'}</p>
            )}
          </div>

          {/* Tags */}
          <div className="mb-4">
            <label className="text-sm text-gray-400 mb-2 block">タグ</label>
            {isEditing ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.name)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedTags.includes(tag.name)
                        ? 'bg-primary text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {media.tags && media.tags.length > 0 ? (
                  media.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-sm bg-white/10 text-gray-300"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>
            )}
          </div>

          {/* Meta Info */}
          <div className="space-y-2 mb-6 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">種類</span>
              <span className="text-white">{isImage ? '画像' : '動画'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">サイズ</span>
              <span className="text-white">{formatFileSize(media.fileSize)}</span>
            </div>
            {media.width && media.height && (
              <div className="flex justify-between">
                <span className="text-gray-400">解像度</span>
                <span className="text-white">{media.width} x {media.height}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">使用回数</span>
              <span className="text-white">{media.useCount}回</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">追加日</span>
              <span className="text-white">{formatDate(media.createdAt)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="w-full py-2 bg-primary rounded-lg text-white font-medium hover:bg-primary/80 transition-colors"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setFileName(media.fileName)
                    setDescription(media.description || '')
                    setSelectedTags(media.tags || [])
                    setIsEditing(false)
                  }}
                  className="w-full py-2 bg-surface rounded-lg text-white font-medium hover:bg-white/10 transition-colors"
                >
                  キャンセル
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full py-2 bg-surface rounded-lg text-white font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} />
                  編集
                </button>
                <button
                  onClick={onToggleFavorite}
                  className="w-full py-2 bg-surface rounded-lg text-white font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <Heart
                    size={16}
                    className={media.isFavorite ? 'text-red-500 fill-red-500' : ''}
                  />
                  {media.isFavorite ? 'お気に入り解除' : 'お気に入り'}
                </button>
                <button
                  onClick={onDelete}
                  className="w-full py-2 bg-red-500/20 rounded-lg text-red-400 font-medium hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  削除
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Media(): JSX.Element {
  const {
    mediaItems,
    selectedMedia,
    selectedMediaIds,
    tags,
    stats,
    isLoading,
    isUploading,
    filters,
    fetchMedia,
    fetchTags,
    fetchStats,
    uploadMedia,
    updateMedia,
    deleteMedia,
    deleteMediaBatch,
    toggleFavorite,
    selectMedia,
    toggleMediaSelection,
    selectAllMedia,
    clearSelection,
    setFilters,
    openStorageFolder,
    createTag,
    deleteTag
  } = useMediaStore()

  const { success: showSuccess, error: showError } = useToastStore()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [showTagManager, setShowTagManager] = useState(false)
  const [typeFilter, setTypeFilter] = useState<MediaType | 'all'>('all')
  const [favoriteFilter, setFavoriteFilter] = useState<boolean | undefined>(undefined)
  const [sortBy, setSortBy] = useState<SortBy>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Initial fetch
  useEffect(() => {
    fetchMedia()
    fetchTags()
    fetchStats()
  }, [])

  // Apply filters
  useEffect(() => {
    const options: Record<string, unknown> = {
      sortBy,
      sortOrder
    }
    if (searchQuery) options.search = searchQuery
    if (typeFilter !== 'all') options.mediaType = typeFilter
    if (favoriteFilter !== undefined) options.isFavorite = favoriteFilter

    fetchMedia(options)
  }, [searchQuery, typeFilter, favoriteFilter, sortBy, sortOrder])

  const handleUpload = async (): Promise<void> => {
    const result = await uploadMedia()
    if (result.success) {
      showSuccess(`${result.uploaded.length}件のメディアをアップロードしました`)
    } else if (result.errors && result.errors.length > 0) {
      showError(result.errors[0])
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (confirm('このメディアを削除しますか？')) {
      const success = await deleteMedia(id)
      if (success) {
        showSuccess('メディアを削除しました')
      } else {
        showError('削除に失敗しました')
      }
    }
  }

  const handleBatchDelete = async (): Promise<void> => {
    if (selectedMediaIds.length === 0) return
    if (confirm(`${selectedMediaIds.length}件のメディアを削除しますか？`)) {
      const result = await deleteMediaBatch(selectedMediaIds)
      showSuccess(`${result.success}件削除しました`)
      clearSelection()
    }
  }

  const handleCreateTag = async (name: string, color?: string): Promise<void> => {
    await createTag(name, color)
    showSuccess('タグを作成しました')
  }

  const handleDeleteTag = async (id: string): Promise<void> => {
    if (confirm('このタグを削除しますか？')) {
      await deleteTag(id)
      showSuccess('タグを削除しました')
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">メディアライブラリ</h1>
            <p className="text-gray-400 mt-1">
              {stats ? `${stats.totalCount}件のメディア（${formatFileSize(stats.totalSize)}）` : '読み込み中...'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => openStorageFolder()}
              className="px-4 py-2 bg-surface-dark rounded-xl text-white font-medium hover:bg-white/10 transition-colors flex items-center gap-2 border border-white/10"
            >
              <FolderOpen size={18} />
              フォルダを開く
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="px-6 py-2 bg-gradient-to-r from-primary to-secondary rounded-xl text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
            >
              <Upload size={18} />
              {isUploading ? 'アップロード中...' : 'アップロード'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-surface-dark rounded-xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <HardDrive size={20} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalCount}</p>
                  <p className="text-sm text-gray-400">合計</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-surface-dark rounded-xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <ImageIcon size={20} className="text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.imageCount}</p>
                  <p className="text-sm text-gray-400">画像</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-surface-dark rounded-xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Video size={20} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.videoCount}</p>
                  <p className="text-sm text-gray-400">動画</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-surface-dark rounded-xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Heart size={20} className="text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.favoriteCount}</p>
                  <p className="text-sm text-gray-400">お気に入り</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ファイル名で検索..."
              className="w-full pl-10 pr-4 py-2 bg-surface-dark rounded-xl text-white placeholder-gray-500 border border-white/10 focus:border-primary outline-none"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MediaType | 'all')}
            className="px-4 py-2 bg-surface-dark rounded-xl text-white border border-white/10 focus:border-primary outline-none"
          >
            <option value="all">すべて</option>
            <option value="image">画像のみ</option>
            <option value="video">動画のみ</option>
          </select>

          {/* Favorite Filter */}
          <button
            onClick={() => setFavoriteFilter(favoriteFilter === undefined ? true : undefined)}
            className={`px-4 py-2 rounded-xl border transition-colors flex items-center gap-2 ${
              favoriteFilter
                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                : 'bg-surface-dark border-white/10 text-white hover:border-white/20'
            }`}
          >
            <Heart size={16} className={favoriteFilter ? 'fill-red-400' : ''} />
            お気に入り
          </button>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-4 py-2 bg-surface-dark rounded-xl text-white border border-white/10 focus:border-primary outline-none"
          >
            <option value="created_at">追加日</option>
            <option value="file_name">ファイル名</option>
            <option value="file_size">サイズ</option>
            <option value="use_count">使用回数</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 bg-surface-dark rounded-xl text-white border border-white/10 hover:border-white/20 transition-colors"
          >
            {sortOrder === 'asc' ? '昇順' : '降順'}
          </button>

          {/* Tag Manager */}
          <button
            onClick={() => setShowTagManager(true)}
            className="px-4 py-2 bg-surface-dark rounded-xl text-white border border-white/10 hover:border-white/20 transition-colors flex items-center gap-2"
          >
            <Tag size={16} />
            タグ管理
          </button>

          {/* View Mode */}
          <div className="flex items-center gap-1 p-1 bg-surface-dark rounded-xl border border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Selection Actions */}
        {selectedMediaIds.length > 0 && (
          <div className="flex items-center gap-4 mt-4 p-3 bg-primary/10 rounded-xl border border-primary/30">
            <span className="text-white font-medium">{selectedMediaIds.length}件選択中</span>
            <button
              onClick={selectAllMedia}
              className="text-primary hover:underline text-sm"
            >
              すべて選択
            </button>
            <button
              onClick={clearSelection}
              className="text-gray-400 hover:text-white text-sm"
            >
              選択解除
            </button>
            <div className="flex-1" />
            <button
              onClick={handleBatchDelete}
              className="px-4 py-1.5 bg-red-500/20 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors flex items-center gap-2"
            >
              <Trash2 size={16} />
              選択を削除
            </button>
          </div>
        )}
      </div>

      {/* Media Grid/List */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : mediaItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <ImageIcon size={48} className="mb-4" />
            <p className="text-lg font-medium">メディアがありません</p>
            <p className="text-sm mt-1">アップロードボタンからメディアを追加してください</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {mediaItems.map((media) => (
              <MediaCard
                key={media.id}
                media={media}
                isSelected={selectedMediaIds.includes(media.id)}
                onSelect={() => toggleMediaSelection(media.id)}
                onToggleFavorite={() => toggleFavorite(media.id)}
                onDelete={() => handleDelete(media.id)}
                onClick={() => selectMedia(media)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {mediaItems.map((media) => (
              <MediaListItem
                key={media.id}
                media={media}
                isSelected={selectedMediaIds.includes(media.id)}
                onSelect={() => toggleMediaSelection(media.id)}
                onToggleFavorite={() => toggleFavorite(media.id)}
                onDelete={() => handleDelete(media.id)}
                onClick={() => selectMedia(media)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Tag Manager Modal */}
      <TagManagerModal
        isOpen={showTagManager}
        onClose={() => setShowTagManager(false)}
        tags={tags}
        onCreateTag={handleCreateTag}
        onDeleteTag={handleDeleteTag}
      />

      {/* Media Detail Modal */}
      {selectedMedia && (
        <MediaDetailModal
          media={selectedMedia}
          onClose={() => selectMedia(null)}
          onUpdate={async (updates) => {
            await updateMedia(selectedMedia.id, updates)
            showSuccess('メディアを更新しました')
          }}
          onDelete={async () => {
            await handleDelete(selectedMedia.id)
            selectMedia(null)
          }}
          onToggleFavorite={async () => {
            await toggleFavorite(selectedMedia.id)
          }}
          tags={tags}
        />
      )}
    </div>
  )
}
