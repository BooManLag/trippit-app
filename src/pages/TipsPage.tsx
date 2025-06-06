import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Filter, Loader2, ExternalLink, ArrowLeft, Search, Shield, Key } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RedditTip {
  id: string;
  category: string;
  title: string;
  content: string;
  source: string;
  reddit_url: string;
  score: number;
  created_at: string;
}

const TipsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId');
  
  const [redditTips, setRedditTips] = useState<RedditTip[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [trip, setTrip] = useState<any>(null);
  const [bearerToken, setBearerToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);

  useEffect(() => {
    // Check if user has stored bearer token
    const storedToken = localStorage.getItem('reddit_bearer_token');
    if (storedToken) {
      setBearerToken(storedToken);
    }
  }, []);

  useEffect(() => {
    const fetchTripAndTips = async () => {
      if (!tripId) return;

      try {
        setLoading(true);
        
        // Fetch trip details
        const { data: tripData } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .single();

        if (tripData) {
          setTrip(tripData);
          const [city, country] = tripData.destination.split(', ');
          
          // Fetch Reddit tips with optional bearer token
          const headers: Record<string, string> = {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          };

          // Add Reddit bearer token if available
          const storedToken = localStorage.getItem('reddit_bearer_token');
          if (storedToken) {
            headers['x-reddit-token'] = storedToken;
          }

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-reddit-tips`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({ city, country }),
            }
          );

          if (response.ok) {
            const tips = await response.json();
            setRedditTips(tips);
          } else {
            console.error('Failed to fetch tips:', response.status);
          }
        }
      } catch (error) {
        console.error('Error fetching tips:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTripAndTips();
  }, [tripId]);

  const handleSaveToken = () => {
    if (bearerToken.trim()) {
      localStorage.setItem('reddit_bearer_token', bearerToken.trim());
      setShowTokenInput(false);
      // Refresh tips with the new token
      window.location.reload();
    }
  };

  const handleRemoveToken = () => {
    localStorage.removeItem('reddit_bearer_token');
    setBearerToken('');
    // Refresh tips without token
    window.location.reload();
  };

  // Get unique categories from Reddit tips
  const categories = ['All', ...Array.from(new Set(redditTips.map(tip => tip.category)))];

  // Filter tips
  const filteredTips = redditTips.filter(tip => {
    const matchesCategory = filter === 'All' || tip.category === filter;
    const matchesSearch = searchTerm === '' || 
      tip.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tip.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'Documents': '📄',
      'Safety': '🛡️',
      'Budget': '💰',
      'Culture': '🌍',
      'Food': '🍽️',
      'Transport': '🚌',
      'Technology': '📱',
      'Health': '💊',
      'Packing': '🎒',
      'Accommodation': '🏨',
      'Planning': '📋',
      'Mindset': '🧠',
      'Things to Do': '🎯',
      'General': '💡'
    };
    return icons[category] || '💡';
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Documents': 'text-blue-400',
      'Safety': 'text-red-400',
      'Budget': 'text-green-400',
      'Culture': 'text-purple-400',
      'Food': 'text-yellow-400',
      'Transport': 'text-teal-400',
      'Technology': 'text-cyan-400',
      'Health': 'text-pink-400',
      'Packing': 'text-orange-400',
      'Accommodation': 'text-indigo-400',
      'Planning': 'text-gray-400',
      'Mindset': 'text-emerald-400',
      'Things to Do': 'text-violet-400',
      'General': 'text-blue-400'
    };
    return colors[category] || 'text-blue-400';
  };

  const hasStoredToken = !!localStorage.getItem('reddit_bearer_token');

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => tripId ? navigate(`/trip/${tripId}`) : navigate('/')} 
              className="text-blue-400 hover:text-blue-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h2 className="pixel-text text-2xl">CITY TIPS</h2>
              {trip && (
                <p className="outfit-text text-gray-400 mt-1">
                  Real traveler advice for {trip.destination}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {hasStoredToken ? (
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="pixel-text text-sm text-green-400">ENHANCED</span>
                <button
                  onClick={handleRemoveToken}
                  className="pixel-button-secondary text-sm bg-red-600 hover:bg-red-500"
                >
                  DISCONNECT
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTokenInput(true)}
                className="pixel-button-secondary flex items-center gap-2 bg-orange-600 hover:bg-orange-500"
              >
                <Key className="w-4 h-4" />
                ADD TOKEN
              </button>
            )}
          </div>
        </div>

        {/* Token Input Modal */}
        {showTokenInput && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="pixel-card max-w-md w-full">
              <h3 className="pixel-text text-lg mb-4">ADD REDDIT BEARER TOKEN</h3>
              <p className="outfit-text text-gray-400 mb-4 text-sm">
                Paste your Reddit API bearer token to get enhanced access to more tips and avoid rate limits.
              </p>
              <input
                type="password"
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                placeholder="Paste your bearer token here..."
                className="w-full px-4 py-3 bg-gray-800 border border-blue-500/20 text-white rounded-none outline-none mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTokenInput(false)}
                  className="pixel-button-secondary flex-1"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSaveToken}
                  className="pixel-button-primary flex-1"
                >
                  SAVE TOKEN
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reddit Connection Status */}
        {!hasStoredToken && (
          <div className="pixel-card bg-orange-900/20 p-4 mb-6 border-2 border-orange-500/20">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-orange-400" />
              <div>
                <h3 className="pixel-text text-sm text-orange-400">ENHANCED TIPS AVAILABLE</h3>
                <p className="outfit-text text-sm text-gray-300 mt-1">
                  Add your Reddit bearer token to access more detailed tips and avoid rate limits.
                </p>
              </div>
              <button
                onClick={() => setShowTokenInput(true)}
                className="pixel-button-secondary text-sm bg-orange-600 hover:bg-orange-500"
              >
                ADD TOKEN
              </button>
            </div>
          </div>
        )}

        {hasStoredToken && (
          <div className="pixel-card bg-green-900/20 p-4 mb-6 border-2 border-green-500/20">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-green-400" />
              <div>
                <h3 className="pixel-text text-sm text-green-400">REDDIT TOKEN ACTIVE</h3>
                <p className="outfit-text text-sm text-gray-300 mt-1">
                  You're getting enhanced tips with your Reddit bearer token!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="pixel-card bg-gray-900 p-6 mb-8 border-2 border-blue-500/20">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tips..."
                className="w-full px-4 pr-10 py-3 bg-gray-800 border border-blue-500/20 text-white rounded-none outline-none"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-4 py-3 bg-gray-800 border border-blue-500/20 text-white hover:border-blue-500/40 transition-colors min-w-[160px] justify-between"
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <span className="outfit-text">{filter}</span>
                </div>
                <span className="text-blue-400">▼</span>
              </button>

              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-blue-500/20 z-10 max-h-60 overflow-auto">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => {
                        setFilter(category);
                        setShowDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <span>{category !== 'All' ? getCategoryIcon(category) : '🌟'}</span>
                      <span className="outfit-text">{category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="pixel-text text-sm text-green-400">
              🔥 {filteredTips.length} tips found
            </span>
            <span className="pixel-text text-sm text-blue-400">
              • Real traveler experiences
            </span>
            {hasStoredToken && (
              <span className="pixel-text text-sm text-orange-400">
                • Enhanced with bearer token
              </span>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mr-3" />
            <span className="pixel-text text-blue-400">GATHERING WISDOM...</span>
          </div>
        )}

        {/* Tips Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTips.map(tip => (
            <div 
              key={tip.id} 
              className="pixel-card bg-gray-900 p-6 border-2 border-blue-500/20 hover:border-blue-500/40 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getCategoryIcon(tip.category)}</span>
                  <div>
                    <span className={`pixel-text text-sm ${getCategoryColor(tip.category)}`}>
                      {tip.category}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="pixel-text text-xs text-green-400">{tip.source}</span>
                      <span className="pixel-text text-xs text-yellow-400">↑{tip.score}</span>
                    </div>
                  </div>
                </div>
                {tip.reddit_url !== '#' && (
                  <a 
                    href={tip.reddit_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-blue-400 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              <h3 className="outfit-text font-semibold text-white mb-3 leading-tight">
                {tip.title}
              </h3>

              <p className="outfit-text text-gray-300 text-sm leading-relaxed">
                {tip.content}
              </p>

              <div className="mt-4 pt-3 border-t border-gray-700">
                <span className="pixel-text text-xs text-gray-500">
                  {tip.source === 'Trippit' ? 'Trippit Tips' : 'From Reddit'} • {new Date(tip.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredTips.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="pixel-text text-lg text-gray-400 mb-2">NO TIPS FOUND</h3>
            <p className="outfit-text text-gray-500">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}

        {/* Attribution */}
        {redditTips.length > 0 && (
          <div className="pixel-card bg-gray-900/30 p-4 mt-8 border border-gray-700">
            <div className="text-center">
              <p className="outfit-text text-gray-500 text-sm">
                💡 Tips sourced from Reddit communities • 
                <a 
                  href="https://reddit.com/r/travel" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 ml-1"
                >
                  Join the conversation
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TipsPage;