import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce, useThrottle } from './useVirtualList'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    expect(result.current).toBe('initial')
  })

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    expect(result.current).toBe('initial')

    rerender({ value: 'updated', delay: 500 })
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current).toBe('updated')
  })

  it('should reset timer on rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'a' } }
    )

    rerender({ value: 'b' })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    rerender({ value: 'c' })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Should still be 'a' because timer keeps resetting
    expect(result.current).toBe('a')

    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Now it should be 'c'
    expect(result.current).toBe('c')
  })
})

describe('useThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useThrottle('initial', 500))
    expect(result.current).toBe('initial')
  })

  it('should throttle value updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useThrottle(value, 500),
      { initialProps: { value: 'initial' } }
    )

    // First update should be immediate
    rerender({ value: 'update1' })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    // Within throttle interval, should not update yet
    rerender({ value: 'update2' })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current).toBe('update2')
  })
})
