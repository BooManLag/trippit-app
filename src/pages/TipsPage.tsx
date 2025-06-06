import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Filter, Loader2, ExternalLink, ArrowLeft, Search } from 'lucide-react';
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

interface GeneralTip {
  id: string;
  category: string;
  title: string;
  content: string;
  isGeneral: true;
}

// Reduced general tips - only essential ones
const generalTips: GeneralTip[] = [
  {
    id: 'general_1',
    category: 'Documents',
    title: 'Check Passport/Visa Requirements Early',
    content: 'Make sure your passport is valid for at least six months beyond your return date. Research whether your destination requires a visa (and how long it takes to process) well before you book anything.',
    isGeneral: true
  },
  {
    id: 'general_2',
    category: 'Safety',
    title: 'Get Travel Insurance',
    content: 'Even if you\'re young and healthy, travel insurance can save you from huge bills if you get sick, lose luggage, or face trip cancellations.',
    isGeneral: true
  },
  {
    id: 'general_3',
    category: 'Technology',
    title: 'Download Offline Maps and Translation Apps',
    content: 'Before you land, download your city\'s map on Google Maps (or Maps.me) so you can navigate without data. Install a translation app (Google Translate offline files) for easy phrase lookup.',
    isGeneral: true
  },
  {
    id: 'general_4',
    category: 'Safety',
    title: 'Share Your Itinerary with Someone at Home',
    content: 'Send a copy of your flight/rail/motel bookings (with dates) to a trusted friend or family member who can check in on you if needed.',
    isGeneral: true
  },
  {
    id: 'general_5',
    category: 'Budget',
    title: 'Carry Some Local Currency',
    content: 'Have at least enough local cash on arrival to cover immediate expenses (taxi, snacks, tips). Research ATM fees and consider a low-fee travel card if you\'ll be withdrawing abroad.',
    isGeneral: true
  }
];

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
          
          // Fetch Reddit tips
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-reddit-tips`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ city, country }),
            }
          );

          if (response.ok) {
            const tips = await response.json();
            setRedditTips(tips);
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

  // Prioritize Reddit tips, only show general tips if no Reddit tips available
  const allTips = redditTips.length > 0 
    ? [...redditTips, ...generalTips.slice(0, 3)] // Only show 3 essential general tips if we have Reddit tips
    : [...redditTips, ...generalTips]; // Show all general tips if no Reddit tips

  // Get unique categories
  const categories = ['All', ...Array.from(new Set(allTips.map(tip => tip.category)))];

  // Filter tips
  const filteredTips = allTips.filter(tip => {
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

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => tripId ? navigate(`/trip/${tripId}`) : navigate('/')} 
            className="text-blue-400 hover:text-blue-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="pixel-text text-2xl">TRAVEL TIPS</h2>
            {trip && (
              <p className="outfit-text text-gray-400 mt-1">
                Tips for {trip.destination}
              </p>
            )}
          </div>
        </div>

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
            <span className="pixel-text text-sm text-blue-400">
              {filteredTips.length} tips found
            </span>
            {redditTips.length > 0 && (
              <span className="pixel-text text-sm text-green-400">
                • {redditTips.length} location-specific from Reddit
              </span>
            )}
            {redditTips.length > 0 ? (
              <span className="pixel-text text-sm text-yellow-400">
                • {Math.min(3, generalTips.length)} essential general tips
              </span>
            ) : (
              <span className="pixel-text text-sm text-yellow-400">
                • {generalTips.length} general travel tips
              </span>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mr-3" />
            <span className="pixel-text text-blue-400">LOADING LOCATION-SPECIFIC TIPS...</span>
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
                    {'source' in tip && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="pixel-text text-xs text-green-400">{tip.source}</span>
                        <span className="pixel-text text-xs text-yellow-400">↑{tip.score}</span>
                      </div>
                    )}
                    {'isGeneral' in tip && (
                      <span className="pixel-text text-xs text-blue-400">Essential Tip</span>
                    )}
                  </div>
                </div>
                {'reddit_url' in tip && (
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

        {/* Show message when no Reddit tips are available */}
        {!loading && redditTips.length === 0 && (
          <div className="pixel-card bg-gray-900/50 p-6 mt-8 border-2 border-yellow-500/20">
            <div className="text-center">
              <span className="text-2xl mb-2 block">🌐</span>
              <h3 className="pixel-text text-yellow-400 mb-2">LOCATION-SPECIFIC TIPS COMING SOON</h3>
              <p className="outfit-text text-gray-400 text-sm">
                We're working on gathering location-specific tips for {trip?.destination}. 
                In the meantime, here are some essential general travel tips!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TipsPage;