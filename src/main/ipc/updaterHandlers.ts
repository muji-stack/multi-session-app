// Updater IPC Handlers
// Handles update-related IPC messages

import { ipcMain } from 'electron'
import {
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  getUpdateStatus,
  getCurrentVersion,
  getUpdateConfig,
  setUpdateConfig,
} from '../services/updater'

export function registerUpdaterHandlers(): void {
  // Check for updates
  ipcMain.handle('updater:check', async () => {
    try {
      const updateInfo = await checkForUpdates()
      return {
        success: true,
        updateInfo,
        hasUpdate: updateInfo !== null,
      }
    } catch (error) {
      console.error('[Updater] Check failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'アップデートの確認に失敗しました',
        hasUpdate: false,
      }
    }
  })

  // Download update
  ipcMain.handle('updater:download', async () => {
    try {
      await downloadUpdate()
      return { success: true }
    } catch (error) {
      console.error('[Updater] Download failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'ダウンロードに失敗しました',
      }
    }
  })

  // Install update (quits and restarts)
  ipcMain.handle('updater:install', async () => {
    try {
      // Give renderer time to clean up
      setTimeout(() => {
        installUpdate()
      }, 500)
      return { success: true }
    } catch (error) {
      console.error('[Updater] Install failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'インストールに失敗しました',
      }
    }
  })

  // Get current version
  ipcMain.handle('updater:get-version', async () => {
    return getCurrentVersion()
  })

  // Get update status
  ipcMain.handle('updater:get-status', async () => {
    return getUpdateStatus()
  })

  // Get update config
  ipcMain.handle('updater:get-config', async () => {
    return getUpdateConfig()
  })

  // Update config
  ipcMain.handle(
    'updater:set-config',
    async (
      _event,
      updates: {
        autoCheck?: boolean
        autoDownload?: boolean
        checkIntervalHours?: number
      }
    ) => {
      return setUpdateConfig(updates)
    }
  )
}
