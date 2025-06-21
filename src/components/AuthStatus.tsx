import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { User, LogOut, AlertCircle, Wifi, WifiOff } from 'lucide-react'

export function AuthStatus() {
  const { user, loading, connectionError, signOut } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-600">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm">Connecting...</span>
      </div>
    )
  }

  if (connectionError) {
    return (
      <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg">
        <WifiOff className="h-4 w-4" />
        <div className="flex flex-col">
          <span className="text-sm font-medium">Connection Error</span>
          <span className="text-xs">{connectionError}</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center space-x-2 text-gray-600">
        <Wifi className="h-4 w-4 text-green-500" />
        <span className="text-sm">Connected - Not signed in</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2 text-gray-700">
        <Wifi className="h-4 w-4 text-green-500" />
        <User className="h-4 w-4" />
        <span className="text-sm font-medium">
          {user.email}
        </span>
      </div>
      <button
        onClick={signOut}
        className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  )
}