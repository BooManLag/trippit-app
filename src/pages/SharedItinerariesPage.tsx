import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Search, Filter, MapPin, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthStatus } from '../components/AuthStatus';
import SharedItineraryCard from '../components/SharedItineraryCard';

interface SharedItinerary {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  total_days: number;
  post_url: string;
  created_at: string;
}

const SharedItinerariesPage: React.FC = () => {
  const navigate = useNavigate();
  const [itineraries, setItineraries] = useState<SharedItinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDestination, setSelectedDestination] = useState<string>('All');
  const [destinations, setDestinations] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    fetchSharedItineraries();
  }, []);

  const fetchSharedItineraries = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, you would fetch from your database
      // For now, we'll use mock data
      const mockItineraries: SharedItinerary[] = [
        {
          id: 'post-1',
          title: 'Amazing Trip to Paris',
          destination: 'Paris, France',
          start_date: '2025-07-15',
          end_date: '2025-07-22',
          total_days: 8,
          post_url: 'https://www.reddit.com/r/trippitMemories/comments/example1',
          created_at: '2025-06-01T12:00:00Z'
        },
        {
          id: 'post-2',
          title: 'Tokyo Adventure',
          destination: 'Tokyo, Japan',
          start_date: '2025-08-10',
          end_date: '2025-08-20',
          total_days: 11,
          post_url: 'https://www.reddit.com/r/trippitMemories/comments/example2',
          created_at: '2025-06-05T14:30:00Z'
        },
        {
          id: 'post-3',
          title: 'New York City Weekend',
          destination: 'New York, USA',
          start_date: '2025-09-05',
          end_date: '2025-09-08',
          total_days: 4,
          post_url: 'https://www.reddit.com/r/trippitMemories/comments/example3',
          created_at: '2025-06-10T09:15:00Z'
        },
        {
          id: 'post-4',
          title: 'Exploring Rome',
          destination: 'Rome, Italy',
          start_date: '2025-10-12',
          end_date: '2025-10-18',
          total_days: 7,
          post_url: 'https://www.reddit.com/r/trippitMemories/comments/example4',
          created_at: '2025-06-15T16:45:00Z'
        },
        {
          id: 'post-5',
          title: 'Bangkok Food Tour',
          destination: 'Bangkok, Thailand',
          start_date: '2025-11-01',
          end_date: '2025-11-07',
          total_days: 7,
          post_url: 'https://www.reddit.com/r/trippitMemories/comments/example5',
          created_at: '2025-06-20T11:20:00Z'
        }
      ];
      
      setItineraries(mockItineraries);
      
      // Extract unique destinations for filter
      const uniqueDestinations = Array.from(
        new Set(mockItineraries.map(item => item.destination.split(',')[0].trim()))
      );
      setDestinations(['All', ...uniqueDestinations]);
      
    } catch (error) {
      console.error('Error fetching shared itineraries:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItineraries = itineraries.filter(itinerary => {
    const matchesSearch = searchTerm === '' || 
      itinerary.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      itinerary.destination.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDestination = selectedDestination === 'All' || 
      itinerary.destination.split(',')[0].trim() === selectedDestination;
    
    return matchesSearch && matchesDestination;
  });

  return (
    <div className="min-h-screen bg-black text-white mobile-padding py-6 sm:py-8 lg:py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-2 h-2 bg-purple-500 rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-32 right-20 w-1 h-1 bg-red-400 rounded-full animate-ping opacity-40"></div>
        <div className="absolute bottom-40 left-1/4 w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce opacity-50"></div>
        <div className="absolute top-1/2 right-10 w-1 h-1 bg-green-400 rounded-full animate-pulse opacity-30"></div>
        <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-yellow-500 rounded-full animate-ping opacity-40"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className={`flex items-center justify-between mb-6 sm:mb-8 lg:mb-12 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <button 
              onClick={() => navigate('/')} 
              className="text-blue-400 hover:text-blue-300 transition-colors hover:scale-110 flex-shrink-0"
            >
              <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="pixel-text mobile-heading text-red-400 glow-text">COMMUNITY ITINERARIES</h2>
              <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base break-words">
                Explore and rate itineraries shared by the Trippit community
              </p>
            </div>
          </div>
          <AuthStatus className="flex-shrink-0" />
        </div>

        {/* Search and Filter Controls */}
        <div className={`pixel-card bg-gradient-to-br from-gray-900 to-gray-800 mb-6 sm:mb-8 border-2 border-red-500/30 animate-slide-in-up delay-200`}>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <label className="block pixel-text text-xs text-red-400 mb-2 glow-text">
                🔍 SEARCH ITINERARIES
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by destination or title..."
                className="w-full px-4 pr-12 py-3 bg-gray-800 border border-red-500/20 text-white rounded-none outline-none text-sm sm:text-base hover:border-red-500/40 focus:border-red-500/60 transition-all"
              />
              <Search className="absolute right-3 top-1/2 translate-y-1 w-5 h-5 text-red-500 animate-pulse" />
            </div>

            {/* Destination Filter */}
            <div>
              <label className="block pixel-text text-xs text-red-400 mb-2 glow-text">
                🌍 FILTER BY DESTINATION
              </label>
              <select
                value={selectedDestination}
                onChange={(e) => setSelectedDestination(e.target.value)}
                className="px-4 py-3 bg-gray-800 border border-red-500/20 text-white hover:border-red-500/40 transition-all w-full sm:min-w-[200px] text-sm sm:text-base"
              >
                {destinations.map(destination => (
                  <option key={destination} value={destination}>
                    {destination}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="pixel-text text-xs sm:text-sm text-green-400 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              {filteredItineraries.length} itineraries found
            </span>
            <span className="pixel-text text-xs sm:text-sm text-blue-400">
              • Rate with ⭐ or 💩
            </span>
            <span className="pixel-text text-xs sm:text-sm text-yellow-400">
              • Share your own itinerary
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12 sm:py-16">
            <div className="animate-bounce-in">
              <Loader2 className="w-8 sm:w-12 h-8 sm:h-12 text-red-500 animate-spin mr-3" />
              <span className="pixel-text text-red-400 text-sm sm:text-base">LOADING ITINERARIES...</span>
            </div>
          </div>
        )}

        {/* Itineraries Grid */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {filteredItineraries.map((itinerary, index) => (
              <SharedItineraryCard
                key={itinerary.id}
                postId={itinerary.id}
                title={itinerary.title}
                destination={itinerary.destination}
                startDate={itinerary.start_date}
                endDate={itinerary.end_date}
                totalDays={itinerary.total_days}
                postUrl={itinerary.post_url}
                className={`animate-slide-in-up`}
                style={{ animationDelay: `${index * 100 + 300}ms` }}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredItineraries.length === 0 && (
          <div className="text-center py-12 sm:py-16 animate-bounce-in delay-300">
            <div className="text-4xl sm:text-6xl mb-6 animate-float">🔍</div>
            <h3 className="pixel-text text-lg sm:text-xl text-gray-400 mb-4 glow-text">NO ITINERARIES FOUND</h3>
            <p className="outfit-text text-gray-500 text-sm sm:text-base max-w-md mx-auto">
              {searchTerm || selectedDestination !== 'All' 
                ? 'Try adjusting your search or filter criteria'
                : 'Be the first to share an itinerary with the community!'}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 sm:mt-12 animate-slide-in-up delay-700">
          <p className="outfit-text text-gray-500 text-xs sm:text-sm">
            Share your own itinerary by clicking the "SHARE TO REDDIT" button when creating an itinerary
          </p>
        </div>
      </div>
    </div>
  );
};

export default SharedItinerariesPage;