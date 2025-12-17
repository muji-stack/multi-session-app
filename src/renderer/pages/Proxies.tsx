import { useEffect, useState } from 'react'
import {
  Globe,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  HelpCircle,
  Shield,
  Loader2,
  Server
} from 'lucide-react'
import { Button, Input } from '../components/ui'
import Modal from '../components/ui/Modal'
import { useProxyStore } from '../stores/proxyStore'
import { useToastStore } from '../stores/toastStore'
import type { Proxy, ProxyProtocol, ProxyStatus } from '../../shared/types'

function Proxies(): JSX.Element {
  const {
    proxies,
    isLoading,
    isChecking,
    fetchProxies,
    createProxy,
    updateProxy,
    deleteProxy,
    checkProxy,
    checkAllProxies
  } = useProxyStore()

  const toast = useToastStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProxy, setEditingProxy] = useState<Proxy | null>(null)
  const [checkingProxyId, setCheckingProxyId] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formHost, setFormHost] = useState('')
  const [formPort, setFormPort] = useState('')
  const [formUsername, setFormUsername] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formProtocol, setFormProtocol] = useState<ProxyProtocol>('http')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    fetchProxies()
  }, [fetchProxies])

  const resetForm = (): void => {
    setFormName('')
    setFormHost('')
    setFormPort('')
    setFormUsername('')
    setFormPassword('')
    setFormProtocol('http')
    setFormError('')
  }

  const openAddModal = (): void => {
    resetForm()
    setShowAddModal(true)
  }

  const openEditModal = (proxy: Proxy): void => {
    setFormName(proxy.name)
    setFormHost(proxy.host)
    setFormPort(proxy.port.toString())
    setFormUsername(proxy.username || '')
    setFormPassword(proxy.password || '')
    setFormProtocol(proxy.protocol)
    setFormError('')
    setEditingProxy(proxy)
  }

  const closeModal = (): void => {
    setShowAddModal(false)
    setEditingProxy(null)
    resetForm()
  }

  const handleSubmit = async (): Promise<void> => {
    if (!formName.trim()) {
      setFormError('名前を入力してください')
      return
    }
    if (!formHost.trim()) {
      setFormError('ホストを入力してください')
      return
    }
    const port = parseInt(formPort)
    if (isNaN(port) || port < 1 || port > 65535) {
      setFormError('有効なポート番号を入力してください (1-65535)')
      return
    }

    try {
      if (editingProxy) {
        await updateProxy(editingProxy.id, {
          name: formName.trim(),
          host: formHost.trim(),
          port,
          username: formUsername.trim() || null,
          password: formPassword || null,
          protocol: formProtocol
        })
        toast.success('プロキシを更新しました')
      } else {
        await createProxy({
          name: formName.trim(),
          host: formHost.trim(),
          port,
          username: formUsername.trim() || null,
          password: formPassword || null,
          protocol: formProtocol
        })
        toast.success('プロキシを追加しました')
      }
      closeModal()
    } catch (error) {
      setFormError('保存に失敗しました')
      toast.error('保存に失敗しました')
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (confirm('このプロキシを削除しますか？')) {
      await deleteProxy(id)
      toast.success('プロキシを削除しました')
    }
  }

  const handleCheckSingle = async (id: string): Promise<void> => {
    setCheckingProxyId(id)
    await checkProxy(id)
    setCheckingProxyId(null)
  }

  const getStatusIcon = (status: ProxyStatus): JSX.Element => {
    switch (status) {
      case 'active':
        return <CheckCircle size={16} className="text-green-400" />
      case 'inactive':
        return <XCircle size={16} className="text-red-400" />
      case 'error':
        return <AlertCircle size={16} className="text-yellow-400" />
      default:
        return <HelpCircle size={16} className="text-gray-400" />
    }
  }

  const getStatusLabel = (status: ProxyStatus): string => {
    switch (status) {
      case 'active':
        return 'アクティブ'
      case 'inactive':
        return '非アクティブ'
      case 'error':
        return 'エラー'
      default:
        return '未チェック'
    }
  }

  const getStatusColor = (status: ProxyStatus): string => {
    switch (status) {
      case 'active':
        return 'text-green-400'
      case 'inactive':
        return 'text-red-400'
      case 'error':
        return 'text-yellow-400'
      default:
        return 'text-gray-400'
    }
  }

  const formatLastChecked = (timestamp: number | null): string => {
    if (!timestamp) return '未チェック'
    const date = new Date(timestamp)
    return date.toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white">プロキシ管理</h1>
          <p className="text-gray-400 text-sm mt-1">
            プロキシサーバーの設定と管理（{proxies.length}件）
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            leftIcon={
              isChecking ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <RefreshCw size={18} />
              )
            }
            onClick={checkAllProxies}
            disabled={isChecking || proxies.length === 0}
          >
            全てチェック
          </Button>
          <Button variant="primary" leftIcon={<Plus size={18} />} onClick={openAddModal}>
            プロキシを追加
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : proxies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Globe size={32} className="text-gray-500" />
            </div>
            <h3 className="text-white font-medium mb-2">プロキシがありません</h3>
            <p className="text-gray-400 text-sm mb-4">
              プロキシを追加して、アカウントごとに異なるIPアドレスを使用できます
            </p>
            <Button variant="primary" leftIcon={<Plus size={18} />} onClick={openAddModal}>
              プロキシを追加
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {proxies.map((proxy) => (
              <div
                key={proxy.id}
                className="bg-surface-dark rounded-xl border border-white/10 p-4 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Server size={24} className="text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium">{proxy.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-400 uppercase">
                          {proxy.protocol}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        {proxy.host}:{proxy.port}
                        {proxy.username && (
                          <span className="ml-2 text-gray-500">
                            <Shield size={12} className="inline mr-1" />
                            認証あり
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Status */}
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(proxy.status)}
                        <span className={`text-sm ${getStatusColor(proxy.status)}`}>
                          {getStatusLabel(proxy.status)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatLastChecked(proxy.lastCheckedAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCheckSingle(proxy.id)}
                        disabled={checkingProxyId === proxy.id}
                      >
                        {checkingProxyId === proxy.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <RefreshCw size={16} />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(proxy)}>
                        <Edit3 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(proxy.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal || editingProxy !== null}
        onClose={closeModal}
        title={editingProxy ? 'プロキシを編集' : 'プロキシを追加'}
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-300 mb-2">名前</label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="例: US Proxy 1"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-gray-300 mb-2">ホスト</label>
              <Input
                value={formHost}
                onChange={(e) => setFormHost(e.target.value)}
                placeholder="例: proxy.example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">ポート</label>
              <Input
                type="number"
                value={formPort}
                onChange={(e) => setFormPort(e.target.value)}
                placeholder="8080"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">プロトコル</label>
            <div className="flex gap-2">
              {(['http', 'https', 'socks5'] as ProxyProtocol[]).map((protocol) => (
                <button
                  key={protocol}
                  onClick={() => setFormProtocol(protocol)}
                  className={`px-4 py-2 rounded-lg text-sm uppercase transition-colors ${
                    formProtocol === protocol
                      ? 'bg-primary text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {protocol}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">ユーザー名（オプション）</label>
              <Input
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder="username"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">パスワード（オプション）</label>
              <Input
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="password"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={closeModal}>
              キャンセル
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              {editingProxy ? '保存' : '追加'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Proxies
