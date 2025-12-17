import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import StatusBar from './StatusBar'

interface MainLayoutProps {
  children: ReactNode
}

function MainLayout({ children }: MainLayoutProps): JSX.Element {
  return (
    <div className="h-screen bg-background-dark text-white flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header />

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>

        {/* Status Bar */}
        <StatusBar />
      </div>
    </div>
  )
}

export default MainLayout
