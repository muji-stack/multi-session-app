// Trial Badge Component
// Shows trial period status badge

import { Clock } from 'lucide-react'

interface TrialBadgeProps {
  daysRemaining: number | null
  className?: string
}

export function TrialBadge({ daysRemaining, className = '' }: TrialBadgeProps) {
  if (daysRemaining === null) return null

  const isUrgent = daysRemaining <= 3
  const isWarning = daysRemaining <= 7

  const colorClasses = isUrgent
    ? 'bg-red-500/20 text-red-400 border-red-500/50'
    : isWarning
      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      : 'bg-blue-500/20 text-blue-400 border-blue-500/50'

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${colorClasses} ${className}`}
    >
      <Clock className="h-3 w-3" />
      <span>
        トライアル残り{daysRemaining}日
      </span>
    </div>
  )
}
