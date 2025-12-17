import { ipcMain } from 'electron'
import * as net from 'node:net'
import {
  getAllProxies,
  getProxyById,
  createProxy,
  updateProxy,
  updateProxyStatus,
  deleteProxy,
  getProxyStats
} from '../database/proxyRepository'
import type { ProxyProtocol, ProxyStatus } from '../../shared/types'

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

export function registerProxyHandlers(): void {
  ipcMain.handle('proxy:getAll', () => {
    return getAllProxies()
  })

  ipcMain.handle('proxy:getById', (_event, id: string) => {
    return getProxyById(id)
  })

  ipcMain.handle('proxy:create', (_event, input: CreateProxyInput) => {
    return createProxy(input)
  })

  ipcMain.handle('proxy:update', (_event, id: string, updates: UpdateProxyInput) => {
    return updateProxy(id, updates)
  })

  ipcMain.handle('proxy:delete', (_event, id: string) => {
    return deleteProxy(id)
  })

  ipcMain.handle('proxy:getStats', () => {
    return getProxyStats()
  })

  // Health check for a single proxy
  ipcMain.handle('proxy:check', async (_event, id: string) => {
    const proxy = getProxyById(id)
    if (!proxy) {
      return { success: false, error: 'Proxy not found' }
    }

    try {
      const status = await checkProxyHealth(proxy.host, proxy.port, proxy.protocol, proxy.username, proxy.password)
      updateProxyStatus(id, status)
      return { success: true, status }
    } catch (error) {
      updateProxyStatus(id, 'error')
      return { success: false, error: String(error), status: 'error' as ProxyStatus }
    }
  })

  // Health check for multiple proxies
  ipcMain.handle('proxy:checkMultiple', async (_event, ids: string[]) => {
    const results: { id: string; status: ProxyStatus; error?: string }[] = []

    for (const id of ids) {
      const proxy = getProxyById(id)
      if (!proxy) {
        results.push({ id, status: 'error', error: 'Proxy not found' })
        continue
      }

      try {
        const status = await checkProxyHealth(proxy.host, proxy.port, proxy.protocol, proxy.username, proxy.password)
        updateProxyStatus(id, status)
        results.push({ id, status })
      } catch (error) {
        updateProxyStatus(id, 'error')
        results.push({ id, status: 'error', error: String(error) })
      }
    }

    return results
  })
}

async function checkProxyHealth(
  host: string,
  port: number,
  _protocol: ProxyProtocol,
  _username: string | null,
  _password: string | null
): Promise<ProxyStatus> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const timeout = 10000 // 10 seconds

    const timer = setTimeout(() => {
      socket.destroy()
      resolve('inactive')
    }, timeout)

    socket.connect(port, host, () => {
      clearTimeout(timer)
      socket.destroy()
      resolve('active')
    })

    socket.on('error', () => {
      clearTimeout(timer)
      socket.destroy()
      resolve('error')
    })
  })
}
