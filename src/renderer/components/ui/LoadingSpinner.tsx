import { memo } from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  text?: string
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48
}

const LoadingSpinner = memo(function LoadingSpinner({
  size = 'md',
  className = '',
  text
}: LoadingSpinnerProps): JSX.Element {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2
        size={sizeMap[size]}
        className="animate-spin text-primary"
      />
      {text && <p className="text-gray-400 text-sm">{text}</p>}
    </div>
  )
})

// Full page loading overlay
export const FullPageLoader = memo(function FullPageLoader({
  text = '読み込み中...'
}: {
  text?: string
}): JSX.Element {
  return (
    <div className="fixed inset-0 bg-background-dark/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-surface-dark rounded-2xl border border-white/10 p-8 text-center">
        <LoadingSpinner size="xl" text={text} />
      </div>
    </div>
  )
})

// Inline loading state
export const InlineLoader = memo(function InlineLoader({
  text = '読み込み中...'
}: {
  text?: string
}): JSX.Element {
  return (
    <div className="flex items-center gap-2 text-gray-400">
      <Loader2 size={14} className="animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  )
})

// Section loading state
export const SectionLoader = memo(function SectionLoader({
  height = '200px',
  text
}: {
  height?: string
  text?: string
}): JSX.Element {
  return (
    <div
      className="flex items-center justify-center bg-surface-dark/50 rounded-xl border border-white/10"
      style={{ height }}
    >
      <LoadingSpinner size="lg" text={text} />
    </div>
  )
})

// Button loading state helper
export const ButtonLoader = memo(function ButtonLoader({
  size = 'sm'
}: {
  size?: 'sm' | 'md'
}): JSX.Element {
  return (
    <Loader2
      size={size === 'sm' ? 14 : 16}
      className="animate-spin"
    />
  )
})

export default LoadingSpinner
