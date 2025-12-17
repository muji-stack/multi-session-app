import { create } from 'zustand'
import type { AuthUser } from '../../shared/authTypes'

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  isAuthAvailable: boolean
  error: string | null

  // Actions
  initialize: () => Promise<void>
  setupListeners: () => () => void
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<{ success: boolean; error?: string }>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isAuthAvailable: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null })

    try {
      // Check if auth service is available
      const isAvailable = await window.api.auth.isAvailable()
      set({ isAuthAvailable: isAvailable })

      if (!isAvailable) {
        // Auth not configured, allow access without login
        set({ isLoading: false, isAuthenticated: true })
        return
      }

      // Try to restore session
      const result = await window.api.auth.tryRestoreSession()
      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false
        })
      } else {
        // Check current user
        const currentUser = await window.api.auth.getCurrentUser()
        if (currentUser) {
          set({
            user: currentUser,
            isAuthenticated: true,
            isLoading: false
          })
        } else {
          set({ isLoading: false })
        }
      }
    } catch (error) {
      console.error('Auth initialization failed:', error)
      set({
        error: (error as Error).message,
        isLoading: false,
        isAuthAvailable: false,
        isAuthenticated: true // Allow access if auth fails
      })
    }
  },

  setupListeners: () => {
    const unsubscribe = window.api.auth.onAuthStateChanged((user) => {
      if (user) {
        set({
          user,
          isAuthenticated: true,
          error: null
        })
      } else {
        set({
          user: null,
          isAuthenticated: get().isAuthAvailable ? false : true, // Allow access if auth not available
          error: null
        })
      }
    })

    return unsubscribe
  },

  signUp: async (email: string, password: string) => {
    set({ isLoading: true, error: null })

    try {
      const result = await window.api.auth.signUp(email, password)

      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false
        })
        return { success: true }
      } else {
        set({
          error: result.error || '登録に失敗しました',
          isLoading: false
        })
        return { success: false, error: result.error }
      }
    } catch (error) {
      const errorMsg = (error as Error).message
      set({ error: errorMsg, isLoading: false })
      return { success: false, error: errorMsg }
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null })

    try {
      const result = await window.api.auth.signIn(email, password)

      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false
        })
        return { success: true }
      } else {
        set({
          error: result.error || 'ログインに失敗しました',
          isLoading: false
        })
        return { success: false, error: result.error }
      }
    } catch (error) {
      const errorMsg = (error as Error).message
      set({ error: errorMsg, isLoading: false })
      return { success: false, error: errorMsg }
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null })

    try {
      const result = await window.api.auth.signOut()

      if (result.success) {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false
        })
        return { success: true }
      } else {
        set({
          error: result.error || 'ログアウトに失敗しました',
          isLoading: false
        })
        return { success: false, error: result.error }
      }
    } catch (error) {
      const errorMsg = (error as Error).message
      set({ error: errorMsg, isLoading: false })
      return { success: false, error: errorMsg }
    }
  },

  resetPassword: async (email: string) => {
    set({ isLoading: true, error: null })

    try {
      const result = await window.api.auth.resetPassword(email)

      set({ isLoading: false })

      if (result.success) {
        return { success: true }
      } else {
        set({ error: result.error || 'パスワードリセットに失敗しました' })
        return { success: false, error: result.error }
      }
    } catch (error) {
      const errorMsg = (error as Error).message
      set({ error: errorMsg, isLoading: false })
      return { success: false, error: errorMsg }
    }
  },

  clearError: () => set({ error: null })
}))
