import { forwardRef, SelectHTMLAttributes, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', ...props }, ref) => {
    const baseStyles =
      'w-full h-10 bg-[#1a1a1a] border rounded-xl text-white appearance-none cursor-pointer transition-all focus:outline-none pl-4 pr-10'
    const normalStyles = 'border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50'
    const errorStyles = 'border-error/50 focus:border-error focus:ring-1 focus:ring-error/50'

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`${baseStyles} ${error ? errorStyles : normalStyles} ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="bg-[#1a1a1a] text-white">
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} className="bg-[#1a1a1a] text-white">
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>
        {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'

export default Select
