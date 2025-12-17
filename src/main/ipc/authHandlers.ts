import { ipcMain, BrowserWindow } from 'electron'
import {
  signUp,
  signIn,
  signOut,
  resetPassword,
  getCurrentUser,
  onAuthStateChanged,
  isAuthServiceAvailable,
  tryRestoreSession
} from '../services/authService'

let authStateUnsubscribe: (() => void) | null = null

export function registerAuthHandlers(): void {
  // Check if auth service is available
  ipcMain.handle('auth:isAvailable', () => {
    return isAuthServiceAvailable()
  })

  // Sign up
  ipcMain.handle('auth:signUp', async (_event, email: string, password: string) => {
    const result = await signUp(email, password)

    // Notify all windows of auth state change
    if (result.success && result.user) {
      notifyAuthStateChange(result.user)
    }

    return result
  })

  // Sign in
  ipcMain.handle('auth:signIn', async (_event, email: string, password: string) => {
    const result = await signIn(email, password)

    // Notify all windows of auth state change
    if (result.success && result.user) {
      notifyAuthStateChange(result.user)
    }

    return result
  })

  // Sign out
  ipcMain.handle('auth:signOut', async () => {
    const result = await signOut()

    // Notify all windows of auth state change
    if (result.success) {
      notifyAuthStateChange(null)
    }

    return result
  })

  // Reset password
  ipcMain.handle('auth:resetPassword', async (_event, email: string) => {
    return resetPassword(email)
  })

  // Get current user
  ipcMain.handle('auth:getCurrentUser', () => {
    return getCurrentUser()
  })

  // Try restore session
  ipcMain.handle('auth:tryRestoreSession', async () => {
    return tryRestoreSession()
  })
}

// Setup auth state listener
export function setupAuthStateListener(): void {
  // Clean up existing listener
  if (authStateUnsubscribe) {
    authStateUnsubscribe()
  }

  // Subscribe to auth state changes
  const unsubscribe = onAuthStateChanged((user) => {
    notifyAuthStateChange(user)
  })

  if (unsubscribe) {
    authStateUnsubscribe = unsubscribe
  }
}

// Cleanup auth state listener
export function cleanupAuthStateListener(): void {
  if (authStateUnsubscribe) {
    authStateUnsubscribe()
    authStateUnsubscribe = null
  }
}

// Notify all windows of auth state change
function notifyAuthStateChange(user: unknown): void {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send('auth:stateChanged', user)
    }
  })
}
