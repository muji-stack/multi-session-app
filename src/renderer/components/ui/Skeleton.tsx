import { memo } from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

const Skeleton = memo(function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}: SkeletonProps): JSX.Element {
  const baseClasses = 'bg-white/10'

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-xl'
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  }

  const style: React.CSSProperties = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1em' : undefined)
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  )
})

// Preset skeleton components
export const SkeletonText = memo(function SkeletonText({
  lines = 1,
  className = ''
}: {
  lines?: number
  className?: string
}): JSX.Element {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          height={16}
          width={i === lines - 1 && lines > 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  )
})

export const SkeletonAvatar = memo(function SkeletonAvatar({
  size = 40,
  className = ''
}: {
  size?: number
  className?: string
}): JSX.Element {
  return (
    <Skeleton
      variant="circular"
      width={size}
      height={size}
      className={className}
    />
  )
})

export const SkeletonCard = memo(function SkeletonCard({
  className = ''
}: {
  className?: string
}): JSX.Element {
  return (
    <div className={`bg-surface-dark rounded-xl border border-white/10 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <SkeletonAvatar size={48} />
        <div className="flex-1">
          <Skeleton variant="text" width="60%" height={20} className="mb-2" />
          <Skeleton variant="text" width="40%" height={14} />
        </div>
      </div>
      <div className="mt-4">
        <SkeletonText lines={2} />
      </div>
    </div>
  )
})

export const SkeletonTable = memo(function SkeletonTable({
  rows = 5,
  columns = 4,
  className = ''
}: {
  rows?: number
  columns?: number
  className?: string
}): JSX.Element {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-white/10">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" width={`${100 / columns}%`} height={16} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" width={`${100 / columns}%`} height={20} />
          ))}
        </div>
      ))}
    </div>
  )
})

export const SkeletonList = memo(function SkeletonList({
  count = 3,
  className = ''
}: {
  count?: number
  className?: string
}): JSX.Element {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-surface-dark rounded-xl border border-white/10">
          <SkeletonAvatar size={40} />
          <div className="flex-1">
            <Skeleton variant="text" width="50%" height={16} className="mb-1" />
            <Skeleton variant="text" width="30%" height={12} />
          </div>
          <Skeleton variant="rounded" width={60} height={24} />
        </div>
      ))}
    </div>
  )
})

export default Skeleton
