import { forwardRef, InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className = '', type = 'text', ...props }, ref) => {
    const baseStyles =
      'w-full h-10 bg-white/5 border rounded-xl text-white placeholder-gray-500 transition-all focus:outline-none'
    const normalStyles = 'border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50'
    const errorStyles = 'border-error/50 focus:border-error focus:ring-1 focus:ring-error/50'
    const paddingStyles = leftIcon ? 'pl-10' : 'pl-4'
    const rightPaddingStyles = rightIcon ? 'pr-10' : 'pr-4'

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            type={type}
            className={`${baseStyles} ${error ? errorStyles : normalStyles} ${paddingStyles} ${rightPaddingStyles} ${className}`}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
