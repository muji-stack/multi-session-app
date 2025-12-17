import { useEffect, useState, useMemo } from 'react'
import { Plus, Users, Folder, Filter, CheckSquare, Square, Search, RefreshCw, Trash2, X } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable'
import { Button } from '../components/ui'
import SortableAccountCard from '../components/accounts/SortableAccountCard'
import AddAccountModal from '../components/accounts/AddAccountModal'
import DeleteAccountModal from '../components/accounts/DeleteAccountModal'
import EditAccountModal from '../components/accounts/EditAccountModal'
import { GroupManager } from '../components/groups'
import { UpgradeModal } from '../components/license'
import { useAccountStore } from '../stores/accountStore'
import { useGroupStore } from '../stores/groupStore'
import { useToastStore } from '../stores/toastStore'
import { useLicenseStore } from '../stores/licenseStore'
import { useAuthStore } from '../stores/authStore'
import type { Account } from '../../shared/types'
import type { SubscriptionPlan } from '../../shared/billingTypes'

function Accounts(): JSX.Element {
  const {
    accounts,
    selectedAccountId,
    isLoading,
    fetchAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    selectAccount,
    reorderAccounts,
    saveAccountOrder
  } = useAccountStore()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [editTarget, setEditTarget] = useState<Account | null>(null)
  const [filterGroupId, setFilterGroupId] = useState<string | null>(null)

  // Multi-select state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkChecking, setIsBulkChecking] = useState(false)
  const [isBulkClearing, setIsBulkClearing] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const { groups, fetchGroups } = useGroupStore()
  const toast = useToastStore()
  const { checkAccountLimit, license } = useLicenseStore()
  const { user } = useAuthStore()

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<string>('')
  const [requiredPlan, setRequiredPlan] = useState<SubscriptionPlan>('starter')

  const filteredAccounts = useMemo(() => {
    if (filterGroupId === null) return accounts
    if (filterGroupId === 'ungrouped') return accounts.filter((a) => !a.groupId)
    return accounts.filter((a) => a.groupId === filterGroupId)
  }, [accounts, filterGroupId])

  const accountIds = useMemo(() => filteredAccounts.map((a) => a.id), [filteredAccounts])

  useEffect(() => {
    fetchAccounts()
    fetchGroups()
  }, [fetchAccounts, fetchGroups])

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      reorderAccounts(active.id as string, over.id as string)
      saveAccountOrder()
    }
  }

  const handleAddAccount = async (username: string, memo?: string): Promise<void> => {
    await addAccount({ username, memo })
    toast.success(`@${username} を追加しました`)
  }

  const handleOpenAddModal = async (): Promise<void> => {
    const userId = user?.uid || 'local-user'
    const result = await checkAccountLimit(userId)

    if (!result.allowed) {
      setUpgradeReason(result.reason || 'アカウント上限に達しています')
      setRequiredPlan((result.requiredPlan as SubscriptionPlan) || 'starter')
      setShowUpgradeModal(true)
      return
    }

    setIsAddModalOpen(true)
  }

  const handleDeleteAccount = async (id: string): Promise<void> => {
    await deleteAccount(id)
    setDeleteTarget(null)
    setEditTarget(null)
    toast.success('アカウントを削除しました')
  }

  const handleSaveAccount = async (
    id: string,
    data: { username?: string; memo?: string; groupId?: string | null }
  ): Promise<void> => {
    await updateAccount(id, data)
    toast.success('アカウント情報を更新しました')
  }

  const handleOpenBrowser = async (accountId: string): Promise<void> => {
    try {
      await window.api.browser.open(accountId)
    } catch (error) {
      console.error('Failed to open browser:', error)
    }
  }

  const handleClearSession = async (accountId: string): Promise<void> => {
    try {
      await window.api.browser.clearSession(accountId)
      toast.success('セッションをクリアしました')
    } catch (error) {
      console.error('Failed to clear session:', error)
      toast.error('セッションのクリアに失敗しました')
    }
  }

  const handleEditAccount = (account: Account): void => {
    setEditTarget(account)
  }

  const handleDeleteFromEdit = (id: string): void => {
    const account = accounts.find((a) => a.id === id)
    if (account) {
      setEditTarget(null)
      setDeleteTarget(account)
    }
  }

  // Multi-select handlers
  const toggleMultiSelectMode = (): void => {
    setIsMultiSelectMode(!isMultiSelectMode)
    setSelectedIds(new Set())
  }

  const toggleAccountSelection = (id: string): void => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const selectAllFiltered = (): void => {
    setSelectedIds(new Set(filteredAccounts.map((a) => a.id)))
  }

  const clearSelection = (): void => {
    setSelectedIds(new Set())
  }

  const handleBulkCheck = async (): Promise<void> => {
    if (selectedIds.size === 0) return
    setIsBulkChecking(true)
    try {
      await window.api.check.multiple(Array.from(selectedIds))
      await fetchAccounts()
      toast.success(`${selectedIds.size}件のアカウントをチェックしました`)
    } catch (error) {
      console.error('Failed to bulk check:', error)
      toast.error('一括チェックに失敗しました')
    } finally {
      setIsBulkChecking(false)
    }
  }

  const handleBulkClearSession = async (): Promise<void> => {
    if (selectedIds.size === 0) return
    setIsBulkClearing(true)
    try {
      for (const id of selectedIds) {
        await window.api.browser.clearSession(id)
      }
      toast.success(`${selectedIds.size}件のセッションをクリアしました`)
    } catch (error) {
      console.error('Failed to bulk clear sessions:', error)
      toast.error('一括クリアに失敗しました')
    } finally {
      setIsBulkClearing(false)
    }
  }

  const handleBulkDelete = async (): Promise<void> => {
    const count = selectedIds.size
    for (const id of selectedIds) {
      await deleteAccount(id)
    }
    setSelectedIds(new Set())
    setShowBulkDeleteConfirm(false)
    toast.success(`${count}件のアカウントを削除しました`)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white">アカウント</h1>
          <p className="text-gray-400 text-sm mt-1">
            {accounts.length > 0
              ? filterGroupId !== null
                ? `${filteredAccounts.length}件を表示中 (全${accounts.length}件)`
                : `${accounts.length}件のアカウントを管理中`
              : 'アカウントを追加して管理を始めましょう'}
          </p>
        </div>
        <div className="flex gap-3">
          {accounts.length > 0 && (
            <Button
              variant={isMultiSelectMode ? 'primary' : 'ghost'}
              leftIcon={isMultiSelectMode ? <CheckSquare size={18} /> : <Square size={18} />}
              onClick={toggleMultiSelectMode}
            >
              {isMultiSelectMode ? '選択モード' : '複数選択'}
            </Button>
          )}
          <Button
            variant="ghost"
            leftIcon={<Folder size={18} />}
            onClick={() => setIsGroupManagerOpen(true)}
          >
            グループ管理
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus size={18} />}
            onClick={handleOpenAddModal}
          >
            アカウントを追加
          </Button>
        </div>
      </div>

      {/* Group Filter */}
      {groups.length > 0 && accounts.length > 0 && (
        <div className="px-6 py-3 border-b border-white/10 flex items-center gap-2 overflow-x-auto">
          <Filter size={16} className="text-gray-400 flex-shrink-0" />
          <button
            onClick={() => setFilterGroupId(null)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              filterGroupId === null
                ? 'bg-primary text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            すべて
          </button>
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => setFilterGroupId(group.id)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                filterGroupId === group.id
                  ? 'bg-primary text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              {group.name}
            </button>
          ))}
          <button
            onClick={() => setFilterGroupId('ungrouped')}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              filterGroupId === 'ungrouped'
                ? 'bg-primary text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            グループなし
          </button>
        </div>
      )}

      {/* Multi-select Action Bar */}
      {isMultiSelectMode && (
        <div className="px-6 py-3 border-b border-white/10 bg-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-white">
              {selectedIds.size}件選択中
            </span>
            <button
              onClick={selectAllFiltered}
              className="text-sm text-primary hover:underline"
            >
              すべて選択
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={clearSelection}
                className="text-sm text-gray-400 hover:text-white"
              >
                選択解除
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={isBulkChecking ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              onClick={handleBulkCheck}
              disabled={selectedIds.size === 0 || isBulkChecking}
            >
              ステータスチェック
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={isBulkClearing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              onClick={handleBulkClearSession}
              disabled={selectedIds.size === 0 || isBulkClearing}
            >
              セッションクリア
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              onClick={() => setShowBulkDeleteConfirm(true)}
              disabled={selectedIds.size === 0}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              削除
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<X size={14} />}
              onClick={toggleMultiSelectMode}
            >
              終了
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading && accounts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">読み込み中...</div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Users size={32} className="text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">アカウントがありません</h3>
            <p className="text-gray-400 text-sm max-w-sm mb-6">
              「アカウントを追加」ボタンからXアカウントを追加して、セッション管理を始めましょう。
            </p>
            <Button
              variant="primary"
              leftIcon={<Plus size={18} />}
              onClick={handleOpenAddModal}
            >
              アカウントを追加
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={accountIds} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAccounts.map((account) => (
                  <SortableAccountCard
                    key={account.id}
                    account={account}
                    isSelected={selectedAccountId === account.id}
                    onSelect={() => selectAccount(account.id)}
                    onEdit={() => handleEditAccount(account)}
                    onDelete={() => setDeleteTarget(account)}
                    onOpenBrowser={() => handleOpenBrowser(account.id)}
                    isMultiSelectMode={isMultiSelectMode}
                    isChecked={selectedIds.has(account.id)}
                    onToggleCheck={() => toggleAccountSelection(account.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Modals */}
      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddAccount}
      />

      <DeleteAccountModal
        isOpen={deleteTarget !== null}
        account={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDelete={handleDeleteAccount}
      />

      <EditAccountModal
        isOpen={editTarget !== null}
        account={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveAccount}
        onDelete={handleDeleteFromEdit}
        onOpenBrowser={handleOpenBrowser}
        onClearSession={handleClearSession}
      />

      <GroupManager
        isOpen={isGroupManagerOpen}
        onClose={() => setIsGroupManagerOpen(false)}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="アカウント追加"
        requiredPlan={requiredPlan}
        currentPlan={license?.plan || 'free'}
        reason={upgradeReason}
      />

      {/* Bulk Delete Confirmation */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowBulkDeleteConfirm(false)}
          />
          <div className="relative bg-surface-dark rounded-2xl w-full max-w-md mx-4 p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-2">
              {selectedIds.size}件のアカウントを削除
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              選択した{selectedIds.size}件のアカウントを削除してもよろしいですか？
              この操作は取り消せません。セッションデータも削除されます。
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowBulkDeleteConfirm(false)}>
                キャンセル
              </Button>
              <Button
                variant="danger"
                leftIcon={<Trash2 size={16} />}
                onClick={handleBulkDelete}
              >
                削除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Accounts
