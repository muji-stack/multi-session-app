import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import MainLayout from '@components/layout/MainLayout'
import { ToastContainer } from '@components/ui/Toast'
import ShortcutHelpModal from '@components/ui/ShortcutHelpModal'
import ErrorBoundary from '@components/ui/ErrorBoundary'
import LockScreen from '@components/security/LockScreen'
import AuthGuard from '@components/auth/AuthGuard'
import { LicenseBanner } from '@components/license'
import Login from '@pages/Login'
import Register from '@pages/Register'
import ForgotPassword from '@pages/ForgotPassword'
import Dashboard from '@pages/Dashboard'
import Accounts from '@pages/Accounts'
import Post from '@pages/Post'
import Schedule from '@pages/Schedule'
import Engagement from '@pages/Engagement'
import Check from '@pages/Check'
import Analytics from '@pages/Analytics'
import Proxies from '@pages/Proxies'
import Automation from '@pages/Automation'
import Workflows from '@pages/Workflows'
import Media from '@pages/Media'
import Monitoring from '@pages/Monitoring'
import Settings from '@pages/Settings'
import Billing from '@pages/Billing'
import Help from '@pages/Help'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useSecurityStore } from './stores/securityStore'
import { useLicenseStore, setupLicenseListener } from './stores/licenseStore'
import { useAuthStore } from './stores/authStore'

function ProtectedContent(): JSX.Element {
  const [showShortcutHelp, setShowShortcutHelp] = useState(false)
  const { isLocked, initialize, setupListeners } = useSecurityStore()
  const { license, fetchLicense, fetchFeatureAccess } = useLicenseStore()
  const { user } = useAuthStore()

  useKeyboardShortcuts(() => setShowShortcutHelp(true))

  // Initialize security state on mount
  useEffect(() => {
    initialize()
    const cleanup = setupListeners()
    return cleanup
  }, [initialize, setupListeners])

  // Initialize license state on mount
  useEffect(() => {
    const userId = user?.uid || 'local-user'
    fetchLicense(userId)
    fetchFeatureAccess(userId)

    // Setup license status change listener
    const cleanup = setupLicenseListener()
    return cleanup
  }, [user?.uid, fetchLicense, fetchFeatureAccess])

  // Show lock screen if app is locked
  if (isLocked) {
    return (
      <>
        <LockScreen />
        <ToastContainer />
      </>
    )
  }

  return (
    <>
      <div className="flex flex-col h-screen">
        {/* License Banner - Shows at top when needed */}
        <LicenseBanner license={license} />

        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/post" element={<Post />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/engagement" element={<Engagement />} />
            <Route path="/check" element={<Check />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/proxies" element={<Proxies />} />
            <Route path="/automation" element={<Automation />} />
            <Route path="/workflows" element={<Workflows />} />
            <Route path="/media" element={<Media />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/help" element={<Help />} />
          </Routes>
        </MainLayout>
      </div>
      <ToastContainer />
      <ShortcutHelpModal isOpen={showShortcutHelp} onClose={() => setShowShortcutHelp(false)} />
    </>
  )
}

function AppContent(): JSX.Element {
  return (
    <AuthGuard>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected routes */}
        <Route path="/*" element={<ProtectedContent />} />
      </Routes>
    </AuthGuard>
  )
}

function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </ErrorBoundary>
  )
}

export default App
