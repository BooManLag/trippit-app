import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, checkSupabaseConnection } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    // Check Supabase connection first
    const initializeAuth = async () => {
      try {
        // Test connection
        const isConnected = await checkSupabaseConnection()
        if (!isConnected) {
          setConnectionError('Unable to connect to Supabase. Please check your internet connection and try again.')
          setLoading(false)
          return
        }

        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          setConnectionError(`Authentication error: ${error.message}`)
        } else {
          setUser(session?.user ?? null)
          setConnectionError(null)
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
        setConnectionError('Failed to initialize authentication. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event)
        setUser(session?.user ?? null)
        setLoading(false)
        setConnectionError(null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      setConnectionError(null)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      return { data, error: null }
    } catch (error: any) {
      console.error('Sign in error:', error)
      const errorMessage = error.message || 'An error occurred during sign in'
      setConnectionError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      setLoading(true)
      setConnectionError(null)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        throw error
      }

      // If sign up successful and user is confirmed, create user profile
      if (data.user && !data.user.email_confirmed_at) {
        // For development, we'll assume email confirmation is disabled
        // Create user profile immediately
        if (displayName) {
          const { error: profileError } = await supabase
            .from('users')
            .insert([
              {
                id: data.user.id,
                email: data.user.email!,
                display_name: displayName,
              },
            ])

          if (profileError) {
            console.error('Error creating user profile:', profileError)
          }
        }
      }

      return { data, error: null }
    } catch (error: any) {
      console.error('Sign up error:', error)
      const errorMessage = error.message || 'An error occurred during sign up'
      setConnectionError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      setConnectionError(null)
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw error
      }
    } catch (error: any) {
      console.error('Sign out error:', error)
      setConnectionError(error.message || 'An error occurred during sign out')
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    loading,
    connectionError,
    signIn,
    signUp,
    signOut,
  }
}