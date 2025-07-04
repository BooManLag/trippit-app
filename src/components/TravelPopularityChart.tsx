import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, MapPin, Users } from 'lucide-react';

interface TravelStats {
  destination: string;
  count: number;
}

const TravelPopularityChart: React.FC = () => {
  const [stats, setStats] = useState<TravelStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxCount, setMaxCount] = useState(0);

  useEffect(() => {
    fetchTravelStats();
    
    // Set up real-time subscription to update chart when new trips are added
    const subscription = supabase
      .channel('public:trips')
      .on('INSERT', () => {
        fetchTravelStats();
      })
      .on('UPDATE', () => {
        fetchTravelStats();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchTravelStats = async () => {
    try {
      setLoading(true);
      
      // Get travel stats from trips table
      const { data, error } = await supabase
        .from('trips')
        .select('destination')
        .not('user_id', 'is', null);
      
      if (error) {
        throw error;
      }
      
      // Count occurrences of each destination
      const destinationCounts: Record<string, number> = {};
      
      data?.forEach(trip => {
        // Extract city from "City, Country" format
        const city = trip.destination.split(',')[0].trim();
        destinationCounts[city] = (destinationCounts[city] || 0) + 1;
      });
      
      // Convert to array and sort by count (descending)
      const statsArray = Object.entries(destinationCounts)
        .map(([destination, count]) => ({ destination, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8); // Top 8 destinations
      
      // Find the maximum count for scaling
      const max = Math.max(...statsArray.map(item => item.count), 1);
      setMaxCount(max);
      
      setStats(statsArray);
    } catch (error: any) {
      console.error('Error fetching travel stats:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate a color based on the destination name
  const getDestinationColor = (destination: string) => {
    // Simple hash function to generate a color
    let hash = 0;
    for (let i = 0; i < destination.length; i++) {
      hash = destination.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate hue (0-360)
    const hue = hash % 360;
    
    // Return HSL color with fixed saturation and lightness
    return `hsl(${hue}, 70%, 60%)`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mr-3" />
        <span className="pixel-text text-blue-400">LOADING TRAVEL STATS...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="pixel-text text-red-400 mb-4">ERROR LOADING STATS</p>
        <p className="outfit-text text-gray-400">{error}</p>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="pixel-text text-gray-400 mb-4">NO TRAVEL DATA YET</p>
        <p className="outfit-text text-gray-500">Start creating trips to see the chart!</p>
      </div>
    );
  }

  return (
    <div className="pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-yellow-500/20">
      <div className="flex items-center gap-3 mb-6">
        <MapPin className="w-6 h-6 text-yellow-400" />
        <h3 className="pixel-text text-yellow-400 text-lg">TRAVELER PEE CHART</h3>
      </div>
      
      <div className="relative h-64 mb-6">
        {/* Chart background - grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i} 
              className="w-full border-t border-gray-700 flex items-center"
            >
              <span className="text-xs text-gray-500 pr-2">
                {Math.round((maxCount / 4) * (4 - i))}
              </span>
            </div>
          ))}
        </div>
        
        {/* Chart bars */}
        <div className="absolute inset-0 pt-2 flex items-end justify-around">
          {stats.map((item, index) => {
            const heightPercent = (item.count / maxCount) * 100;
            const color = getDestinationColor(item.destination);
            
            return (
              <div 
                key={index} 
                className="relative flex flex-col items-center group"
                style={{ width: `${100 / stats.length}%` }}
              >
                {/* The person icon at the top */}
                <div className="absolute bottom-full mb-1" style={{ transform: `translateY(-${heightPercent}%)` }}>
                  <div className="relative">
                    {/* Person head */}
                    <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                    {/* Person body */}
                    <div className="w-4 h-8 bg-gray-400 mx-auto"></div>
                    {/* Person legs */}
                    <div className="flex justify-between">
                      <div className="w-1.5 h-4 bg-gray-400"></div>
                      <div className="w-1.5 h-4 bg-gray-400"></div>
                    </div>
                  </div>
                </div>
                
                {/* The "pee stream" - animated gradient */}
                <div 
                  className="w-1.5 absolute bottom-full mb-12 rounded-t-sm animate-pulse"
                  style={{ 
                    height: `${heightPercent}%`, 
                    background: `linear-gradient(to bottom, transparent, ${color})`,
                    maxHeight: 'calc(100% - 24px)',
                    left: '50%',
                    transform: 'translateX(-50%)'
                  }}
                ></div>
                
                {/* The puddle at the bottom */}
                <div 
                  className="h-2 rounded-full transition-all duration-500 group-hover:opacity-80"
                  style={{ 
                    width: `${Math.max(20, item.count * 5)}px`, 
                    backgroundColor: color,
                    opacity: 0.6
                  }}
                ></div>
                
                {/* Destination label */}
                <div className="h-6 mt-2 transform -rotate-45 origin-top-left">
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {item.destination}
                  </span>
                </div>
                
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {item.destination}: {item.count} travelers
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="text-center">
        <p className="pixel-text text-xs text-gray-500">
          THE HIGHER THE PEE, THE MORE POPULAR THE DESTINATION!
        </p>
      </div>
    </div>
  );
};

export default TravelPopularityChart;