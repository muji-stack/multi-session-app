import { memo, useMemo, useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Edit,
  Calendar,
  Heart,
  Search,
  BarChart2,
  Settings,
  Globe,
  Zap,
  GitBranch,
  Image,
  Shield,
  CreditCard,
  HelpCircle,
  LogOut,
  User,
  ChevronRight,
  LucideIcon
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  path: string
  badge?: number
}

interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    id: 'main',
    label: 'メイン',
    items: [
      { id: 'dashboard', label: 'ダッシュボード', icon: LayoutDashboard, path: '/' },
      { id: 'accounts', label: 'アカウント', icon: Users, path: '/accounts' },
    ]
  },
  {
    id: 'actions',
    label: 'アクション',
    items: [
      { id: 'post', label: '一括投稿', icon: Edit, path: '/post' },
      { id: 'schedule', label: '予約投稿', icon: Calendar, path: '/schedule' },
      { id: 'engagement', label: 'エンゲージメント', icon: Heart, path: '/engagement' },
    ]
  },
  {
    id: 'tools',
    label: 'ツール',
    items: [
      { id: 'check', label: 'チェック', icon: Search, path: '/check' },
      { id: 'analytics', label: '分析', icon: BarChart2, path: '/analytics' },
      { id: 'monitoring', label: 'モニタリング', icon: Shield, path: '/monitoring' },
    ]
  },
  {
    id: 'automation',
    label: '自動化',
    items: [
      { id: 'automation', label: '自動化', icon: Zap, path: '/automation' },
      { id: 'workflows', label: 'ワークフロー', icon: GitBranch, path: '/workflows' },
    ]
  },
  {
    id: 'settings',
    label: '設定',
    items: [
      { id: 'proxies', label: 'プロキシ', icon: Globe, path: '/proxies' },
      { id: 'media', label: 'メディア', icon: Image, path: '/media' },
      { id: 'billing', label: 'プラン', icon: CreditCard, path: '/billing' },
      { id: 'settings', label: '設定', icon: Settings, path: '/settings' },
      { id: 'help', label: 'ヘルプ', icon: HelpCircle, path: '/help' },
    ]
  }
]

// Flatten for simple rendering
const navItems: NavItem[] = navGroups.flatMap(g => g.items)

// Memoized NavItem component with expanded state
const NavItemComponent = memo(function NavItemComponent({
  item,
  isExpanded
}: {
  item: NavItem
  isExpanded: boolean
}): JSX.Element {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `flex items-center h-10 rounded-xl transition-colors duration-150 ${
          isExpanded ? 'px-3 gap-3' : 'w-10 justify-center'
        } ${
          isActive
            ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/25'
            : 'text-gray-400 hover:text-white hover:bg-white/10'
        }`
      }
    >
      <Icon size={20} className="flex-shrink-0" />
      {item.badge && item.badge > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
          {item.badge > 9 ? '9+' : item.badge}
        </span>
      )}
      {isExpanded && (
        <span className="text-sm font-medium whitespace-nowrap overflow-hidden">
          {item.label}
        </span>
      )}
    </NavLink>
  )
})

// User Menu Component
const UserMenu = memo(function UserMenu({ isExpanded }: { isExpanded: boolean }): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'U'

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center h-10 rounded-xl bg-white/5 hover:bg-white/10 transition-colors duration-150 ${
          isExpanded ? 'px-3 gap-3 w-full' : 'w-10 justify-center'
        }`}
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-medium">{userInitial}</span>
        </div>
        {isExpanded && (
          <div className="flex-1 min-w-0 text-left overflow-hidden">
            <p className="text-sm font-medium text-white truncate">
              {user?.displayName || 'ユーザー'}
            </p>
          </div>
        )}
      </button>

      {/* User Menu Dropdown */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-56 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[9999]">
          {/* User Info */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span className="text-white font-medium">{userInitial}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.displayName || 'ユーザー'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email || 'ローカルユーザー'}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <button
              onClick={() => {
                navigate('/settings')
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
            >
              <User size={16} />
              <span>アカウント設定</span>
              <ChevronRight size={14} className="ml-auto text-gray-600" />
            </button>
            <button
              onClick={() => {
                navigate('/billing')
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
            >
              <CreditCard size={16} />
              <span>プランと請求</span>
              <ChevronRight size={14} className="ml-auto text-gray-600" />
            </button>
          </div>

          {/* Sign Out */}
          <div className="p-2 border-t border-white/10">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              <span>ログアウト</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
})

const Sidebar = memo(function Sidebar(): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false)
  const memoizedNavItems = useMemo(() => navItems, [])

  return (
    <aside
      className={`h-full bg-surface-dark/90 backdrop-blur-xl border-r border-white/10 flex flex-col py-4 z-[100] transition-[width] duration-200 ease-out ${
        isExpanded ? 'w-48' : 'w-16'
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo */}
      <div className={`flex items-center h-10 mb-4 ${isExpanded ? 'px-3 gap-3' : 'justify-center'}`}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25 flex-shrink-0">
          <span className="text-white font-bold text-lg">M</span>
        </div>
        {isExpanded && (
          <span className="text-white font-bold text-base whitespace-nowrap overflow-hidden">
            MultiSession
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 flex flex-col gap-1 overflow-y-auto scrollbar-hide py-2 ${
        isExpanded ? 'px-3' : 'px-3'
      }`}>
        {memoizedNavItems.map((item, index) => (
          <div key={item.id}>
            {/* Add separator between groups */}
            {(index === 2 || index === 5 || index === 8 || index === 10) && (
              <div className="h-px bg-white/10 my-2" />
            )}
            <NavItemComponent item={item} isExpanded={isExpanded} />
          </div>
        ))}
      </nav>

      {/* User Avatar with Menu */}
      <div className={`mt-auto pt-4 border-t border-white/10 ${isExpanded ? 'px-3' : 'px-3'}`}>
        <UserMenu isExpanded={isExpanded} />
      </div>
    </aside>
  )
})

export default Sidebar
