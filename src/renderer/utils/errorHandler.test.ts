import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  AppError,
  NetworkError,
  AuthError,
  ValidationError,
  DatabaseError,
  getErrorMessage,
  validateRequired,
  validateEmail,
  validateMinLength,
  validateMaxLength,
  tryCatchSync
} from './errorHandler'

describe('Error Classes', () => {
  it('should create AppError with correct properties', () => {
    const error = new AppError('Test error', 'TEST_CODE', true)
    expect(error.message).toBe('Test error')
    expect(error.code).toBe('TEST_CODE')
    expect(error.recoverable).toBe(true)
    expect(error.name).toBe('AppError')
  })

  it('should create NetworkError with default message', () => {
    const error = new NetworkError()
    expect(error.message).toBe('ネットワークエラーが発生しました')
    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.recoverable).toBe(true)
  })

  it('should create AuthError with default message', () => {
    const error = new AuthError()
    expect(error.message).toBe('認証エラーが発生しました')
    expect(error.code).toBe('AUTH_ERROR')
  })

  it('should create ValidationError with field', () => {
    const error = new ValidationError('Invalid input', 'username')
    expect(error.message).toBe('Invalid input')
    expect(error.field).toBe('username')
  })

  it('should create DatabaseError with recoverable false', () => {
    const error = new DatabaseError()
    expect(error.recoverable).toBe(false)
  })
})

describe('getErrorMessage', () => {
  it('should return message from AppError', () => {
    const error = new AppError('Custom message', 'CODE')
    expect(getErrorMessage(error)).toBe('Custom message')
  })

  it('should return message from regular Error', () => {
    const error = new Error('Regular error')
    expect(getErrorMessage(error)).toBe('Regular error')
  })

  it('should detect network errors', () => {
    const error = new Error('network failed')
    expect(getErrorMessage(error)).toBe('ネットワーク接続を確認してください')
  })

  it('should detect fetch errors', () => {
    const error = new Error('fetch failed')
    expect(getErrorMessage(error)).toBe('ネットワーク接続を確認してください')
  })

  it('should detect auth errors', () => {
    const error = new Error('401 unauthorized')
    expect(getErrorMessage(error)).toBe('再度ログインしてください')
  })

  it('should handle string errors', () => {
    expect(getErrorMessage('String error')).toBe('String error')
  })

  it('should return unknown error for other types', () => {
    expect(getErrorMessage(123)).toBe('予期しないエラーが発生しました')
    expect(getErrorMessage(null)).toBe('予期しないエラーが発生しました')
  })
})

describe('Validation helpers', () => {
  describe('validateRequired', () => {
    it('should not throw for valid values', () => {
      expect(() => validateRequired('value', 'field')).not.toThrow()
      expect(() => validateRequired(0, 'field')).not.toThrow()
      expect(() => validateRequired(false, 'field')).not.toThrow()
    })

    it('should throw for empty string', () => {
      expect(() => validateRequired('', 'field')).toThrow(ValidationError)
      expect(() => validateRequired('', 'field')).toThrow('fieldは必須です')
    })

    it('should throw for null', () => {
      expect(() => validateRequired(null, 'field')).toThrow(ValidationError)
    })

    it('should throw for undefined', () => {
      expect(() => validateRequired(undefined, 'field')).toThrow(ValidationError)
    })
  })

  describe('validateEmail', () => {
    it('should not throw for valid email', () => {
      expect(() => validateEmail('test@example.com')).not.toThrow()
      expect(() => validateEmail('user.name@domain.co.jp')).not.toThrow()
    })

    it('should throw for invalid email', () => {
      expect(() => validateEmail('invalid')).toThrow(ValidationError)
      expect(() => validateEmail('invalid@')).toThrow(ValidationError)
      expect(() => validateEmail('@example.com')).toThrow(ValidationError)
    })
  })

  describe('validateMinLength', () => {
    it('should not throw when length is sufficient', () => {
      expect(() => validateMinLength('abc', 3, 'field')).not.toThrow()
      expect(() => validateMinLength('abcd', 3, 'field')).not.toThrow()
    })

    it('should throw when length is insufficient', () => {
      expect(() => validateMinLength('ab', 3, 'field')).toThrow(ValidationError)
      expect(() => validateMinLength('ab', 3, 'field')).toThrow('fieldは3文字以上で入力してください')
    })
  })

  describe('validateMaxLength', () => {
    it('should not throw when length is within limit', () => {
      expect(() => validateMaxLength('abc', 5, 'field')).not.toThrow()
      expect(() => validateMaxLength('abcde', 5, 'field')).not.toThrow()
    })

    it('should throw when length exceeds limit', () => {
      expect(() => validateMaxLength('abcdef', 5, 'field')).toThrow(ValidationError)
      expect(() => validateMaxLength('abcdef', 5, 'field')).toThrow('fieldは5文字以下で入力してください')
    })
  })
})

describe('tryCatchSync', () => {
  it('should return result on success', () => {
    const result = tryCatchSync(() => 'success', { showToast: false })
    expect(result).toBe('success')
  })

  it('should return fallback on error', () => {
    const result = tryCatchSync(
      () => {
        throw new Error('fail')
      },
      { showToast: false, fallback: 'fallback' }
    )
    expect(result).toBe('fallback')
  })

  it('should call onError callback on error', () => {
    const onError = vi.fn()
    tryCatchSync(
      () => {
        throw new Error('fail')
      },
      { showToast: false, onError }
    )
    expect(onError).toHaveBeenCalled()
  })
})
