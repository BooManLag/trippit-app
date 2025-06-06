import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Star, Trophy, Target, MapPin, DollarSign, Zap, CheckCircle2, Plus, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BucketListItem {
  id: string;
  destination: string;
  city: string;
  country: string;
  title: string;
  description: string;
  category: string;
  difficulty_level: string;
  estimated_cost: string;
  source: string;
  reddit_url: string;
  score: number;
  created_at: string;
}

interface UserProgress {
  id: string;
  bucket_item_id: string;
  completed_at: string | null;
  notes: string | null;
  rating: number | null;
}

const BucketListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId');
  
  const [trip, setTrip] = useState<any>(null);
  const [bucketItems, setBucketItems] = useState<BucketListItem[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    const fetchBucketList = async () => {
      if (!tripId) {
        navigate('/');
        return;
      }

      try {
        setLoading(true);
        
        // Fetch trip details
        const { data: tripData } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .single();

        if (!tripData) {
          navigate('/my-trips');
          return;
        }

        setTrip(tripData);
        const [city, country] = tripData.destination.split(', ');

        // Fetch bucket list from Reddit
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-bucket-list`,
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
          const items = await response.json();
          setBucketItems(items);
        }

        // Fetch user progress
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: progressData } = await supabase
            .from('user_bucket_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('trip_id', tripId);

          setUserProgress(progressData || []);
        }

      } catch (error) {
        console.error('Error fetching bucket list:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBucketList();
  }, [tripId, navigate]);

  const toggleItemCompletion = async (item: BucketListItem) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existingProgress = userProgress.find(p => p.bucket_item_id === item.id);
    
    if (existingProgress) {
      // Toggle completion
      const newCompletedAt = existingProgress.completed_at ? null : new Date().toISOString();
      
      const { error } = await supabase
        .from('user_bucket_progress')
        .update({ completed_at: newCompletedAt })
        .eq('id', existingProgress.id);

      if (!error) {
        setUserProgress(prev => 
          prev.map(p => 
            p.id === existingProgress.id 
              ? { ...p, completed_at: newCompletedAt }
              : p
          )
        );
      }
    } else {
      // Create new progress entry
      const { data, error } = await supabase
        .from('user_bucket_progress')
        .insert({
          user_id: user.id,
          trip_id: tripId,
          bucket_item_id: item.id,
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!error && data) {
        setUserProgress(prev => [...prev, data]);
      }
    }
  };

  const isItemCompleted = (itemId: string) => {
    const progress = userProgress.find(p => p.bucket_item_id === itemId);
    return progress?.completed_at !== null;
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'Food & Drink': '🍽️',
      'Culture': '🏛️',
      'Sightseeing': '👁️',
      'Adventure': '🏔️',
      'Shopping': '🛍️',
      'Nightlife': '🌙',
      'Nature': '🌿',
      'Accommodation': '🏨',
      'Experience': '✨'
    };
    return icons[category] || '✨';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-400';
      case 'Medium': return 'text-yellow-400';
      case 'Hard': return 'text-red-400';
      default: return 'text-blue-400';
    }
  };

  const getCostColor = (cost: string) => {
    switch (cost) {
      case 'Free': return 'text-green-400';
      case 'Budget': return 'text-yellow-400';
      case 'Expensive': return 'text-red-400';
      default: return 'text-blue-400';
    }
  };

  const categories = ['All', ...Array.from(new Set(bucketItems.map(item => item.category)))];
  
  const filteredItems = bucketItems.filter(item => {
    const matchesCategory = filter === 'All' || item.category === filter;
    const matchesCompletion = showCompleted ? isItemCompleted(item.id) : !isItemCompleted(item.id);
    return matchesCategory && matchesCompletion;
  });

  const completedCount = bucketItems.filter(item => isItemCompleted(item.id)).length;
  const totalCount = bucketItems.length;

  return (
    <div className="min-h-screen bg-black text-white mobile-padding py-6 sm:py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6 sm:mb-8">
          <button 
            onClick={() => tripId ? navigate(`/trip/${tripId}`) : navigate('/')} 
            className="text-blue-400 hover:text-blue-300"
          >
            <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="pixel-text mobile-heading">BUCKET LIST</h2>
            {trip && (
              <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base break-words">
                Epic experiences in {trip.destination}
              </p>
            )}
          </div>
        </div>

        {/* Progress Stats */}
        <div className="pixel-card bg-gray-900 mb-6 sm:mb-8 border-2 border-blue-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 sm:w-6 h-5 sm:h-6 text-yellow-400" />
                <span className="pixel-text text-yellow-400 text-sm sm:text-base">
                  {completedCount}/{totalCount} COMPLETED
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-5 sm:w-6 h-5 sm:h-6 text-blue-400" />
                <span className="pixel-text text-blue-400 text-sm sm:text-base">
                  {Math.round((completedCount / Math.max(totalCount, 1)) * 100)}% PROGRESS
                </span>
              </div>
            </div>
          </div>
          
          <div className="w-full bg-gray-700 h-3 mt-4 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-full transition-all duration-500"
              style={{ width: `${(completedCount / Math.max(totalCount, 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="pixel-card bg-gray-900 mb-6 sm:mb-8 border-2 border-blue-500/20">
          <div className="flex flex-col gap-4">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setFilter(category)}
                  className={`px-3 sm:px-4 py-2 text-xs sm:text-sm transition-colors ${
                    filter === category
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {category !== 'All' ? getCategoryIcon(category) : '🌟'} {category}
                </button>
              ))}
            </div>

            {/* Completion Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowCompleted(false)}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm transition-colors ${
                  !showCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                📋 TO DO ({totalCount - completedCount})
              </button>
              <button
                onClick={() => setShowCompleted(true)}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm transition-colors ${
                  showCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                ✅ COMPLETED ({completedCount})
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <Loader2 className="w-6 sm:w-8 h-6 sm:h-8 text-blue-500 animate-spin mr-3" />
            <span className="pixel-text text-blue-400 text-sm sm:text-base">LOADING EPIC EXPERIENCES...</span>
          </div>
        )}

        {/* Bucket List Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {filteredItems.map(item => {
            const completed = isItemCompleted(item.id);
            return (
              <div 
                key={item.id} 
                className={`pixel-card transition-all cursor-pointer ${
                  completed 
                    ? 'bg-green-500/10 border-green-500/20 hover:border-green-500/40' 
                    : 'bg-gray-900 border-blue-500/20 hover:border-blue-500/40'
                }`}
                onClick={() => toggleItemCompletion(item)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <span className="text-lg sm:text-2xl flex-shrink-0">{getCategoryIcon(item.category)}</span>
                    <div className="min-w-0 flex-1">
                      <span className="pixel-text text-xs sm:text-sm text-blue-400 block">
                        {item.category}
                      </span>
                      <div className="flex items-center gap-1 sm:gap-2 mt-1 flex-wrap">
                        <span className={`pixel-text text-xs ${getDifficultyColor(item.difficulty_level)}`}>
                          {item.difficulty_level}
                        </span>
                        <span className={`pixel-text text-xs ${getCostColor(item.estimated_cost)}`}>
                          {item.estimated_cost}
                        </span>
                        {item.source !== 'Trippit' && (
                          <span className="pixel-text text-xs text-green-400">
                            ↑{item.score}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.reddit_url !== '#' && (
                      <a 
                        href={item.reddit_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-blue-400 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 sm:w-4 h-3 sm:h-4" />
                      </a>
                    )}
                    <CheckCircle2 
                      className={`w-5 sm:w-6 h-5 sm:h-6 ${
                        completed ? 'text-green-400' : 'text-gray-500'
                      }`}
                    />
                  </div>
                </div>

                <h3 className={`outfit-text font-semibold mb-3 leading-tight text-sm sm:text-base break-words ${
                  completed ? 'text-gray-400 line-through' : 'text-white'
                }`}>
                  {item.title}
                </h3>

                <p className={`outfit-text text-xs sm:text-sm leading-relaxed break-words ${
                  completed ? 'text-gray-500' : 'text-gray-300'
                }`}>
                  {item.description}
                </p>

                <div className="mt-4 pt-3 border-t border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="pixel-text text-xs text-gray-500">
                      {item.source === 'Trippit' ? 'Trippit Curated' : `Community • ${item.source}`}
                    </span>
                    {completed && (
                      <span className="pixel-text text-xs text-green-400">
                        ✅ COMPLETED
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && !loading && (
          <div className="text-center py-8 sm:py-12">
            <div className="text-3xl sm:text-4xl mb-4">
              {showCompleted ? '🎉' : '🎯'}
            </div>
            <h3 className="pixel-text text-sm sm:text-lg text-gray-400 mb-2">
              {showCompleted ? 'NO COMPLETED ITEMS YET' : 'ALL ITEMS COMPLETED!'}
            </h3>
            <p className="outfit-text text-gray-500 text-sm sm:text-base">
              {showCompleted 
                ? 'Start checking off items to see your progress here'
                : 'Amazing! You\'ve completed all bucket list items in this category'
              }
            </p>
          </div>
        )}

        {/* Attribution */}
        {bucketItems.length > 0 && (
          <div className="pixel-card bg-gray-900/30 mt-6 sm:mt-8 border border-gray-700">
            <div className="text-center">
              <p className="outfit-text text-gray-500 text-xs sm:text-sm">
                🎯 Bucket list curated from travel communities • 
                <a 
                  href="https://reddit.com/r/travel" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 ml-1"
                >
                  Share your experiences
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BucketListPage;