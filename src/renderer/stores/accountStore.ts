import { create } from 'zustand'
import type { Account } from '../../shared/types'
import type { CreateAccountInput, UpdateAccountInput, AccountStats } from '../../preload/index.d'

interface AccountState {
  accounts: Account[]
  stats: AccountStats
  selectedAccountId: string | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchAccounts: () => Promise<void>
  fetchStats: () => Promise<void>
  addAccount: (input: CreateAccountInput) => Promise<Account>
  updateAccount: (id: string, input: UpdateAccountInput) => Promise<void>
  deleteAccount: (id: string) => Promise<void>
  selectAccount: (id: string | null) => void
  reorderAccounts: (activeId: string, overId: string) => void
  saveAccountOrder: () => Promise<void>
  clearError: () => void
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  stats: { total: 0, normal: 0, locked: 0, suspended: 0 },
  selectedAccountId: null,
  isLoading: false,
  error: null,

  fetchAccounts: async () => {
    set({ isLoading: true, error: null })
    try {
      const accounts = await window.api.account.getAll()
      set({ accounts, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchStats: async () => {
    try {
      const stats = await window.api.account.getStats()
      set({ stats })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  },

  addAccount: async (input: CreateAccountInput) => {
    set({ isLoading: true, error: null })
    try {
      const account = await window.api.account.create(input)
      set((state) => ({
        accounts: [...state.accounts, account],
        isLoading: false
      }))
      // Refresh stats after adding
      get().fetchStats()
      return account
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
      throw error
    }
  },

  updateAccount: async (id: string, input: UpdateAccountInput) => {
    set({ isLoading: true, error: null })
    try {
      const updated = await window.api.account.update(id, input)
      if (updated) {
        set((state) => ({
          accounts: state.accounts.map((a) => (a.id === id ? updated : a)),
          isLoading: false
        }))
        // Refresh stats if status changed
        if (input.status) {
          get().fetchStats()
        }
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
      throw error
    }
  },

  deleteAccount: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await window.api.account.delete(id)
      set((state) => ({
        accounts: state.accounts.filter((a) => a.id !== id),
        selectedAccountId: state.selectedAccountId === id ? null : state.selectedAccountId,
        isLoading: false
      }))
      // Refresh stats after deletion
      get().fetchStats()
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
      throw error
    }
  },

  selectAccount: (id: string | null) => {
    set({ selectedAccountId: id })
  },

  reorderAccounts: (activeId: string, overId: string) => {
    set((state) => {
      const oldIndex = state.accounts.findIndex((a) => a.id === activeId)
      const newIndex = state.accounts.findIndex((a) => a.id === overId)

      if (oldIndex === -1 || newIndex === -1) return state

      const newAccounts = [...state.accounts]
      const [removed] = newAccounts.splice(oldIndex, 1)
      newAccounts.splice(newIndex, 0, removed)

      return { accounts: newAccounts }
    })
  },

  saveAccountOrder: async () => {
    const { accounts } = get()
    const orders = accounts.map((account, index) => ({
      id: account.id,
      sortOrder: index
    }))

    try {
      await window.api.account.updateSortOrders(orders)
    } catch (error) {
      console.error('Failed to save account order:', error)
    }
  },

  clearError: () => {
    set({ error: null })
  }
}))
