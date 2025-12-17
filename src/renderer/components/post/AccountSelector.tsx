import { useState, useEffect } from 'react'
import { Check, AlertCircle, Loader2 } from 'lucide-react'
import type { Account } from '../../../shared/types'

interface AccountSelectorProps {
  accounts: Account[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  loginStatusMap?: Map<string, boolean>
  isCheckingStatus?: boolean
}

function AccountSelector({
  accounts,
  selectedIds,
  onSelectionChange,
  loginStatusMap,
  isCheckingStatus
}: AccountSelectorProps): JSX.Element {
  const handleToggle = (accountId: string): void => {
    if (selectedIds.includes(accountId)) {
      onSelectionChange(selectedIds.filter((id) => id !== accountId))
    } else {
      onSelectionChange([...selectedIds, accountId])
    }
  }

  const handleSelectAll = (): void => {
    if (selectedIds.length === accounts.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(accounts.map((a) => a.id))
    }
  }

  const handleSelectLoggedIn = (): void => {
    if (!loginStatusMap) return
    const loggedInIds = accounts.filter((a) => loginStatusMap.get(a.id)).map((a) => a.id)
    onSelectionChange(loggedInIds)
  }

  const isAllSelected = selectedIds.length === accounts.length && accounts.length > 0

  return (
    <div className="space-y-3">
      {/* Header with select actions */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">
          {selectedIds.length > 0
            ? `${selectedIds.length}件のアカウントを選択中`
            : 'アカウントを選択してください'}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {isAllSelected ? 'すべて解除' : 'すべて選択'}
          </button>
          {loginStatusMap && (
            <button
              type="button"
              onClick={handleSelectLoggedIn}
              className="text-xs text-green-400 hover:text-green-300 transition-colors"
            >
              ログイン済みを選択
            </button>
          )}
        </div>
      </div>

      {/* Account list */}
      <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
        {accounts.map((account) => {
          const isSelected = selectedIds.includes(account.id)
          const isLoggedIn = loginStatusMap?.get(account.id)
          const hasStatus = loginStatusMap !== undefined

          return (
            <button
              key={account.id}
              type="button"
              onClick={() => handleToggle(account.id)}
              className={`
                w-full flex items-center gap-3 p-3 rounded-lg transition-all
                ${isSelected ? 'bg-blue-500/20 border-blue-500/50' : 'bg-white/5 border-transparent hover:bg-white/10'}
                border
              `}
            >
              {/* Checkbox */}
              <div
                className={`
                  w-5 h-5 rounded flex items-center justify-center flex-shrink-0
                  ${isSelected ? 'bg-blue-500' : 'bg-white/10 border border-white/20'}
                `}
              >
                {isSelected && <Check size={14} className="text-white" />}
              </div>

              {/* Account info */}
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-white">@{account.username}</div>
                {account.memo && (
                  <div className="text-xs text-gray-500 truncate">{account.memo}</div>
                )}
              </div>

              {/* Login status */}
              {hasStatus && (
                <div className="flex-shrink-0">
                  {isCheckingStatus ? (
                    <Loader2 size={16} className="text-gray-400 animate-spin" />
                  ) : isLoggedIn ? (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <Check size={12} />
                      ログイン済み
                    </span>
                  ) : (
                    <span className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle size={12} />
                      未ログイン
                    </span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {accounts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          アカウントがありません
        </div>
      )}
    </div>
  )
}

export default AccountSelector
