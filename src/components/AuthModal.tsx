import React, { useState } from 'react';
import { X, Loader2, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });
        if (error) throw error;
        onSuccess();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        onSuccess();
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="pixel-card max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-500/20 mb-4">
            <Mail className="h-8 w-8 text-blue-500" />
          </div>
          <h2 className="pixel-text text-2xl mb-2">
            {isSignUp ? 'CREATE ACCOUNT' : 'WELCOME BACK'}
          </h2>
          <p className="outfit-text text-gray-400">
            {isSignUp
              ? 'Join us to save your trips and track your progress'
              : 'Sign in to access your saved trips and checklists'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block pixel-text text-sm mb-2 text-blue-400">
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border-2 border-blue-500/20 text-white rounded-none focus:outline-none focus:border-blue-500/50"
              required
            />
          </div>

          <div>
            <label className="block pixel-text text-sm mb-2 text-blue-400">
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border-2 border-blue-500/20 text-white rounded-none focus:outline-none focus:border-blue-500/50"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm outfit-text">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="pixel-button-primary w-full flex items-center justify-center"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              isSignUp ? 'SIGN UP' : 'SIGN IN'
            )}
          </button>

          <div className="text-center outfit-text">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-400 hover:text-blue-300"
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