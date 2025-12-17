import { create } from 'zustand'
import type { Proxy, ProxyProtocol, ProxyStatus } from '../../shared/types'

interface CreateProxyInput {
  name: string
  host: string
  port: number
  username?: string | null
  password?: string | null
  protocol?: ProxyProtocol
  groupId?: string | null
}

interface UpdateProxyInput {
  name?: string
  host?: string
  port?: number
  username?: string | null
  password?: string | null
  protocol?: ProxyProtocol
  groupId?: string | null
}

interface ProxyState {
  proxies: Proxy[]
  isLoading: boolean
  isChecking: boolean

  fetchProxies: () => Promise<void>
  createProxy: (input: CreateProxyInput) => Promise<Proxy>
  updateProxy: (id: string, updates: UpdateProxyInput) => Promise<void>
  deleteProxy: (id: string) => Promise<void>
  checkProxy: (id: string) => Promise<ProxyStatus>
  checkAllProxies: () => Promise<void>
  getProxyById: (id: string) => Proxy | undefined
}

export const useProxyStore = create<ProxyState>((set, get) => ({
  proxies: [],
  isLoading: false,
  isChecking: false,

  fetchProxies: async (): Promise<void> => {
    set({ isLoading: true })
    try {
      const proxies = (await window.api.proxy.getAll()) as Proxy[]
      set({ proxies })
    } catch (error) {
      console.error('Failed to fetch proxies:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  createProxy: async (input: CreateProxyInput): Promise<Proxy> => {
    try {
      const proxy = (await window.api.proxy.create(input)) as Proxy
      set((state) => ({ proxies: [...state.proxies, proxy] }))
      return proxy
    } catch (error) {
      console.error('Failed to create proxy:', error)
      throw error
    }
  },

  updateProxy: async (id: string, updates: UpdateProxyInput): Promise<void> => {
    try {
      const proxy = (await window.api.proxy.update(id, updates)) as Proxy | null
      if (proxy) {
        set((state) => ({
          proxies: state.proxies.map((p) => (p.id === id ? proxy : p))
        }))
      }
    } catch (error) {
      console.error('Failed to update proxy:', error)
      throw error
    }
  },

  deleteProxy: async (id: string): Promise<void> => {
    try {
      await window.api.proxy.delete(id)
      set((state) => ({
        proxies: state.proxies.filter((p) => p.id !== id)
      }))
    } catch (error) {
      console.error('Failed to delete proxy:', error)
      throw error
    }
  },

  checkProxy: async (id: string): Promise<ProxyStatus> => {
    try {
      const result = await window.api.proxy.check(id)
      if (result.success && result.status) {
        set((state) => ({
          proxies: state.proxies.map((p) =>
            p.id === id ? { ...p, status: result.status as ProxyStatus, lastCheckedAt: Date.now() } : p
          )
        }))
        return result.status as ProxyStatus
      }
      return 'error'
    } catch (error) {
      console.error('Failed to check proxy:', error)
      return 'error'
    }
  },

  checkAllProxies: async (): Promise<void> => {
    const { proxies } = get()
    if (proxies.length === 0) return

    set({ isChecking: true })
    try {
      const ids = proxies.map((p) => p.id)
      const results = await window.api.proxy.checkMultiple(ids)

      set((state) => ({
        proxies: state.proxies.map((p) => {
          const result = results.find((r) => r.id === p.id)
          if (result) {
            return { ...p, status: result.status as ProxyStatus, lastCheckedAt: Date.now() }
          }
          return p
        })
      }))
    } catch (error) {
      console.error('Failed to check proxies:', error)
    } finally {
      set({ isChecking: false })
    }
  },

  getProxyById: (id: string): Proxy | undefined => {
    return get().proxies.find((p) => p.id === id)
  }
}))
