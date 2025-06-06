import React, { useState } from 'react';
import { X, ExternalLink, Shield, Info } from 'lucide-react';

interface RedditAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RedditAuthModal: React.FC<RedditAuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleRedditAuth = () => {
    setLoading(true);
    
    // Generate a random state for security
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('reddit_oauth_state', state);
    
    const clientId = import.meta.env.VITE_REDDIT_CLIENT_ID || 'your_reddit_client_id';
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/reddit/callback`);
    const scopes = encodeURIComponent('read identity');
    
    const authUrl = `https://www.reddit.com/api/v1/authorize?` +
      `client_id=${clientId}` +
      `&response_type=code` +
      `&state=${state}` +
      `&redirect_uri=${redirectUri}` +
      `&duration=permanent` +
      `&scope=${scopes}`;
    
    window.location.href = authUrl;
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
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-orange-500/20 mb-4">
            <Shield className="h-8 w-8 text-orange-500" />
          </div>
          <h2 className="pixel-text text-2xl mb-2">
            REDDIT ACCESS REQUIRED
          </h2>
          <p className="outfit-text text-gray-400">
            To get the best travel tips, we need to access Reddit's API
          </p>
        </div>

        <div className="pixel-card bg-gray-800/50 border-blue-500/10 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <Info className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <h3 className="pixel-text text-sm text-blue-400 mb-2">WHY WE NEED THIS</h3>
              <ul className="outfit-text text-sm text-gray-300 space-y-1">
                <li>• Access real traveler experiences from Reddit</li>
                <li>• Get location-specific tips and advice</li>
                <li>• Ensure reliable API access without rate limits</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 pt-4">
            <h3 className="pixel-text text-sm text-green-400 mb-2">WHAT WE ACCESS</h3>
            <p className="outfit-text text-sm text-gray-300">
              Only public posts and basic profile info. We never post or comment on your behalf.
            </p>
          </div>
        </div>

        <button
          onClick={handleRedditAuth}
          disabled={loading}
          className="pixel-button-primary w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500"
        >
          <ExternalLink className="w-5 h-5" />
          {loading ? 'REDIRECTING...' : 'CONNECT WITH REDDIT'}
        </button>

        <p className="outfit-text text-xs text-gray-500 text-center mt-4">
          You'll be redirected to Reddit to authorize access. You can revoke this anytime in your Reddit settings.
        </p>
      </div>
    </div>
  );
};

export default RedditAuthModal;