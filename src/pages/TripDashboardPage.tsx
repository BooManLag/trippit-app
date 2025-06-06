import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Gamepad2, MapPin, CheckSquare, Calendar, Trophy, Lightbulb, Target, Loader2, ExternalLink, CheckCircle2, Circle, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BackButton from '../components/BackButton';
import { ChecklistItem } from '../types';
import { defaultChecklist } from '../data/defaultChecklist';

interface TripDetails {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
}

interface BucketListItem {
  id: string;
  title: string;
  description: string;
  category: string;
  is_completed: boolean;
  created_at: string;
}

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

const TripDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [tripCount, setTripCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadingTips, setLoadingTips] = useState(true);
  const [loadingBucketList, setLoadingBucketList] = useState(true);
  const [tips, setTips] = useState<RedditTip[]>([]);
  const [bucketItems, setBucketItems] = useState<BucketListItem[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);

  const fetchRedditTips = async (city: string, country: string) => {
    try {
      setLoadingTips(true);
      
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

      if (!response.ok) throw new Error('Failed to fetch tips');

      const redditTips = await response.json();
      setTips(redditTips);
    } catch (error) {
      console.error('Error fetching Reddit tips:', error);
      setTips([]);
    } finally {
      setLoadingTips(false);
    }
  };

  const fetchBucketList = async (userId: string, tripId: string, destination: string) => {
    try {
      setLoadingBucketList(true);
      
      // Fetch user's bucket list items for this trip
      const { data: items, error } = await supabase
        .from('bucket_list_items')
        .select('*')
        .eq('user_id', userId)
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bucket list:', error);
        return;
      }

      // If no items exist, create default ones
      if (!items || items.length === 0) {
        const { error: createError } = await supabase.rpc('create_default_bucket_list_items', {
          p_user_id: userId,
          p_trip_id: tripId,
          p_destination: destination
        });

        if (!createError) {
          // Fetch the newly created items
          const { data: newItems } = await supabase
            .from('bucket_list_items')
            .select('*')
            .eq('user_id', userId)
            .eq('trip_id', tripId)
            .order('created_at', { ascending: false });

          setBucketItems(newItems || []);
        }
      } else {
        setBucketItems(items);
      }
    } catch (error) {
      console.error('Error fetching bucket list:', error);
      setBucketItems([]);
    } finally {
      setLoadingBucketList(false);
    }
  };

  const toggleBucketItem = async (item: BucketListItem) => {
    const { error } = await supabase
      .from('bucket_list_items')
      .update({ is_completed: !item.is_completed })
      .eq('id', item.id);

    if (!error) {
      setBucketItems(prev => 
        prev.map(i => 
          i.id === item.id 
            ? { ...i, is_completed: !i.is_completed }
            : i
        )
      );
    }
  };

  useEffect(() => {
    const fetchTripDetails = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }

        const { data: tripData, error: tripError } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .single();

        if (tripError || !tripData) {
          console.error('Trip not found:', tripError);
          navigate('/my-trips');
          return;
        }

        setTrip(tripData);
        const [city, country] = tripData.destination.split(', ');
        
        // Fetch tips and bucket list in parallel
        fetchRedditTips(city, country);
        fetchBucketList(user.id, tripId!, tripData.destination);

        // Fetch existing checklist items
        const { data: existingItems } = await supabase
          .from('checklist_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('trip_id', tripId);

        if (existingItems && existingItems.length > 0) {
          setChecklistItems(existingItems);
        } else {
          const totalDefaultItems = defaultChecklist.reduce((total, category) => {
            return total + category.items.length;
          }, 0);
          
          const placeholderItems = Array.from({ length: totalDefaultItems }, (_, index) => ({
            id: `placeholder_${index}`,
            category: 'Loading...',
            description: 'Loading...',
            is_completed: false,
            is_default: true,
            user_id: user.id,
            trip_id: tripId
          }));
          
          setChecklistItems(placeholderItems);
        }

        const { count } = await supabase
          .from('trips')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id);

        setTripCount(count || 0);
      } catch (error) {
        console.error('Error fetching trip details:', error);
        navigate('/my-trips');
      } finally {
        setLoading(false);
      }
    };

    fetchTripDetails();
  }, [tripId, navigate]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysDifference = () => {
    if (!trip) return null;
    const start = new Date(trip.start_date);
    const today = new Date();
    const diff = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getTripStatus = () => {
    const days = getDaysDifference();
    if (days === null) return '';
    if (days > 0) return `${days} days until your trip!`;
    if (days === 0) return 'Your trip starts today!';
    return 'Trip in progress';
  };

  const getChecklistSummary = () => {
    const totalTasks = checklistItems.length;
    const completedTasks = checklistItems.filter(item => item.is_completed).length;
    const remainingTasks = totalTasks - completedTasks;
    return { totalTasks, completedTasks, remainingTasks };
  };

  const getBucketListSummary = () => {
    const totalItems = bucketItems.length;
    const completedItems = bucketItems.filter(item => item.is_completed).length;
    const remainingItems = totalItems - completedItems;
    return { totalItems, completedItems, remainingItems };
  };

  const getIncompleteBucketItems = () => {
    return bucketItems.filter(item => !item.is_completed).slice(0, 4);
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'Documents': '📄',
      'Safety': '🛡️',
      'Budget': '💰',
      'Culture': '🌍',
      'Food & Drink': '🍽️',
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
      'Weather': '🌤️',
      'Sightseeing': '👁️',
      'Adventure': '🏔️',
      'Shopping': '🛍️',
      'Nightlife': '🌙',
      'Nature': '🌿',
      'Experience': '✨'
    };
    return icons[category] || '💡';
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full mobile-padding py-8 sm:py-12 bg-black text-white flex justify-center items-center">
        <div className="pixel-text text-sm sm:text-base">LOADING...</div>
      </div>
    );
  }

  const { totalTasks, completedTasks, remainingTasks } = getChecklistSummary();
  const { totalItems, completedItems, remainingItems } = getBucketListSummary();
  const incompleteBucketItems = getIncompleteBucketItems();

  return (
    <div className="min-h-screen w-full mobile-padding py-8 sm:py-12 bg-black text-white flex justify-center">
      <div className="w-full max-w-6xl">
        <div className="flex items-center gap-4 mb-6 sm:mb-8">
          <BackButton to="/my-trips" />
          <h2 className="pixel-text mobile-heading">TRIP DASHBOARD</h2>
        </div>

        <div className="pixel-card bg-gray-900 mb-6 sm:mb-8 border-2 border-blue-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4 sm:mb-6">
            <Trophy className="h-10 sm:h-12 w-10 sm:w-12 text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="pixel-text text-yellow-400 mb-2 text-sm sm:text-base">
                TRIP #{tripCount}
              </h3>
              <p className="outfit-text text-gray-400 text-sm sm:text-base">
                {tripCount === 1 ? "Congratulations on starting your first adventure!" : "Keep exploring, adventurer!"}
              </p>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-4 sm:h-5 w-4 sm:w-5 text-blue-500 flex-shrink-0 mt-1" />
              <span className="outfit-text text-sm sm:text-lg break-words">{trip?.destination}</span>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-4 sm:h-5 w-4 sm:w-5 text-green-500 flex-shrink-0 mt-1" />
              <span className="outfit-text text-sm sm:text-base">
                {trip && `${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}`}
              </span>
            </div>
            <div className="pixel-text text-xs sm:text-sm text-blue-400 mt-4">
              {getTripStatus()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Checklist Card */}
          <div className="pixel-card bg-gray-900 border-2 border-blue-500/20">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <CheckSquare className="h-5 sm:h-6 w-5 sm:w-6 text-green-500" />
                <h3 className="pixel-text text-sm sm:text-lg">CHECKLIST</h3>
              </div>
              <button 
                onClick={() => navigate(`/checklist?tripId=${tripId}`)}
                className="pixel-text text-xs sm:text-sm text-blue-400 hover:text-blue-300"
              >
                VIEW ALL
              </button>
            </div>

            <div className="text-center p-3 sm:p-4 bg-gray-800 border border-blue-500/10 mb-4 sm:mb-6">
              <div className="pixel-text text-2xl sm:text-4xl text-yellow-400 mb-2">
                {remainingTasks}
              </div>
              <p className="outfit-text text-gray-300 text-sm sm:text-base">Tasks remaining</p>
              <div className="mt-2 sm:mt-3 outfit-text text-xs sm:text-sm text-gray-400">
                {completedTasks} of {totalTasks} completed
              </div>
              <div className="w-full bg-gray-700 h-2 mt-2 rounded-full overflow-hidden">
                <div 
                  className="bg-green-500 h-full transition-all duration-300"
                  style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Game Card */}
          <div className="pixel-card bg-gray-900 border-2 border-blue-500/20">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Gamepad2 className="h-5 sm:h-6 w-5 sm:w-6 text-yellow-500" />
              <h3 className="pixel-text text-sm sm:text-lg">WHERE'D I GO?</h3>
            </div>
            <p className="outfit-text text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">
              Practice handling travel scenarios specific to {trip?.destination.split(', ')[1] || 'your destination'}!
            </p>
            <button
              onClick={() => navigate(`/game?tripId=${tripId}`)}
              className="pixel-button-primary w-full flex items-center justify-center gap-2"
            >
              <Gamepad2 className="w-4 sm:w-5 h-4 sm:h-5" />
              PLAY GAME
            </button>
          </div>
        </div>

        {/* Bucket List Section - 2x2 Compact Cards */}
        <div className="pixel-card bg-gray-900 mb-6 sm:mb-8 border-2 border-blue-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-4">
            <div className="flex items-center gap-3">
              <Target className="h-5 sm:h-6 w-5 sm:w-6 text-purple-400" />
              <h3 className="pixel-text text-sm sm:text-lg">BUCKET LIST</h3>
              {!loadingBucketList && totalItems > 0 && (
                <span className="pixel-text text-xs sm:text-sm text-purple-400">
                  {completedItems}/{totalItems} completed
                </span>
              )}
            </div>
            {totalItems > 4 && (
              <button
                onClick={() => navigate(`/bucket-list?tripId=${tripId}`)}
                className="pixel-text text-xs sm:text-sm text-blue-400 hover:text-blue-300"
              >
                VIEW ALL {totalItems}
              </button>
            )}
          </div>

          {loadingBucketList ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="w-6 sm:w-8 h-6 sm:h-8 text-purple-500 animate-spin mr-3" />
              <span className="pixel-text text-purple-400 text-sm sm:text-base">LOADING YOUR GOALS...</span>
            </div>
          ) : incompleteBucketItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {incompleteBucketItems.map(item => {
                const completed = item.is_completed;
                return (
                  <div 
                    key={item.id} 
                    className={`pixel-card transition-all cursor-pointer ${
                      completed 
                        ? 'bg-green-500/10 border-green-500/20 hover:border-green-500/40' 
                        : 'bg-gray-800 border-purple-500/10 hover:border-purple-500/30'
                    }`}
                    onClick={() => toggleBucketItem(item)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div className="flex-shrink-0 mt-1">
                        {completed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-500" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm">{getCategoryIcon(item.category)}</span>
                          <span className="pixel-text text-xs text-purple-400">{item.category}</span>
                        </div>

                        <h4 className={`outfit-text font-semibold mb-1 leading-tight text-xs break-words ${
                          completed ? 'text-gray-400 line-through' : 'text-white'
                        }`}>
                          {item.title}
                        </h4>

                        {item.description && (
                          <p className={`outfit-text text-xs leading-relaxed break-words mb-2 ${
                            completed ? 'text-gray-500' : 'text-gray-300'
                          }`}>
                            {item.description.length > 60 ? `${item.description.substring(0, 60)}...` : item.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          <span className="pixel-text text-xs text-gray-500">
                            Personal Goal
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : totalItems > 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-3xl sm:text-4xl mb-4">🎉</div>
              <h3 className="pixel-text text-purple-400 mb-2 text-sm sm:text-base">ALL GOALS COMPLETED!</h3>
              <p className="outfit-text text-gray-500 text-sm">Amazing! You've completed all your bucket list goals for {trip?.destination}!</p>
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <div className="text-3xl sm:text-4xl mb-4">🎯</div>
              <h3 className="pixel-text text-purple-400 mb-2 text-sm sm:text-base">NO GOALS YET</h3>
              <p className="outfit-text text-gray-500 text-sm">Create your first bucket list goal for {trip?.destination}!</p>
              <button
                onClick={() => navigate(`/bucket-list?tripId=${tripId}`)}
                className="pixel-button-primary mt-4"
              >
                ADD GOALS
              </button>
            </div>
          )}

          {totalItems > 4 && incompleteBucketItems.length > 0 && (
            <div className="text-center mt-4">
              <button
                onClick={() => navigate(`/bucket-list?tripId=${tripId}`)}
                className="pixel-button-secondary"
              >
                VIEW ALL {totalItems} GOALS
              </button>
            </div>
          )}
        </div>

        {/* Tips Section */}
        <div className="pixel-card bg-gray-900 border-2 border-blue-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-4">
            <div className="flex items-center gap-3">
              <Lightbulb className="h-5 sm:h-6 w-5 sm:w-6 text-yellow-400" />
              <h3 className="pixel-text text-sm sm:text-lg">CITY TIPS</h3>
              {!loadingTips && tips.length > 0 && (
                <span className="pixel-text text-xs sm:text-sm text-green-400">
                  {tips.length} tips found
                </span>
              )}
            </div>
            {tips.length > 3 && (
              <button
                onClick={() => navigate(`/tips?tripId=${tripId}`)}
                className="pixel-text text-xs sm:text-sm text-blue-400 hover:text-blue-300"
              >
                VIEW ALL {tips.length}
              </button>
            )}
          </div>

          {loadingTips ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="w-6 sm:w-8 h-6 sm:h-8 text-blue-500 animate-spin mr-3" />
              <span className="pixel-text text-blue-400 text-sm sm:text-base">GATHERING WISDOM...</span>
            </div>
          ) : tips.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {tips.slice(0, 3).map(tip => (
                <div key={tip.id} className="pixel-card bg-gray-800 border border-blue-500/10 hover:border-blue-500/30 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <span className="text-base sm:text-lg">{getCategoryIcon(tip.category)}</span>
                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        <span className="pixel-text text-xs text-green-400">{tip.source}</span>
                        <span className="pixel-text text-xs text-yellow-400">↑{tip.score}</span>
                        <span className="pixel-text text-xs text-blue-400">{tip.category}</span>
                      </div>
                    </div>
                    {tip.reddit_url !== '#' && (
                      <a 
                        href={tip.reddit_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-blue-400 transition-colors flex-shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  <h4 className="outfit-text font-semibold text-white mb-2 text-sm leading-tight">
                    {tip.title.length > 80 ? `${tip.title.substring(0, 80)}...` : tip.title}
                  </h4>
                  <p className="outfit-text text-gray-300 text-xs sm:text-sm leading-relaxed">
                    {tip.content.length > 200 ? `${tip.content.substring(0, 200)}...` : tip.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <div className="text-3xl sm:text-4xl mb-4">🌐</div>
              <h3 className="pixel-text text-yellow-400 mb-2 text-sm sm:text-base">GATHERING WISDOM</h3>
              <p className="outfit-text text-gray-500 text-sm">Searching for tips about {trip?.destination}...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripDashboardPage;