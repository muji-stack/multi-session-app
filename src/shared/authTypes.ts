// Auth User Type
export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
  createdAt: number | null
  lastLoginAt: number | null
}

// Auth State
export interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// Auth Result Types
export interface AuthResult {
  success: boolean
  user?: AuthUser
  error?: string
}

export interface ResetPasswordResult {
  success: boolean
  error?: string
}

// Stored Auth Token
export interface StoredAuthToken {
  refreshToken: string
  email: string
  uid: string
  expiresAt: number
}
