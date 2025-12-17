// Authentication Service
// Note: Firebase Auth requires browser APIs and should run in renderer process.
// This service provides a stub implementation for main process IPC handlers.
// Actual Firebase authentication is handled in the renderer process.

import { isFirebaseConfigured } from '../config/firebase'
import type { AuthUser, AuthResult, ResetPasswordResult } from '../../shared/authTypes'

// Check if auth service is available
export function isAuthServiceAvailable(): boolean {
  return isFirebaseConfigured()
}

// Stub implementations - actual auth happens in renderer
export async function signUp(_email: string, _password: string): Promise<AuthResult> {
  return { success: false, error: 'Authentication should be handled in renderer process' }
}

export async function signIn(_email: string, _password: string): Promise<AuthResult> {
  return { success: false, error: 'Authentication should be handled in renderer process' }
}

export async function signOut(): Promise<AuthResult> {
  return { success: true }
}

export async function resetPassword(_email: string): Promise<ResetPasswordResult> {
  return { success: false, error: 'Authentication should be handled in renderer process' }
}

export function getCurrentUser(): AuthUser | null {
  return null
}

export function onAuthStateChanged(_callback: (user: AuthUser | null) => void): (() => void) | null {
  return null
}

export async function tryRestoreSession(): Promise<AuthResult> {
  return { success: false, error: 'Authentication should be handled in renderer process' }
}
