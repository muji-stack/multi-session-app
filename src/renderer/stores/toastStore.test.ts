import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useToastStore } from './toastStore'

describe('toastStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useToastStore.setState({ toasts: [] })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('addToast', () => {
    it('should add a toast with default duration', () => {
      const store = useToastStore.getState()
      store.addToast({ type: 'success', message: 'Test message' })

      const toasts = useToastStore.getState().toasts
      expect(toasts).toHaveLength(1)
      expect(toasts[0].message).toBe('Test message')
      expect(toasts[0].type).toBe('success')
      expect(toasts[0].duration).toBe(4000)
    })

    it('should add a toast with custom duration', () => {
      const store = useToastStore.getState()
      store.addToast({ type: 'info', message: 'Custom', duration: 10000 })

      const toasts = useToastStore.getState().toasts
      expect(toasts[0].duration).toBe(10000)
    })

    it('should generate unique IDs for toasts', () => {
      const store = useToastStore.getState()
      store.addToast({ type: 'success', message: 'First' })
      store.addToast({ type: 'success', message: 'Second' })

      const toasts = useToastStore.getState().toasts
      expect(toasts[0].id).not.toBe(toasts[1].id)
    })

    it('should auto-remove toast after duration', () => {
      const store = useToastStore.getState()
      store.addToast({ type: 'success', message: 'Auto remove', duration: 1000 })

      expect(useToastStore.getState().toasts).toHaveLength(1)

      vi.advanceTimersByTime(1000)

      expect(useToastStore.getState().toasts).toHaveLength(0)
    })
  })

  describe('removeToast', () => {
    it('should remove a specific toast by ID', () => {
      const store = useToastStore.getState()
      store.addToast({ type: 'success', message: 'First' })
      store.addToast({ type: 'success', message: 'Second' })

      const toasts = useToastStore.getState().toasts
      const idToRemove = toasts[0].id

      store.removeToast(idToRemove)

      const remainingToasts = useToastStore.getState().toasts
      expect(remainingToasts).toHaveLength(1)
      expect(remainingToasts[0].message).toBe('Second')
    })

    it('should not throw when removing non-existent toast', () => {
      const store = useToastStore.getState()
      expect(() => store.removeToast('non-existent')).not.toThrow()
    })
  })

  describe('clearToasts', () => {
    it('should remove all toasts', () => {
      const store = useToastStore.getState()
      store.addToast({ type: 'success', message: 'First' })
      store.addToast({ type: 'error', message: 'Second' })
      store.addToast({ type: 'warning', message: 'Third' })

      expect(useToastStore.getState().toasts).toHaveLength(3)

      store.clearToasts()

      expect(useToastStore.getState().toasts).toHaveLength(0)
    })
  })

  describe('convenience methods', () => {
    it('success should add a success toast', () => {
      const store = useToastStore.getState()
      store.success('Success message')

      const toasts = useToastStore.getState().toasts
      expect(toasts[0].type).toBe('success')
      expect(toasts[0].message).toBe('Success message')
    })

    it('error should add an error toast with longer duration', () => {
      const store = useToastStore.getState()
      store.error('Error message')

      const toasts = useToastStore.getState().toasts
      expect(toasts[0].type).toBe('error')
      expect(toasts[0].duration).toBe(6000)
    })

    it('warning should add a warning toast', () => {
      const store = useToastStore.getState()
      store.warning('Warning message')

      const toasts = useToastStore.getState().toasts
      expect(toasts[0].type).toBe('warning')
    })

    it('info should add an info toast', () => {
      const store = useToastStore.getState()
      store.info('Info message')

      const toasts = useToastStore.getState().toasts
      expect(toasts[0].type).toBe('info')
    })

    it('convenience methods should respect custom duration', () => {
      const store = useToastStore.getState()
      store.success('Custom duration', 10000)

      const toasts = useToastStore.getState().toasts
      expect(toasts[0].duration).toBe(10000)
    })
  })
})
