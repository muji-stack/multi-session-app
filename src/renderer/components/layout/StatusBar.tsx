import { useEffect } from 'react'
import { CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react'
import { useAccountStore } from '../../stores/accountStore'

function StatusBar(): JSX.Element {
  const { stats, fetchStats } = useAccountStore()
  const syncStatus = 'synced'
  const version = '1.0.0'

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return (
    <footer className="h-8 bg-surface-dark/50 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-4 text-xs">
      {/* Account Status Summary */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-success">
          <CheckCircle size={12} />
          <span>正常: {stats.normal}</span>
        </div>
        <div className="flex items-center gap-1.5 text-warning">
          <AlertTriangle size={12} />
          <span>ロック: {stats.locked}</span>
        </div>
        <div className="flex items-center gap-1.5 text-error">
          <XCircle size={12} />
          <span>凍結: {stats.suspended}</span>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4 text-gray-400">
        {/* Sync Status */}
        <div className="flex items-center gap-1.5">
          <RefreshCw size={12} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
          <span>{syncStatus === 'synced' ? '同期済み' : '同期中...'}</span>
        </div>

        {/* Version */}
        <span>v{version}</span>
      </div>
    </footer>
  )
}

export default StatusBar
