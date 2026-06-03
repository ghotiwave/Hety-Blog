import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        {
          primary: 'bg-[#8b7355] text-white hover:bg-[#6b563f]',
          secondary: 'bg-[#f0eeea] text-[#5a5a55] hover:bg-[#e8e6e0]',
          ghost: 'text-[#9a9996] hover:bg-[#f5f4f0]',
          danger: 'bg-red-400 text-white hover:bg-red-500',
        }[variant],
        {
          sm: 'px-3 py-1.5 text-sm',
          md: 'px-4 py-2 text-sm',
          lg: 'px-6 py-3 text-base',
        }[size],
        className
      )}
      {...props}
    />
  )
}
