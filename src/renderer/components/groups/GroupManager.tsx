import { useState, useEffect } from 'react'
import { X, Plus, Pencil, Trash2, Folder, Save } from 'lucide-react'
import { Button, Input } from '../ui'
import { useGroupStore } from '../../stores/groupStore'
import type { Group } from '../../../shared/types'

interface GroupManagerProps {
  isOpen: boolean
  onClose: () => void
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6b7280', // Gray
  '#78716c'  // Stone
]

function GroupManager({ isOpen, onClose }: GroupManagerProps): JSX.Element | null {
  const { groups, fetchGroups, createGroup, updateGroup, deleteGroup } = useGroupStore()
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchGroups()
    }
  }, [isOpen, fetchGroups])

  const resetForm = (): void => {
    setName('')
    setColor(PRESET_COLORS[0])
    setEditingGroup(null)
    setIsCreating(false)
  }

  const handleStartCreate = (): void => {
    resetForm()
    setIsCreating(true)
  }

  const handleStartEdit = (group: Group): void => {
    setEditingGroup(group)
    setName(group.name)
    setColor(group.color)
    setIsCreating(false)
  }

  const handleCancel = (): void => {
    resetForm()
  }

  const handleSave = async (): Promise<void> => {
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      if (editingGroup) {
        await updateGroup(editingGroup.id, { name: name.trim(), color })
      } else {
        await createGroup(name.trim(), color)
      }
      resetForm()
    } catch (error) {
      console.error('Failed to save group:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (group: Group): Promise<void> => {
    if (!confirm(`「${group.name}」を削除しますか？\nこのグループに属するアカウントはグループなしになります。`)) {
      return
    }

    try {
      await deleteGroup(group.id)
      if (editingGroup?.id === group.id) {
        resetForm()
      }
    } catch (error) {
      console.error('Failed to delete group:', error)
    }
  }

  const handleClose = (): void => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  const isEditing = isCreating || editingGroup !== null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-surface-dark border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Folder size={20} />
            グループ管理
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-auto max-h-[calc(80vh-120px)]">
          {/* Form */}
          {isEditing && (
            <div className="bg-white/5 rounded-xl p-4 mb-4 space-y-4">
              <h3 className="text-sm font-medium text-gray-300">
                {editingGroup ? 'グループを編集' : '新しいグループ'}
              </h3>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">グループ名</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="グループ名を入力"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">カラー</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        color === c
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-dark scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  キャンセル
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Save size={16} />}
                  onClick={handleSave}
                  disabled={!name.trim() || isSubmitting}
                >
                  {isSubmitting ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          )}

          {/* Group List */}
          <div className="space-y-2">
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Plus size={16} />}
                onClick={handleStartCreate}
                className="w-full mb-3"
              >
                新しいグループを作成
              </Button>
            )}

            {groups.length === 0 ? (
              <div className="text-center py-8">
                <Folder size={48} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400 text-sm">グループがありません</p>
                <p className="text-gray-500 text-xs mt-1">
                  グループを作成してアカウントを整理しましょう
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={group.id}
                  className={`flex items-center justify-between p-3 rounded-lg bg-white/5 border transition-colors ${
                    editingGroup?.id === group.id
                      ? 'border-primary'
                      : 'border-transparent hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="text-white">{group.name}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(group)}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      title="編集"
                    >
                      <Pencil size={16} className="text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(group)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                      title="削除"
                    >
                      <Trash2 size={16} className="text-gray-400 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GroupManager
