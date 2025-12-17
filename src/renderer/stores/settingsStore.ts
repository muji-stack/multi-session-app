import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Settings {
  // Post settings
  delayBetweenPosts: number
  // Engagement settings
  delayBetweenEngagements: number
  // General settings
  autoCheckOnStartup: boolean
  confirmBeforeAction: boolean
}

interface SettingsState extends Settings {
  updateSettings: (settings: Partial<Settings>) => void
  resetToDefaults: () => void
}

const defaultSettings: Settings = {
  delayBetweenPosts: 5000,
  delayBetweenEngagements: 3000,
  autoCheckOnStartup: false,
  confirmBeforeAction: true
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      updateSettings: (settings) => {
        set((state) => ({ ...state, ...settings }))
      },

      resetToDefaults: () => {
        set(defaultSettings)
      }
    }),
    {
      name: 'multi-session-settings'
    }
  )
)
