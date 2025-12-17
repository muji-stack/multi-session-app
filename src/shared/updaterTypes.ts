// Updater Types
// Types for auto-update functionality

export interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes: string | null
  releaseName: string | null
}

export interface UpdateProgress {
  bytesPerSecond: number
  percent: number
  transferred: number
  total: number
}

export interface UpdateStatus {
  checking: boolean
  available: boolean
  downloading: boolean
  downloaded: boolean
  error: string | null
  updateInfo: UpdateInfo | null
  progress: UpdateProgress | null
}

export interface UpdateConfig {
  autoCheck: boolean
  autoDownload: boolean
  checkIntervalHours: number
  lastCheckedAt: number | null
}

export const DEFAULT_UPDATE_CONFIG: UpdateConfig = {
  autoCheck: true,
  autoDownload: false,
  checkIntervalHours: 6,
  lastCheckedAt: null,
}

// Update check interval (6 hours)
export const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000
