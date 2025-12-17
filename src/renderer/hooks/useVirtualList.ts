import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

interface VirtualListOptions {
  itemHeight: number
  overscan?: number
}

interface VirtualListResult<T> {
  virtualItems: Array<{ item: T; index: number; style: React.CSSProperties }>
  totalHeight: number
  containerRef: React.RefObject<HTMLDivElement>
}

export function useVirtualList<T>(
  items: T[],
  options: VirtualListOptions
): VirtualListResult<T> {
  const { itemHeight, overscan = 3 } = options
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = (): void => {
      setScrollTop(container.scrollTop)
    }

    const handleResize = (): void => {
      setContainerHeight(container.clientHeight)
    }

    // Initial setup
    handleResize()

    container.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const totalHeight = items.length * itemHeight

  const virtualItems = useMemo(() => {
    if (containerHeight === 0) return []

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )

    const result: Array<{ item: T; index: number; style: React.CSSProperties }> = []
    for (let i = startIndex; i <= endIndex; i++) {
      result.push({
        item: items[i],
        index: i,
        style: {
          position: 'absolute',
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight
        }
      })
    }

    return result
  }, [items, scrollTop, containerHeight, itemHeight, overscan])

  return { virtualItems, totalHeight, containerRef }
}

// Debounce hook for search inputs
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Throttle hook for frequent updates
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value)
  const lastUpdated = useRef<number>(Date.now())

  useEffect(() => {
    const now = Date.now()
    if (now - lastUpdated.current >= interval) {
      lastUpdated.current = now
      setThrottledValue(value)
    } else {
      const timerId = setTimeout(() => {
        lastUpdated.current = Date.now()
        setThrottledValue(value)
      }, interval - (now - lastUpdated.current))

      return () => clearTimeout(timerId)
    }
  }, [value, interval])

  return throttledValue
}

// Intersection observer hook for lazy loading
export function useIntersectionObserver(
  options?: IntersectionObserverInit
): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, options)

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [options])

  return [ref, isIntersecting]
}

// Memoized callback with deep comparison
export function useMemoizedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: React.DependencyList
): T {
  const ref = useRef<T>(callback)

  useEffect(() => {
    ref.current = callback
  }, [callback, ...deps])

  return useCallback(
    ((...args: unknown[]) => ref.current(...args)) as T,
    []
  )
}
