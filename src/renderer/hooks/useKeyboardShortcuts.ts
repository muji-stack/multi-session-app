import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

interface ShortcutConfig {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  action: () => void
  description: string
}

export const shortcuts: Omit<ShortcutConfig, 'action'>[] = [
  { key: '1', alt: true, description: 'ダッシュボードに移動' },
  { key: '2', alt: true, description: 'アカウントに移動' },
  { key: '3', alt: true, description: '一括投稿に移動' },
  { key: '4', alt: true, description: '予約投稿に移動' },
  { key: '5', alt: true, description: 'エンゲージメントに移動' },
  { key: '6', alt: true, description: 'チェックに移動' },
  { key: '7', alt: true, description: '分析に移動' },
  { key: '8', alt: true, description: 'プロキシに移動' },
  { key: '9', alt: true, description: '自動化に移動' },
  { key: '0', alt: true, description: '設定に移動' },
  { key: '/', ctrl: true, description: 'ショートカット一覧を表示' }
]

export function useKeyboardShortcuts(onShowHelp?: () => void): void {
  const navigate = useNavigate()

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore when typing in input fields
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const key = event.key.toLowerCase()

      // Alt + Number for navigation
      if (event.altKey && !event.ctrlKey && !event.shiftKey) {
        switch (key) {
          case '1':
            event.preventDefault()
            navigate('/')
            break
          case '2':
            event.preventDefault()
            navigate('/accounts')
            break
          case '3':
            event.preventDefault()
            navigate('/post')
            break
          case '4':
            event.preventDefault()
            navigate('/schedule')
            break
          case '5':
            event.preventDefault()
            navigate('/engagement')
            break
          case '6':
            event.preventDefault()
            navigate('/check')
            break
          case '7':
            event.preventDefault()
            navigate('/analytics')
            break
          case '8':
            event.preventDefault()
            navigate('/proxies')
            break
          case '9':
            event.preventDefault()
            navigate('/automation')
            break
          case '0':
            event.preventDefault()
            navigate('/settings')
            break
        }
      }

      // Ctrl + / for help
      if (event.ctrlKey && key === '/' && onShowHelp) {
        event.preventDefault()
        onShowHelp()
      }
    },
    [navigate, onShowHelp]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}

export function formatShortcut(shortcut: Omit<ShortcutConfig, 'action'>): string {
  const parts: string[] = []
  if (shortcut.ctrl) parts.push('Ctrl')
  if (shortcut.alt) parts.push('Alt')
  if (shortcut.shift) parts.push('Shift')
  parts.push(shortcut.key.toUpperCase())
  return parts.join(' + ')
}
