import { create } from 'zustand'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
  // Convenience methods
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

let toastId = 0

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${++toastId}`
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 4000
    }

    set((state) => ({
      toasts: [...state.toasts, newToast]
    }))

    // Auto remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, newToast.duration)
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
  },

  clearToasts: () => {
    set({ toasts: [] })
  },

  success: (message, duration) => {
    get().addToast({ type: 'success', message, duration })
  },

  error: (message, duration) => {
    get().addToast({ type: 'error', message, duration: duration ?? 6000 })
  },

  warning: (message, duration) => {
    get().addToast({ type: 'warning', message, duration })
  },

  info: (message, duration) => {
    get().addToast({ type: 'info', message, duration })
  }
}))
