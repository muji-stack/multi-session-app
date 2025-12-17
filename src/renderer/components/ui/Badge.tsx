import { ReactNode } from 'react'

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral'
  size?: 'sm' | 'md'
  children: ReactNode
  className?: string
}

function Badge({
  variant = 'neutral',
  size = 'md',
  children,
  className = ''
}: BadgeProps): JSX.Element {
  const variants = {
    success: 'bg-success/20 text-success border-success/30',
    warning: 'bg-warning/20 text-warning border-warning/30',
    error: 'bg-error/20 text-error border-error/30',
    info: 'bg-primary/20 text-primary border-primary/30',
    neutral: 'bg-white/10 text-gray-300 border-white/20'
  }

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs'
  }

  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  )
}

export default Badge
