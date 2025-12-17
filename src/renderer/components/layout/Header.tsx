import { useState, useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, Settings, Minus, Square, X, Command } from 'lucide-react'
import NotificationBell from '../notification/NotificationBell'

const pageTitles: Record<string, string> = {
  '/': 'ダッシュボード',
  '/accounts': 'アカウント',
  '/post': '一括投稿',
  '/schedule': '予約投稿',
  '/engagement': 'エンゲージメント',
  '/check': 'チェック',
  '/analytics': '分析',
  '/proxies': 'プロキシ',
  '/automation': '自動化',
  '/workflows': 'ワークフロー',
  '/media': 'メディア',
  '/monitoring': 'モニタリング',
  '/billing': 'プランと請求',
  '/settings': '設定',
  '/help': 'ヘルプ'
}

interface SearchResult {
  type: 'page' | 'action'
  title: string
  description: string
  path?: string
  action?: () => void
  icon?: string
}

const searchableItems: SearchResult[] = [
  { type: 'page', title: 'ダッシュボード', description: '概要とステータス', path: '/' },
  { type: 'page', title: 'アカウント管理', description: 'アカウントの追加・編集', path: '/accounts' },
  { type: 'page', title: '一括投稿', description: '複数アカウントに投稿', path: '/post' },
  { type: 'page', title: '予約投稿', description: '投稿のスケジュール設定', path: '/schedule' },
  { type: 'page', title: 'エンゲージメント', description: 'いいね・リポスト・フォロー', path: '/engagement' },
  { type: 'page', title: 'ステータスチェック', description: 'アカウント状態の確認', path: '/check' },
  { type: 'page', title: '分析', description: 'アクション統計と履歴', path: '/analytics' },
  { type: 'page', title: 'プロキシ設定', description: 'プロキシの管理', path: '/proxies' },
  { type: 'page', title: '自動化', description: 'タスクの自動化', path: '/automation' },
  { type: 'page', title: 'ワークフロー', description: '高度な自動化フロー', path: '/workflows' },
  { type: 'page', title: 'メディア', description: '画像・動画の管理', path: '/media' },
  { type: 'page', title: 'モニタリング', description: 'アカウント監視', path: '/monitoring' },
  { type: 'page', title: 'プランと請求', description: 'サブスクリプション管理', path: '/billing' },
  { type: 'page', title: '設定', description: 'アプリの設定', path: '/settings' },
  { type: 'page', title: 'ヘルプ', description: '使い方ガイド', path: '/help' },
]

function Header(): JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const pageTitle = pageTitles[location.pathname] || 'MultiSession'
  const isMac = window.api.isMac

  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Search logic
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (query.trim() === '') {
      setSearchResults([])
      return
    }

    const filtered = searchableItems.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
    )
    setSearchResults(filtered)
    setSelectedIndex(0)
  }, [])

  // Handle keyboard navigation in search
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (searchResults.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % searchResults.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length)
        break
      case 'Enter':
        e.preventDefault()
        const selected = searchResults[selectedIndex]
        if (selected?.path) {
          navigate(selected.path)
          setSearchQuery('')
          setSearchResults([])
          searchRef.current?.blur()
        } else if (selected?.action) {
          selected.action()
          setSearchQuery('')
          setSearchResults([])
        }
        break
      case 'Escape':
        setSearchQuery('')
        setSearchResults([])
        searchRef.current?.blur()
        break
    }
  }, [searchResults, selectedIndex, navigate])

  // Global shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target as Node) &&
          searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([])
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMinimize = (): void => {
    window.api.minimizeWindow()
  }

  const handleMaximize = (): void => {
    window.api.maximizeWindow()
  }

  const handleClose = (): void => {
    window.api.closeWindow()
  }

  const handleSettingsClick = (): void => {
    navigate('/settings')
  }

  return (
    <header className="h-12 bg-surface-dark/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 app-drag">
      {/* Page Title with breadcrumb style - add left margin on macOS for traffic lights */}
      <div className={`flex items-center gap-3 app-no-drag ${isMac ? 'ml-16' : ''}`}>
        <h1 className="text-lg font-semibold text-white">{pageTitle}</h1>
      </div>

      {/* Search Bar - Enhanced with command palette style */}
      <div className="flex-1 max-w-lg mx-8 app-no-drag relative">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="検索... (Ctrl+K)"
            className="w-full h-9 pl-10 pr-12 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-gray-500 bg-white/5 border border-white/10 rounded">
              <Command size={10} />K
            </kbd>
          </div>
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div
            ref={resultsRef}
            className="absolute top-full left-0 right-0 mt-2 bg-surface-dark border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            <div className="p-2 border-b border-white/10">
              <span className="text-xs text-gray-500 px-2">{searchResults.length}件の結果</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={result.path || index}
                  onClick={() => {
                    if (result.path) {
                      navigate(result.path)
                      setSearchQuery('')
                      setSearchResults([])
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    index === selectedIndex ? 'bg-primary/20' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <Search size={14} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{result.title}</p>
                    <p className="text-xs text-gray-500 truncate">{result.description}</p>
                  </div>
                  {index === selectedIndex && (
                    <kbd className="px-2 py-0.5 text-[10px] text-gray-400 bg-white/5 rounded">Enter</kbd>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1 app-no-drag">
        {/* Notification Bell */}
        <NotificationBell />

        {/* Settings Button - Now functional */}
        <button
          onClick={handleSettingsClick}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          title="設定 (Alt+0)"
        >
          <Settings size={18} />
        </button>

        {/* Window Controls - Only show on Windows/Linux, macOS uses native traffic lights */}
        {!isMac && (
          <>
            {/* Divider */}
            <div className="w-px h-6 bg-white/10 mx-2" />

            {/* Window Controls - Windows/Linux style */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleMinimize}
                className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors group flex items-center justify-center"
                title="最小化"
              >
                <Minus size={8} className="text-yellow-900 opacity-0 group-hover:opacity-100" />
              </button>
              <button
                onClick={handleMaximize}
                className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors group flex items-center justify-center"
                title="最大化"
              >
                <Square size={6} className="text-green-900 opacity-0 group-hover:opacity-100" />
              </button>
              <button
                onClick={handleClose}
                className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors group flex items-center justify-center"
                title="閉じる"
              >
                <X size={8} className="text-red-900 opacity-0 group-hover:opacity-100" />
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}

export default Header
