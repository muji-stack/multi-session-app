import { useToastStore } from '../stores/toastStore'

// Error types
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'ネットワークエラーが発生しました') {
    super(message, 'NETWORK_ERROR', true)
    this.name = 'NetworkError'
  }
}

export class AuthError extends AppError {
  constructor(message: string = '認証エラーが発生しました') {
    super(message, 'AUTH_ERROR', true)
    this.name = 'AuthError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', true)
    this.name = 'ValidationError'
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'データベースエラーが発生しました') {
    super(message, 'DATABASE_ERROR', false)
    this.name = 'DatabaseError'
  }
}

// Error message mapping
const errorMessages: Record<string, string> = {
  NETWORK_ERROR: 'ネットワーク接続を確認してください',
  AUTH_ERROR: '再度ログインしてください',
  VALIDATION_ERROR: '入力内容を確認してください',
  DATABASE_ERROR: 'データベースエラーが発生しました',
  UNKNOWN_ERROR: '予期しないエラーが発生しました'
}

// Get user-friendly error message
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }

  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return errorMessages.NETWORK_ERROR
    }
    if (error.message.includes('unauthorized') || error.message.includes('401')) {
      return errorMessages.AUTH_ERROR
    }
    return error.message || errorMessages.UNKNOWN_ERROR
  }

  if (typeof error === 'string') {
    return error
  }

  return errorMessages.UNKNOWN_ERROR
}

// Handle error with toast notification
export function handleError(error: unknown, showToast: boolean = true): void {
  const message = getErrorMessage(error)

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', error)
  }

  // Show toast notification
  if (showToast) {
    const toast = useToastStore.getState()
    toast.error(message)
  }
}

// Async error wrapper
export async function tryCatch<T>(
  fn: () => Promise<T>,
  options: {
    showToast?: boolean
    fallback?: T
    onError?: (error: unknown) => void
  } = {}
): Promise<T | undefined> {
  const { showToast = true, fallback, onError } = options

  try {
    return await fn()
  } catch (error) {
    handleError(error, showToast)
    if (onError) {
      onError(error)
    }
    return fallback
  }
}

// Sync error wrapper
export function tryCatchSync<T>(
  fn: () => T,
  options: {
    showToast?: boolean
    fallback?: T
    onError?: (error: unknown) => void
  } = {}
): T | undefined {
  const { showToast = true, fallback, onError } = options

  try {
    return fn()
  } catch (error) {
    handleError(error, showToast)
    if (onError) {
      onError(error)
    }
    return fallback
  }
}

// IPC error handler
export async function handleIpcError<T>(
  ipcCall: () => Promise<T>,
  errorMessage?: string
): Promise<T> {
  try {
    return await ipcCall()
  } catch (error) {
    const message = errorMessage || getErrorMessage(error)
    const toast = useToastStore.getState()
    toast.error(message)
    throw error
  }
}

// Retry with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    onRetry?: (attempt: number, error: unknown) => void
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry
  } = options

  let lastError: unknown
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt < maxRetries) {
        if (onRetry) {
          onRetry(attempt + 1, error)
        }

        await new Promise((resolve) => setTimeout(resolve, delay))
        delay = Math.min(delay * 2, maxDelay)
      }
    }
  }

  throw lastError
}

// Validation helpers
export function validateRequired(value: unknown, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName}は必須です`, fieldName)
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new ValidationError('有効なメールアドレスを入力してください', 'email')
  }
}

export function validateMinLength(value: string, minLength: number, fieldName: string): void {
  if (value.length < minLength) {
    throw new ValidationError(`${fieldName}は${minLength}文字以上で入力してください`, fieldName)
  }
}

export function validateMaxLength(value: string, maxLength: number, fieldName: string): void {
  if (value.length > maxLength) {
    throw new ValidationError(`${fieldName}は${maxLength}文字以下で入力してください`, fieldName)
  }
}
