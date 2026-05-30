import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'gold' | 'navy' | 'green' | 'red' | 'yellow' | 'slate' | 'purple'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'slate', size = 'sm', className = '' }: BadgeProps) {
  const variantClasses = {
    gold: 'bg-[#C8A96E]/20 text-[#C8A96E] border border-[#C8A96E]/30',
    navy: 'bg-[#1E3A5F]/50 text-blue-300 border border-[#1E3A5F]',
    green: 'bg-green-500/20 text-green-400 border border-green-500/30',
    red: 'bg-red-500/20 text-red-400 border border-red-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    slate: 'bg-slate-700/50 text-slate-300 border border-slate-600',
    purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  }

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  )
}
