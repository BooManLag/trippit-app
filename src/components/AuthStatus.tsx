import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { User, LogOut, AlertCircle, Wifi, WifiOff } from 'lucide-react'

interface AuthStatusProps {
  className?: string;
  showSignOut?: boolean;
}

export function AuthStatus({ className = '', showSignOut = true }: AuthStatusProps) {
  const { user, loading, connectionError, signOut } = useAuth()

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 text-gray-600 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-xs sm:text-sm">Connecting...</span>
      </div>
    )
  }

  if (connectionError) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 bg-red-50 px-2 sm:px-3 py-1 sm:py-2 rounded-lg ${className}`}>
        <WifiOff className="h-3 sm:h-4 w-3 sm:w-4 flex-shrink-0" />
        <div className="flex flex-col min-w-0">
          <span className="text-xs sm:text-sm font-medium">Connection Error</span>
          <span className="text-xs break-words">{connectionError}</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={`flex items-center space-x-2 text-gray-600 ${className}`}>
        <Wifi className="h-3 sm:h-4 w-3 sm:w-4 text-green-500 flex-shrink-0" />
        <span className="text-xs sm:text-sm">Connected - Not signed in</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 sm:space-x-3 ${className}`}>
      <div className="flex items-center space-x-1 sm:space-x-2 text-gray-700 min-w-0">
        <Wifi className="h-3 sm:h-4 w-3 sm:w-4 text-green-500 flex-shrink-0" />
        <User className="h-3 sm:h-4 w-3 sm:w-4 flex-shrink-0" />
        <span className="text-xs sm:text-sm font-medium truncate">
          {user.email}
        </span>
      </div>
      {showSignOut && (
        <button
          onClick={signOut}
          className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors p-1 flex-shrink-0"
          title="Sign out"
        >
          <LogOut className="h-3 sm:h-4 w-3 sm:w-4" />
        </button>
      )}
    </div>
  )
}