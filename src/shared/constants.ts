// App Constants
export const APP_NAME = 'MultiSession'
export const APP_VERSION = '1.0.0'

// UI Constants
export const SIDEBAR_WIDTH = 64
export const HEADER_HEIGHT = 48
export const STATUSBAR_HEIGHT = 32

// Colors (matching Tailwind config)
export const COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  background: {
    dark: '#0f0f0f',
    light: '#ffffff'
  },
  surface: {
    dark: '#1a1a1a',
    light: '#f5f5f5'
  }
} as const

// Account Status Labels
export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  normal: '正常',
  locked: 'ロック',
  suspended: '凍結',
  unknown: '不明'
} as const

// Navigation Items
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/' },
  { id: 'accounts', label: 'Accounts', icon: 'Users', path: '/accounts' },
  { id: 'post', label: 'Post', icon: 'Edit', path: '/post' },
  { id: 'check', label: 'Check', icon: 'Search', path: '/check' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart2', path: '/analytics' },
  { id: 'settings', label: 'Settings', icon: 'Settings', path: '/settings' }
] as const

// X (Twitter) URLs
export const X_URLS = {
  home: 'https://x.com/home',
  login: 'https://x.com/i/flow/login',
  profile: (username: string) => `https://x.com/${username}`,
  post: (id: string) => `https://x.com/i/status/${id}`
} as const
