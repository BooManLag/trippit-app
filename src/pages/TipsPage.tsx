import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Filter, Loader2, ExternalLink, ArrowLeft, Search, Lightbulb, Star, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthStatus } from '../components/AuthStatus';

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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [trip, setTrip] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [tipsError, setTipsError] = useState<string | null>(null);

  useEffect(() => {
    setIsVisible(true);
    setPageLoading(true);
    
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchTripAndTips = async () => {
      if (!tripId) return;

      try {
        // Fetch trip details
        const { data: tripData } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .single();

        if (tripData) {
          setTrip(tripData);
          const [city, country] = tripData.destination.split(', ');
          
          // Only show loading if we don't have tips yet
          if (redditTips.length === 0) {
            setLoading(true);
          }
          
          // Fetch Reddit tips
          try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseAnonKey) {
              console.warn('Missing Supabase environment variables - tips feature disabled');
              setTipsError('Configuration missing');
              setRedditTips([]);
              setLoading(false);
              return;
            }

            // Check if the URL is a placeholder
            if (supabaseUrl.includes('your-project') || supabaseUrl === 'https://your-project-id.supabase.co') {
              console.warn('Supabase URL appears to be a placeholder value - tips feature disabled');
              setTipsError('Configuration incomplete');
              setRedditTips([]);
              setLoading(false);
              return;
            }

            const functionUrl = `${supabaseUrl}/functions/v1/get-reddit-tips`;
            
            console.log('Attempting to fetch Reddit tips from:', functionUrl);

            // Add timeout and better error handling
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(functionUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ city, country }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorText = await response.text().catch(() => 'Unable to read error response');
              console.warn('Edge function response error:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
              });
              
              // If it's a 404, the function doesn't exist
              if (response.status === 404) {
                console.warn('get-reddit-tips Edge Function not found. Tips feature disabled.');
                setTipsError('Function not deployed');
                setRedditTips([]);
                setLoading(false);
                return;
              }
              
              setTipsError(`Service error (${response.status})`);
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const tips = await response.json();
            setRedditTips(tips);
            setTipsError(null);
          } catch (fetchError: any) {
            console.error('Error fetching tips from edge function:', fetchError);
            
            if (fetchError.name === 'AbortError') {
              setTipsError('Request timeout');
            } else if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
              const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname.includes('webcontainer');
              if (isDevelopment) {
                setTipsError('Development mode - function unavailable');
              } else {
                setTipsError('Connection failed');
              }
            } else {
              setTipsError('Service unavailable');
            }
            
            setRedditTips([]);
          }
        }
      } catch (error) {
        console.error('Error fetching trip:', error);
        setTipsError('Failed to load trip data');
      } finally {
        setLoading(false);
      }
    };

    fetchTripAndTips();
  }, [tripId]);

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
      'General': '💡',
      'Weather': '🌤️'
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
      'General': 'text-blue-400',
      'Weather': 'text-sky-400'
    };
    return colors[category] || 'text-blue-400';
  };

  const getTipsErrorMessage = () => {
    switch (tipsError) {
      case 'Configuration missing':
        return 'Supabase configuration is missing';
      case 'Configuration incomplete':
        return 'Supabase configuration is incomplete';
      case 'Function not deployed':
        return 'Tips service is not deployed';
      case 'Connection failed':
        return 'Unable to connect to tips service';
      case 'Network error':
        return 'Network connectivity issue detected';
      case 'Development mode - function unavailable':
        return 'Tips service unavailable in development mode';
      case 'Request timeout':
        return 'Tips service request timed out';
      case 'Service unavailable':
        return 'Tips service is temporarily unavailable';
      default:
        return 'Tips service is currently unavailable';
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="pixel-text text-blue-400">LOADING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white mobile-padding py-6 sm:py-8 lg:py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-2 h-2 bg-yellow-500 rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-32 right-20 w-1 h-1 bg-blue-400 rounded-full animate-ping opacity-40"></div>
        <div className="absolute bottom-40 left-1/4 w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce opacity-50"></div>
        <div className="absolute top-1/2 right-10 w-1 h-1 bg-green-400 rounded-full animate-pulse opacity-30"></div>
        <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-pink-500 rounded-full animate-ping opacity-40"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className={`flex items-center justify-between mb-6 sm:mb-8 lg:mb-12 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <button 
              onClick={() => tripId ? navigate(`/trip/${tripId}`) : navigate('/')} 
              className="text-blue-400 hover:text-blue-300 transition-colors hover:scale-110 flex-shrink-0"
            >
              <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Lightbulb className="w-6 sm:w-8 h-6 sm:h-8 text-yellow-400 animate-pulse flex-shrink-0" />
                <h2 className="pixel-text mobile-heading text-yellow-400 glow-text">CITY WISDOM</h2>
                <Globe className="w-6 sm:w-8 h-6 sm:h-8 text-blue-400 animate-float flex-shrink-0" />
              </div>
              {trip && (
                <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base break-words">
                  Real traveler insights for {trip.destination}
                </p>
              )}
            </div>
          </div>
          <AuthStatus className="flex-shrink-0" />
        </div>

        {/* Search and Filter Controls */}
        <div className={`pixel-card bg-gradient-to-br from-gray-900 to-gray-800 mb-6 sm:mb-8 border-2 border-yellow-500/30 animate-slide-in-up delay-200`}>
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <label className="block pixel-text text-xs text-yellow-400 mb-2 glow-text">
                🔍 SEARCH WISDOM
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for specific tips and advice..."
                className="w-full px-4 pr-12 py-3 bg-gray-800 border border-yellow-500/20 text-white rounded-none outline-none text-sm sm:text-base hover:border-yellow-500/40 focus:border-yellow-500/60 transition-all"
              />
              <Search className="absolute right-3 top-1/2 translate-y-1 w-5 h-5 text-yellow-500 animate-pulse" />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <label className="block pixel-text text-xs text-yellow-400 mb-2 glow-text">
                📂 FILTER BY CATEGORY
              </label>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 px-4 py-3 bg-gray-800 border border-yellow-500/20 text-white hover:border-yellow-500/40 transition-all w-full sm:min-w-[200px] justify-between text-sm sm:text-base"
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <span className="outfit-text">{filter}</span>
                </div>
                <span className="text-yellow-400">▼</span>
              </button>

              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-yellow-500/20 z-10 max-h-60 overflow-auto animate-slide-in-up">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => {
                        setFilter(category);
                        setShowDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-all flex items-center gap-3 text-sm sm:text-base border-b border-gray-700 last:border-b-0"
                    >
                      <span className="text-lg">{category !== 'All' ? getCategoryIcon(category) : '🌟'}</span>
                      <span className="outfit-text">{category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="pixel-text text-xs sm:text-sm text-green-400 flex items-center gap-1">
              <Star className="w-3 h-3" />
              {filteredTips.length} tips found
            </span>
            <span className="pixel-text text-xs sm:text-sm text-blue-400">
              • Real traveler experiences
            </span>
            <span className="pixel-text text-xs sm:text-sm text-yellow-400">
              • Location-specific advice
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12 sm:py-16">
            <div className="animate-bounce-in">
              <Loader2 className="w-8 sm:w-12 h-8 sm:h-12 text-yellow-500 animate-spin mr-3" />
              <span className="pixel-text text-yellow-400 text-sm sm:text-base">GATHERING WISDOM...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && tipsError && (
          <div className="text-center py-12 sm:py-16 animate-bounce-in">
            <div className="text-4xl sm:text-6xl mb-6 animate-float">💡</div>
            <h3 className="pixel-text text-lg sm:text-xl text-yellow-400 mb-4 glow-text">TIPS UNAVAILABLE</h3>
            <p className="outfit-text text-gray-500 text-sm sm:text-base max-w-md mx-auto">
              {getTipsErrorMessage()} for {trip?.destination}. Please check back later!
            </p>
            
            {(tipsError === 'Function not deployed' || tipsError === 'Development mode - function unavailable') && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded max-w-md mx-auto">
                <p className="outfit-text text-yellow-400 text-xs">
                  💡 <strong>Developer Note:</strong> The tips feature requires the get-reddit-tips Edge Function to be deployed to Supabase.
                  {tipsError === 'Development mode - function unavailable' && ' This feature is not available in the current development environment.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tips Grid */}
        {!loading && !tipsError && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {filteredTips.map((tip, index) => (
              <div 
                key={tip.id} 
                className={`pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-300 group animate-slide-in-up`}
                style={{ animationDelay: `${index * 50 + 300}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xl sm:text-2xl flex-shrink-0 animate-float" style={{ animationDelay: `${index * 100}ms` }}>
                      {getCategoryIcon(tip.category)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className={`pixel-text text-xs sm:text-sm ${getCategoryColor(tip.category)} block glow-text`}>
                        {tip.category}
                      </span>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="pixel-text text-xs text-green-400">{tip.source}</span>
                        <span className="pixel-text text-xs text-yellow-400 flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {tip.score}
                        </span>
                      </div>
                    </div>
                  </div>
                  {tip.reddit_url !== '#' && (
                    <a 
                      href={tip.reddit_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-blue-400 transition-all duration-300 flex-shrink-0 hover:scale-110"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                <h3 className="outfit-text font-semibold text-white mb-3 leading-tight text-sm sm:text-base break-words group-hover:text-yellow-300 transition-colors">
                  {tip.title}
                </h3>

                <p className="outfit-text text-gray-300 text-xs sm:text-sm leading-relaxed break-words group-hover:text-gray-200 transition-colors">
                  {tip.content}
                </p>

                <div className="mt-4 pt-3 border-t border-gray-700">
                  <span className="pixel-text text-xs text-gray-500">
                    {tip.source === 'Trippit' ? 'Trippit Tips' : 'Travel Community'} • {new Date(tip.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredTips.length === 0 && !loading && !tipsError && (
          <div className={`text-center py-12 sm:py-16 animate-bounce-in delay-500`}>
            <div className="text-4xl sm:text-6xl mb-6 animate-float">🔍</div>
            <h3 className="pixel-text text-lg sm:text-xl text-gray-400 mb-4 glow-text">NO WISDOM FOUND</h3>
            <p className="outfit-text text-gray-500 text-sm sm:text-base max-w-md mx-auto">
              Try adjusting your search or filter criteria to discover more travel insights
            </p>
          </div>
        )}

        {/* Attribution */}
        {redditTips.length > 0 && (
          <div className={`pixel-card bg-gray-900/30 mt-8 sm:mt-12 border border-gray-700 animate-slide-in-up delay-700`}>
            <div className="text-center">
              <p className="outfit-text text-gray-500 text-xs sm:text-sm">
                💡 Wisdom sourced from travel communities • 
                <a 
                  href="https://reddit.com/r/travel" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 ml-1 transition-colors hover:underline"
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