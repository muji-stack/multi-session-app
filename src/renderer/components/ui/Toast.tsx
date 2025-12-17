import { useEffect, useState, memo, useCallback } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { useToastStore, type Toast as ToastType } from '../../stores/toastStore'

interface ToastProps {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
  onClose: (id: string) => void
}

function Toast({ id, type, message, duration = 5000, onClose }: ToastProps): JSX.Element {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [id, duration, onClose])

  const icons = {
    success: <CheckCircle size={18} />,
    error: <XCircle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />
  }

  const styles = {
    success: 'bg-success/20 border-success/30 text-success',
    error: 'bg-error/20 border-error/30 text-error',
    warning: 'bg-warning/20 border-warning/30 text-warning',
    info: 'bg-primary/20 border-primary/30 text-primary'
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg animate-slide-in ${styles[type]}`}
    >
      {icons[type]}
      <p className="flex-1 text-sm text-white">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="text-gray-400 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  )
}

// Toast Item for Container
const ToastItem = memo(function ToastItem({ toast }: { toast: ToastType }): JSX.Element {
  const removeToast = useToastStore((state) => state.removeToast)
  const [isExiting, setIsExiting] = useState(false)

  const handleClose = useCallback((): void => {
    setIsExiting(true)
    setTimeout(() => {
      removeToast(toast.id)
    }, 200)
  }, [removeToast, toast.id])

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timeout = setTimeout(() => {
        setIsExiting(true)
      }, toast.duration - 200)
      return () => clearTimeout(timeout)
    }
  }, [toast.duration])

  const icons = {
    success: <CheckCircle size={20} className="text-green-400" />,
    error: <XCircle size={20} className="text-red-400" />,
    warning: <AlertTriangle size={20} className="text-yellow-400" />,
    info: <Info size={20} className="text-blue-400" />
  }

  const backgrounds = {
    success: 'bg-green-500/10 border-green-500/30',
    error: 'bg-red-500/10 border-red-500/30',
    warning: 'bg-yellow-500/10 border-yellow-500/30',
    info: 'bg-blue-500/10 border-blue-500/30'
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg transition-all duration-200 ${
        backgrounds[toast.type]
      } ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}
    >
      {icons[toast.type]}
      <p className="text-white text-sm flex-1">{toast.message}</p>
      <button
        onClick={handleClose}
        className="text-gray-400 hover:text-white transition-colors p-1"
      >
        <X size={16} />
      </button>
    </div>
  )
})

// Toast Container - renders all toasts from the store
export function ToastContainer(): JSX.Element {
  const toasts = useToastStore((state) => state.toasts)

  if (toasts.length === 0) return <></>

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

// Convenience hook for using toast notifications
export function useToast() {
  const store = useToastStore()
  return {
    success: store.success,
    error: store.error,
    warning: store.warning,
    info: store.info,
    addToast: store.addToast,
    removeToast: store.removeToast,
    clearToasts: store.clearToasts
  }
}

export default Toast
