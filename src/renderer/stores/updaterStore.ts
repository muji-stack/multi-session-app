// Updater Store
// Manages auto-update state

import { create } from 'zustand'

interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes: string | null
  releaseName: string | null
}

interface UpdateProgress {
  bytesPerSecond: number
  percent: number
  transferred: number
  total: number
}

interface UpdateConfig {
  autoCheck: boolean
  autoDownload: boolean
  checkIntervalHours: number
  lastCheckedAt: number | null
}

interface UpdaterState {
  // Status
  checking: boolean
  available: boolean
  downloading: boolean
  downloaded: boolean
  error: string | null
  updateInfo: UpdateInfo | null
  progress: UpdateProgress | null
  currentVersion: string

  // Config
  config: UpdateConfig

  // Loading states
  isLoadingConfig: boolean
  isInstallingUpdate: boolean

  // Actions
  setChecking: (checking: boolean) => void
  setAvailable: (available: boolean, info?: UpdateInfo) => void
  setDownloading: (downloading: boolean) => void
  setDownloaded: (downloaded: boolean, info?: UpdateInfo) => void
  setError: (error: string | null) => void
  setProgress: (progress: UpdateProgress | null) => void
  setCurrentVersion: (version: string) => void
  setConfig: (config: UpdateConfig) => void
  setIsLoadingConfig: (loading: boolean) => void
  setIsInstallingUpdate: (installing: boolean) => void
  reset: () => void

  // API Actions
  checkForUpdates: () => Promise<UpdateInfo | null>
  downloadUpdate: () => Promise<void>
  installUpdate: () => Promise<void>
  loadCurrentVersion: () => Promise<void>
  loadConfig: () => Promise<void>
  updateConfig: (updates: Partial<UpdateConfig>) => Promise<void>

  // Event subscriptions
  setupEventListeners: () => () => void
}

const initialState = {
  checking: false,
  available: false,
  downloading: false,
  downloaded: false,
  error: null,
  updateInfo: null,
  progress: null,
  currentVersion: '',
  config: {
    autoCheck: true,
    autoDownload: false,
    checkIntervalHours: 6,
    lastCheckedAt: null,
  },
  isLoadingConfig: false,
  isInstallingUpdate: false,
}

export const useUpdaterStore = create<UpdaterState>((set, get) => ({
  ...initialState,

  // State setters
  setChecking: (checking) => set({ checking, error: null }),
  setAvailable: (available, info) => set({
    available,
    updateInfo: info || null,
    checking: false,
  }),
  setDownloading: (downloading) => set({ downloading }),
  setDownloaded: (downloaded, info) => set({
    downloaded,
    downloading: false,
    updateInfo: info || get().updateInfo,
    progress: null,
  }),
  setError: (error) => set({
    error,
    checking: false,
    downloading: false,
  }),
  setProgress: (progress) => set({ progress }),
  setCurrentVersion: (currentVersion) => set({ currentVersion }),
  setConfig: (config) => set({ config }),
  setIsLoadingConfig: (isLoadingConfig) => set({ isLoadingConfig }),
  setIsInstallingUpdate: (isInstallingUpdate) => set({ isInstallingUpdate }),
  reset: () => set(initialState),

  // API Actions
  checkForUpdates: async () => {
    set({ checking: true, error: null })
    try {
      const info = await window.api.updater.checkForUpdates()
      if (info) {
        set({
          checking: false,
          available: true,
          updateInfo: info,
        })
      } else {
        set({
          checking: false,
          available: false,
        })
      }
      return info
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check for updates'
      set({ checking: false, error: errorMessage })
      throw error
    }
  },

  downloadUpdate: async () => {
    const { available } = get()
    if (!available) {
      throw new Error('No update available to download')
    }

    set({ downloading: true, error: null, progress: null })
    try {
      const result = await window.api.updater.downloadUpdate()
      if (!result.success) {
        throw new Error(result.error || 'Download failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download update'
      set({ downloading: false, error: errorMessage })
      throw error
    }
  },

  installUpdate: async () => {
    const { downloaded } = get()
    if (!downloaded) {
      throw new Error('No update downloaded to install')
    }

    set({ isInstallingUpdate: true, error: null })
    try {
      const result = await window.api.updater.installUpdate()
      if (!result.success) {
        throw new Error(result.error || 'Installation failed')
      }
      // App will restart, no need to update state
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to install update'
      set({ isInstallingUpdate: false, error: errorMessage })
      throw error
    }
  },

  loadCurrentVersion: async () => {
    try {
      const version = await window.api.updater.getVersion()
      set({ currentVersion: version })
    } catch (error) {
      console.error('Failed to load current version:', error)
    }
  },

  loadConfig: async () => {
    set({ isLoadingConfig: true })
    try {
      const config = await window.api.updater.getConfig()
      set({ config, isLoadingConfig: false })
    } catch (error) {
      console.error('Failed to load update config:', error)
      set({ isLoadingConfig: false })
    }
  },

  updateConfig: async (updates) => {
    try {
      const newConfig = await window.api.updater.setConfig(updates)
      set({ config: newConfig })
    } catch (error) {
      console.error('Failed to update config:', error)
      throw error
    }
  },

  // Event subscriptions
  setupEventListeners: () => {
    const unsubChecking = window.api.updater.onChecking(() => {
      set({ checking: true, error: null })
    })

    const unsubAvailable = window.api.updater.onAvailable((info) => {
      set({
        checking: false,
        available: true,
        updateInfo: info,
      })

      // Show desktop notification
      if (Notification.permission === 'granted') {
        new Notification('Update Available', {
          body: `Version ${info.version} is available for download.`,
          icon: '/icon.png',
        })
      }
    })

    const unsubNotAvailable = window.api.updater.onNotAvailable(() => {
      set({
        checking: false,
        available: false,
      })
    })

    const unsubProgress = window.api.updater.onProgress((progress) => {
      set({ progress })
    })

    const unsubDownloaded = window.api.updater.onDownloaded((info) => {
      set({
        downloading: false,
        downloaded: true,
        updateInfo: info,
        progress: null,
      })

      // Show desktop notification
      if (Notification.permission === 'granted') {
        new Notification('Update Ready', {
          body: `Version ${info.version} has been downloaded and is ready to install.`,
          icon: '/icon.png',
        })
      }
    })

    const unsubError = window.api.updater.onError((error) => {
      set({
        checking: false,
        downloading: false,
        error,
      })
    })

    // Return cleanup function
    return () => {
      unsubChecking()
      unsubAvailable()
      unsubNotAvailable()
      unsubProgress()
      unsubDownloaded()
      unsubError()
    }
  },
}))

// Helper functions
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
