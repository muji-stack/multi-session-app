import { forwardRef, HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hoverable?: boolean
  clickable?: boolean
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, hoverable = false, clickable = false, className = '', ...props }, ref) => {
    const baseStyles = 'bg-surface-dark rounded-xl border border-white/10'
    const hoverStyles = hoverable ? 'hover:border-white/20 transition-colors' : ''
    const clickStyles = clickable ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${hoverStyles} ${clickStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-4 py-3 border-b border-white/10 ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <div ref={ref} className={`p-4 ${className}`} {...props}>
        {children}
      </div>
    )
  }
)

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-4 py-3 border-t border-white/10 ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'
CardHeader.displayName = 'CardHeader'
CardContent.displayName = 'CardContent'
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardContent, CardFooter }
export default Card
