import { useState, useEffect } from 'react'
import { X, Plus, Edit2, Trash2, FileText, Save, Loader2 } from 'lucide-react'
import { Button, Input } from '../ui'
import { usePostStore } from '../../stores/postStore'

interface TemplateManagerProps {
  isOpen: boolean
  onClose: () => void
  onSelect?: (content: string) => void
}

function TemplateManager({ isOpen, onClose, onSelect }: TemplateManagerProps): JSX.Element | null {
  const { templates, isLoadingTemplates, fetchTemplates, createTemplate, updateTemplate, deleteTemplate } = usePostStore()

  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchTemplates()
      setMode('list')
      setEditingId(null)
      setName('')
      setContent('')
    }
  }, [isOpen, fetchTemplates])

  if (!isOpen) return null

  const handleCreate = async (): Promise<void> => {
    if (!name.trim() || !content.trim()) return
    setIsSaving(true)
    try {
      await createTemplate(name.trim(), content.trim())
      setMode('list')
      setName('')
      setContent('')
    } catch (error) {
      console.error('Failed to create template:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async (): Promise<void> => {
    if (!editingId || !name.trim() || !content.trim()) return
    setIsSaving(true)
    try {
      await updateTemplate(editingId, { name: name.trim(), content: content.trim() })
      setMode('list')
      setEditingId(null)
      setName('')
      setContent('')
    } catch (error) {
      console.error('Failed to update template:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('このテンプレートを削除しますか？')) return
    try {
      await deleteTemplate(id)
    } catch (error) {
      console.error('Failed to delete template:', error)
    }
  }

  const handleEdit = (template: { id: string; name: string; content: string }): void => {
    setEditingId(template.id)
    setName(template.name)
    setContent(template.content)
    setMode('edit')
  }

  const handleSelect = (templateContent: string): void => {
    if (onSelect) {
      onSelect(templateContent)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-surface-dark rounded-2xl w-full max-w-2xl mx-4 border border-white/10 shadow-2xl animate-scale-in max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">
            {mode === 'list' ? 'テンプレート管理' : mode === 'create' ? 'テンプレート作成' : 'テンプレート編集'}
          </h2>
          <div className="flex items-center gap-2">
            {mode === 'list' && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={16} />}
                onClick={() => setMode('create')}
              >
                新規作成
              </Button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {mode === 'list' ? (
            isLoadingTemplates ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 size={32} className="animate-spin text-primary" />
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <FileText size={48} className="text-gray-500 mb-4" />
                <p className="text-gray-400">テンプレートがありません</p>
                <p className="text-gray-500 text-sm mt-1">
                  「新規作成」ボタンからテンプレートを作成してください
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-primary/50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium mb-1">{template.name}</h3>
                        <p className="text-gray-400 text-sm line-clamp-2">{template.content}</p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onSelect && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleSelect(template.content)}
                          >
                            使用
                          </Button>
                        )}
                        <button
                          onClick={() => handleEdit(template)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-error hover:bg-error/10 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-4">
              <Input
                label="テンプレート名"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 朝の挨拶"
              />
              <div>
                <label className="block text-sm text-gray-300 mb-2">内容</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="投稿内容を入力..."
                  rows={6}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 resize-none"
                />
                <p className="text-gray-500 text-xs mt-1">
                  {content.length}/280文字
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {mode !== 'list' && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
            <Button
              variant="ghost"
              onClick={() => {
                setMode('list')
                setEditingId(null)
                setName('')
                setContent('')
              }}
            >
              キャンセル
            </Button>
            <Button
              variant="primary"
              leftIcon={isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              onClick={mode === 'create' ? handleCreate : handleUpdate}
              disabled={isSaving || !name.trim() || !content.trim()}
            >
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default TemplateManager
