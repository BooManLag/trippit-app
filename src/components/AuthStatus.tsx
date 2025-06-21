import React, { useState, useEffect, useRef } from 'react';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface AuthStatusProps {
  className?: string;
  showSignOut?: boolean; // New prop to control sign out visibility
}

const AuthStatus: React.FC<AuthStatusProps> = ({ className = '', showSignOut = true }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      
      // If user signs out, redirect to home page
      if (event === 'SIGNED_OUT') {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setShowDropdown(false);
      // Navigate to home page after logout
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
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

  // If showSignOut is false, just show the user info without dropdown
  if (!showSignOut) {
    return (
      <div className={`flex items-center gap-2 text-green-400 ${className}`}>
        <User className="w-4 h-4" />
        <span className="pixel-text text-xs">
          {user.user_metadata?.display_name || user.email?.split('@')[0] || 'USER'}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
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
        <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800/95 backdrop-blur-sm border border-gray-600 rounded-lg shadow-lg z-[9999]">
          <div className="p-3 border-b border-gray-600">
            <div className="pixel-text text-xs text-green-400 mb-1">SIGNED IN AS</div>
            <div className="outfit-text text-sm text-white break-words">
              {user.email}
            </div>
          </div>
          
          <div className="p-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-400 hover:text-red-300 hover:bg-gray-700/50 rounded transition-colors"
            >
              <span className="outfit-text text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthStatus;