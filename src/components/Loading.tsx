import React from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className="animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400"></div>
    </div>
  )
}

interface LoadingOverlayProps {
  message?: string
  className?: string
}

export function LoadingOverlay({ message, className = '' }: LoadingOverlayProps) {
  const { t } = useLanguage()
  const displayMessage = message || t('common.loading')
  return (
    <div className={`
      fixed inset-0 bg-gray-500/30 backdrop-blur-sm z-50
      flex items-center justify-center
      ${className}
    `}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mx-4 max-w-xs w-full">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}

interface LoadingStateProps {
  loading: boolean
  message?: string
  children: React.ReactNode
}

export function LoadingState({ loading, message, children }: LoadingStateProps) {
  const { t } = useLanguage()
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <LoadingSpinner size="lg" className="mb-4" />
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {message || t('common.loading')}
        </p>
      </div>
    )
  }

  return <>{children}</>
}

interface ButtonLoadingProps {
  loading: boolean
  children: React.ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export function ButtonLoading({ 
  loading, 
  children, 
  className = '', 
  disabled = false,
  onClick,
  type = 'button'
}: ButtonLoadingProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`
        relative inline-flex items-center justify-center
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-opacity duration-200
        ${className}
      `}
    >
      {loading && (
        <LoadingSpinner size="sm" className="absolute" />
      )}
      <span className={loading ? 'opacity-0' : 'opacity-100'}>
        {children}
      </span>
    </button>
  )
}
