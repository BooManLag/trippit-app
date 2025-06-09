import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Gamepad2, MapPin, CheckSquare, Calendar, Trophy, Lightbulb, Target, Loader2, ExternalLink, CheckCircle2, Circle, Star, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BackButton from '../components/BackButton';
import AuthStatus from '../components/AuthStatus';
import AuthModal from '../components/AuthModal';
import CopyLinkButton from '../components/CopyLinkButton';
import { ChecklistItem } from '../types';
import { defaultChecklist } from '../data/defaultChecklist';
import daresData from '../data/dares.json';

interface TripDetails {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
}

interface UserDare {
  id: string;
  user_id: string;
  trip_id: string;
  bucket_item_id: string; // This is the dare_id from JSON
  completed_at: string | null;
  notes: string | null;
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
  const [tripNumber, setTripNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [loadingTips, setLoadingTips] = useState(true);
  const [loadingDares, setLoadingDares] = useState(true);
  const [tips, setTips] = useState<RedditTip[]>([]);
  const [userDares, setUserDares] = useState<UserDare[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);

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

  const fetchUserDares = async (userId: string, tripId: string) => {
    try {
      setLoadingDares(true);
      
      // Fetch user's dares for this trip
      const { data: userDareData, error } = await supabase
        .from('user_bucket_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user dares:', error);
        return;
      }

      setUserDares(userDareData || []);
    } catch (error) {
      console.error('Error fetching user dares:', error);
      setUserDares([]);
    } finally {
      setLoadingDares(false);
    }
  };

  const toggleDare = async (userDare: UserDare) => {
    const isCompleting = !userDare.completed_at;
    
    const { error } = await supabase
      .from('user_bucket_progress')
      .update({ 
        completed_at: isCompleting ? new Date().toISOString() : null 
      })
      .eq('id', userDare.id);

    if (!error) {
      setUserDares(prev => 
        prev.map(ud => 
          ud.id === userDare.id 
            ? { ...ud, completed_at: isCompleting ? new Date().toISOString() : null }
            : ud
        )
      );
    }
  };

  const addRandomDare = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get dares that user hasn't added yet
    const usedDareIds = userDares.map(ud => ud.bucket_item_id);
    const availableDares = daresData.filter(dare => !usedDareIds.includes(dare.id));
    
    if (availableDares.length === 0) return;

    // Pick a random dare
    const randomDare = availableDares[Math.floor(Math.random() * availableDares.length)];

    const { data, error } = await supabase
      .from('user_bucket_progress')
      .insert({
        user_id: user.id,
        trip_id: tripId,
        bucket_item_id: randomDare.id,
        completed_at: null,
        notes: null
      })
      .select()
      .single();

    if (!error && data) {
      setUserDares(prev => [data, ...prev]);
    }
  };

  const fetchTripDetails = async (userId: string) => {
    try {
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

      // Fetch tips and dares in parallel
      fetchRedditTips(city, country);
      fetchUserDares(userId, tripId!);

      // Fetch existing checklist items
      const { data: existingItems } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('user_id', userId)
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
          user_id: userId,
          trip_id: tripId,
        }));

        setChecklistItems(placeholderItems);
      }

      // Get all user trips ordered by creation date to determine this trip's number
      const { data: allTrips } = await supabase
        .from('trips')
        .select('id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (allTrips) {
        // Find the index of current trip in the chronologically ordered list
        const currentTripIndex = allTrips.findIndex((t) => t.id === tripId);
        setTripNumber(currentTripIndex + 1); // +1 because arrays are 0-indexed
      }

    } catch (error) {
      console.error('Error fetching trip details:', error);
      navigate('/my-trips');
    } finally {
      setLoading(false);
    }
  };

  const loadTrip = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setShowAuthModal(true);
      return;
    }

    await fetchTripDetails(user.id);
  };

  const handleAuthSuccess = async () => {
    setShowAuthModal(false);
    setLoading(true);
    await loadTrip();
  };

  useEffect(() => {
    loadTrip();
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

  const getDaresSummary = () => {
    const totalDares = userDares.length;
    const completedDares = userDares.filter(dare => dare.completed_at).length;
    const remainingDares = totalDares - completedDares;
    return { totalDares, completedDares, remainingDares };
  };

  const getIncompleteDares = () => {
    return userDares.filter(userDare => !userDare.completed_at).slice(0, 4);
  };

  const getCompletedDares = () => {
    return userDares.filter(userDare => userDare.completed_at).slice(0, 4);
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
      'Experience': '✨',
      'Photography': '📸',
      'Local Life': '🏠',
      'Entertainment': '🎭',
      'Wellness': '🧘'
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
  const { totalDares, completedDares, remainingDares } = getDaresSummary();
  const incompleteDares = getIncompleteDares();
  const completedDaresList = getCompletedDares();

  return (
    <div className="min-h-screen w-full mobile-padding py-8 sm:py-12 bg-black text-white flex justify-center">
      <div className="w-full max-w-6xl">
        <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <BackButton to="/my-trips" />
            <h2 className="pixel-text mobile-heading">TRIP DASHBOARD</h2>
          </div>
          <AuthStatus className="flex-shrink-0" />
        </div>

        <div className="pixel-card bg-gray-900 mb-6 sm:mb-8 border-2 border-blue-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4 sm:mb-6">
            <Trophy className="h-10 sm:h-12 w-10 sm:w-12 text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="pixel-text text-yellow-400 text-sm sm:text-base">
                  TRIP #{tripNumber}
                </h3>
                <CopyLinkButton tripId={tripId!} />
              </div>
              <p className="outfit-text text-gray-400 text-sm sm:text-base">
                {tripNumber === 1 ? 'Congratulations on starting your first adventure!' : 'Keep exploring, adventurer!'}
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

        <div className="pixel-card bg-gray-900 border-2 border-purple-500/20 flex items-center justify-center mb-6 sm:mb-8">
          <span className="pixel-text text-purple-400 text-xs sm:text-sm">BADGES COMING SOON</span>
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

        {/* Dare Bucket List Section */}
        <div className="pixel-card bg-gray-900 mb-6 sm:mb-8 border-2 border-red-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-4">
            <div className="flex items-center gap-3">
              <Target className="h-5 sm:h-6 w-5 sm:w-6 text-red-400" />
              <h3 className="pixel-text text-sm sm:text-lg">DARE BUCKET LIST</h3>
              {!loadingDares && totalDares > 0 && (
                <span className="pixel-text text-xs sm:text-sm text-red-400">
                  {completedDares}/{totalDares} conquered
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {totalDares > 4 && (
                <button
                  onClick={() => navigate(`/bucket-list?tripId=${tripId}`)}
                  className="pixel-text text-xs sm:text-sm text-blue-400 hover:text-blue-300"
                >
                  VIEW ALL {totalDares}
                </button>
              )}
              <button
                onClick={addRandomDare}
                className="pixel-button-secondary text-xs px-3 py-1 flex items-center gap-1"
              >
                <Zap className="w-3 h-3" />
                RANDOM DARE
              </button>
            </div>
          </div>

          {loadingDares ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="w-6 sm:w-8 h-6 sm:h-8 text-red-500 animate-spin mr-3" />
              <span className="pixel-text text-red-400 text-sm sm:text-base">LOADING EPIC DARES...</span>
            </div>
          ) : totalDares > 0 ? (
            <div>
              {/* Show incomplete dares if any */}
              {incompleteDares.length > 0 && (
                <div className="mb-6">
                  <h4 className="pixel-text text-red-400 text-sm mb-3">🎯 TO DARE</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {incompleteDares.map(userDare => {
                      const dare = daresData.find(d => d.id === userDare.bucket_item_id);
                      if (!dare) return null;
                      
                      return (
                        <div 
                          key={userDare.id} 
                          className="pixel-card bg-gray-800 border border-red-500/10 hover:border-red-500/30 transition-all cursor-pointer group"
                          onClick={() => toggleDare(userDare)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              <Circle className="w-5 h-5 text-red-500 group-hover:text-red-400" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm">{getCategoryIcon(dare.category)}</span>
                                <span className="pixel-text text-xs text-red-400">{dare.category}</span>
                              </div>

                              <h4 className="outfit-text font-semibold mb-1 leading-tight text-xs break-words text-white group-hover:text-red-300">
                                {dare.title}
                              </h4>

                              {dare.description && (
                                <p className="outfit-text text-xs leading-relaxed break-words mb-2 text-gray-300">
                                  {dare.description.length > 60 ? `${dare.description.substring(0, 60)}...` : dare.description}
                                </p>
                              )}

                              <span className="pixel-text text-xs text-red-400">READY TO DARE?</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Show completed dares if any */}
              {completedDaresList.length > 0 && (
                <div>
                  <h4 className="pixel-text text-green-400 text-sm mb-3">🏆 CONQUERED</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {completedDaresList.map(userDare => {
                      const dare = daresData.find(d => d.id === userDare.bucket_item_id);
                      if (!dare) return null;
                      
                      return (
                        <div 
                          key={userDare.id} 
                          className="pixel-card bg-green-500/10 border border-green-500/20 hover:border-green-500/40 transition-all cursor-pointer group"
                          onClick={() => toggleDare(userDare)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              <CheckCircle2 className="w-5 h-5 text-green-400" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm">{getCategoryIcon(dare.category)}</span>
                                <span className="pixel-text text-xs text-green-400">{dare.category}</span>
                                <span className="pixel-text text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">
                                  CONQUERED!
                                </span>
                              </div>

                              <h4 className="outfit-text font-semibold mb-1 leading-tight text-xs break-words text-gray-400 line-through">
                                {dare.title}
                              </h4>

                              {dare.description && (
                                <p className="outfit-text text-xs leading-relaxed break-words mb-2 text-gray-500">
                                  {dare.description.length > 60 ? `${dare.description.substring(0, 60)}...` : dare.description}
                                </p>
                              )}

                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-400" />
                                <span className="pixel-text text-xs text-green-400">DARE CONQUERED!</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <div className="text-3xl sm:text-4xl mb-4">🎯</div>
              <h3 className="pixel-text text-red-400 mb-2 text-sm sm:text-base">NO DARES YET</h3>
              <p className="outfit-text text-gray-500 text-sm">Add your first epic dare for {trip?.destination}!</p>
              <button
                onClick={addRandomDare}
                className="pixel-button-primary mt-4"
              >
                ADD RANDOM DARE
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
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default TripDashboardPage;