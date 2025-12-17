import { useEffect, ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

interface AuthGuardProps {
  children: ReactNode
}

// Public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/forgot-password']

function AuthGuard({ children }: AuthGuardProps): JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isLoading, isAuthAvailable, initialize, setupListeners } = useAuthStore()

  useEffect(() => {
    initialize()
    const cleanup = setupListeners()
    return cleanup
  }, [initialize, setupListeners])

  useEffect(() => {
    if (isLoading) return

    const isPublicRoute = publicRoutes.includes(location.pathname)

    if (!isAuthenticated && !isPublicRoute) {
      // Redirect to login if not authenticated and trying to access protected route
      navigate('/login', { replace: true, state: { from: location.pathname } })
    } else if (isAuthenticated && isPublicRoute) {
      // Redirect to dashboard if authenticated and trying to access public route
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, isLoading, location.pathname, navigate])

  // Show loading screen while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-400">読み込み中...</p>
        </div>
      </div>
    )
  }

  // Show info if auth is not configured
  if (!isAuthAvailable && publicRoutes.includes(location.pathname)) {
    // If auth is not available and user is on public route, redirect to main app
    navigate('/', { replace: true })
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-400">読み込み中...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default AuthGuard
