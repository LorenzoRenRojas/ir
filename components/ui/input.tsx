import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helper?: string
}

export function Input({ label, error, helper, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-4 py-2.5 bg-slate-900 border ${error ? 'border-red-500' : 'border-slate-700'} rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C8A96E] focus:border-transparent transition-colors ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      {helper && !error && <p className="text-sm text-slate-500">{helper}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helper?: string
}

export function Textarea({ label, error, helper, className = '', id, ...props }: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`w-full px-4 py-2.5 bg-slate-900 border ${error ? 'border-red-500' : 'border-slate-700'} rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C8A96E] focus:border-transparent transition-colors resize-none ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      {helper && !error && <p className="text-sm text-slate-500">{helper}</p>}
    </div>
  )
}
