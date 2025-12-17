// Device List Component
// Shows registered devices for sync

import { Monitor, Smartphone, Trash2, Clock } from 'lucide-react'
import type { DeviceInfo } from '@shared/syncTypes'

interface DeviceListProps {
  devices: DeviceInfo[]
  onRemove: (deviceId: string) => void
  isLoading?: boolean
}

export function DeviceList({ devices, onRemove, isLoading }: DeviceListProps) {
  if (devices.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Monitor className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>登録されているデバイスはありません</p>
      </div>
    )
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'win32':
        return '🪟'
      case 'darwin':
        return '🍎'
      default:
        return '🐧'
    }
  }

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'win32':
        return 'Windows'
      case 'darwin':
        return 'macOS'
      default:
        return 'Linux'
    }
  }

  return (
    <div className="space-y-3">
      {devices.map((device) => (
        <div
          key={device.id}
          className={`flex items-center justify-between p-4 rounded-xl border ${
            device.isCurrentDevice
              ? 'bg-blue-500/10 border-blue-500/30'
              : 'bg-gray-800/50 border-gray-700'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-700 text-xl">
              {getPlatformIcon(device.platform)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-white">{device.name}</h4>
                {device.isCurrentDevice && (
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
                    このデバイス
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <span>{getPlatformName(device.platform)}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  最終アクティブ: {formatDate(device.lastActiveAt)}
                </span>
              </div>
            </div>
          </div>

          {!device.isCurrentDevice && (
            <button
              onClick={() => onRemove(device.id)}
              disabled={isLoading}
              className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              title="デバイスを削除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
