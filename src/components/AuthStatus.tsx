import React, { useState, useEffect } from 'react';
import { User, LogOut, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthStatusProps {
  className?: string;
}

const AuthStatus: React.FC<AuthStatusProps> = ({ className = '' }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Get initial user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setShowDropdown(false);
  };

  if (loading) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="w-8 h-8 bg-gray-700 rounded-full animate-pulse"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="flex items-center gap-2 text-gray-400">
          <User className="w-4 h-4" />
          <span className="pixel-text text-xs">GUEST</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
      >
        <User className="w-4 h-4" />
        <span className="pixel-text text-xs">
          {user.user_metadata?.display_name || user.email?.split('@')[0] || 'USER'}
        </span>
      </button>

      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-gray-600">
            <div className="pixel-text text-xs text-green-400 mb-1">SIGNED IN AS</div>
            <div className="outfit-text text-sm text-white break-words">
              {user.email}
            </div>
          </div>
          
          <div className="p-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-400 hover:text-red-300 hover:bg-gray-700 rounded transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="outfit-text text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthStatus;