import React, { useState } from 'react';
import { X, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isSignUp) {
        // Sign up the user
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email.split('@')[0]
            }
          }
        });

        if (signUpError) {
          throw signUpError;
        }

        if (data.user) {
          // User was created successfully
          setSuccess('Account created successfully! You can now sign in.');
          setIsSignUp(false);
          setEmail('');
          setPassword('');
          setDisplayName('');
        }
      } else {
        // Sign in the user
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          throw signInError;
        }

        if (data.user) {
          // Check if user profile exists in our users table using maybeSingle()
          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Error checking user profile:', profileError);
            // Continue with authentication even if profile check fails
          }

          if (!userProfile) {
            // User doesn't exist in our users table, create it
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: data.user.id,
                email: data.user.email!,
                display_name: data.user.user_metadata?.display_name || data.user.email!.split('@')[0]
              });

            if (insertError) {
              console.error('Error creating user profile:', insertError);
              // Don't throw here, user is still authenticated
            }
          }

          onSuccess();
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setError(error.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="pixel-card max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-3 sm:top-4 right-3 sm:right-4 text-gray-400 hover:text-white"
        >
          <X className="w-4 sm:w-5 h-4 sm:h-5" />
        </button>

        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center h-12 sm:h-16 w-12 sm:w-16 rounded-full bg-blue-500/20 mb-4">
            <Mail className="h-6 sm:h-8 w-6 sm:w-8 text-blue-500" />
          </div>
          <h2 className="pixel-text text-base sm:text-xl mb-2">
            {isSignUp ? 'CREATE ACCOUNT' : 'WELCOME BACK'}
          </h2>
          <p className="outfit-text text-gray-400 text-sm sm:text-base">
            {isSignUp
              ? 'Join us to save your trips and track your progress'
              : 'Sign in to access your saved trips and checklists'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mobile-space-y">
          {isSignUp && (
            <div>
              <label className="block pixel-text text-xs sm:text-sm mb-2 text-blue-400">
                DISPLAY NAME
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full input-pixel"
                placeholder="Your name (optional)"
              />
            </div>
          )}

          <div>
            <label className="block pixel-text text-xs sm:text-sm mb-2 text-blue-400">
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full input-pixel"
              required
            />
          </div>

          <div>
            <label className="block pixel-text text-xs sm:text-sm mb-2 text-blue-400">
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full input-pixel"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="text-sm outfit-text text-red-500 break-words p-3 bg-red-500/10 border border-red-500/20 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm outfit-text text-green-500 break-words p-3 bg-green-500/10 border border-green-500/20 rounded">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="pixel-button-primary w-full flex items-center justify-center mobile-gap"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 sm:w-5 h-4 sm:h-5 animate-spin" />
                <span>PROCESSING...</span>
              </>
            ) : (
              <span>{isSignUp ? 'SIGN UP' : 'SIGN IN'}</span>
            )}
          </button>

          <div className="text-center outfit-text">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccess(null);
              }}
              className="text-blue-400 hover:text-blue-300 text-sm sm:text-base underline"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;