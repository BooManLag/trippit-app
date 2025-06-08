import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Trophy, Target, CheckCircle2, Circle, Plus, Trash2, ChevronDown, Shuffle, Zap, Star, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AuthStatus from '../components/AuthStatus';
import daresData from '../data/dares.json';

interface DareItem {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  funLevel: string;
  completed?: boolean;
  completedAt?: string;
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

const BucketListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId');
  
  const [trip, setTrip] = useState<any>(null);
  const [userDares, setUserDares] = useState<UserDare[]>([]);
  const [availableDares, setAvailableDares] = useState<DareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAvailableDares, setShowAvailableDares] = useState(false);

  const categories = ['All', 'Food & Drink', 'Culture', 'Adventure', 'Photography', 'Local Life', 'Shopping', 'Entertainment', 'Experience', 'Nature', 'Wellness', 'Nightlife', 'Sightseeing'];

  useEffect(() => {
    const fetchDares = async () => {
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

        // Fetch user's dares for this trip
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }

        const { data: userDareData, error } = await supabase
          .from('user_bucket_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching user dares:', error);
          return;
        }

        setUserDares(userDareData || []);

        // Get random available dares that user hasn't added yet
        const usedDareIds = (userDareData || []).map(ud => ud.bucket_item_id);
        const available = daresData.filter(dare => !usedDareIds.includes(dare.id));
        setAvailableDares(available.sort(() => Math.random() - 0.5));

      } catch (error) {
        console.error('Error fetching dares:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDares();
  }, [tripId, navigate]);

  const addDare = async (dare: DareItem) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_bucket_progress')
      .insert({
        user_id: user.id,
        trip_id: tripId,
        bucket_item_id: dare.id,
        completed_at: null,
        notes: null
      })
      .select()
      .single();

    if (!error && data) {
      setUserDares(prev => [data, ...prev]);
      setAvailableDares(prev => prev.filter(d => d.id !== dare.id));
    }
  };

  const toggleDareCompletion = async (userDare: UserDare) => {
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

  const deleteDare = async (userDareId: string, dareId: string) => {
    const { error } = await supabase
      .from('user_bucket_progress')
      .delete()
      .eq('id', userDareId);

    if (!error) {
      setUserDares(prev => prev.filter(ud => ud.id !== userDareId));
      // Add the dare back to available dares
      const dare = daresData.find(d => d.id === dareId);
      if (dare) {
        setAvailableDares(prev => [...prev, dare]);
      }
    }
  };

  const addRandomDare = async () => {
    if (availableDares.length === 0) return;
    const randomDare = availableDares[Math.floor(Math.random() * availableDares.length)];
    await addDare(randomDare);
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
      'Experience': '✨',
      'Photography': '📸',
      'Local Life': '🏠',
      'Entertainment': '🎭',
      'Wellness': '🧘'
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

  const getFunLevelEmoji = (funLevel: string) => {
    switch (funLevel) {
      case 'mild': return '😊';
      case 'spicy': return '🌶️';
      case 'chaotic': return '🤪';
      default: return '😄';
    }
  };

  // Get dares with completion status
  const daresWithStatus = userDares.map(userDare => {
    const dare = daresData.find(d => d.id === userDare.bucket_item_id);
    if (!dare) return null;
    return {
      ...dare,
      userDareId: userDare.id,
      completed: !!userDare.completed_at,
      completedAt: userDare.completed_at
    };
  }).filter(Boolean) as (DareItem & { userDareId: string; completed: boolean; completedAt: string | null })[];

  const filteredDares = daresWithStatus.filter(dare => {
    const matchesCompletion = showCompleted ? dare.completed : !dare.completed;
    const matchesCategory = selectedCategory === 'All' || dare.category === selectedCategory;
    return matchesCompletion && matchesCategory;
  });

  const completedCount = daresWithStatus.filter(dare => dare.completed).length;
  const totalCount = daresWithStatus.length;

  return (
    <div className="min-h-screen bg-black text-white mobile-padding py-6 sm:py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <button 
              onClick={() => tripId ? navigate(`/trip/${tripId}`) : navigate('/')} 
              className="text-blue-400 hover:text-blue-300 flex-shrink-0"
            >
              <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="pixel-text mobile-heading text-red-400">DARE BUCKET LIST</h2>
              {trip && (
                <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base break-words">
                  Epic dares for {trip.destination}
                </p>
              )}
            </div>
          </div>
          <AuthStatus className="flex-shrink-0" />
        </div>

        {/* Progress Stats */}
        <div className="pixel-card bg-gradient-to-r from-red-900/20 to-orange-900/20 mb-6 sm:mb-8 border-2 border-red-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 sm:w-7 h-6 sm:h-7 text-yellow-400" />
                <div>
                  <div className="pixel-text text-yellow-400 text-lg sm:text-xl">
                    {completedCount}/{totalCount}
                  </div>
                  <div className="pixel-text text-xs text-gray-400">CONQUERED</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-6 sm:w-7 h-6 sm:h-7 text-red-400" />
                <div>
                  <div className="pixel-text text-red-400 text-lg sm:text-xl">
                    {Math.round((completedCount / Math.max(totalCount, 1)) * 100)}%
                  </div>
                  <div className="pixel-text text-xs text-gray-400">PROGRESS</div>
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={addRandomDare}
                disabled={availableDares.length === 0}
                className="pixel-button-primary bg-red-600 hover:bg-red-500 disabled:opacity-50 flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                RANDOM DARE
              </button>
              <button
                onClick={() => setShowAvailableDares(!showAvailableDares)}
                className="pixel-button-secondary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                BROWSE
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-700 h-4 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 h-full transition-all duration-500 flex items-center justify-center"
              style={{ width: `${(completedCount / Math.max(totalCount, 1)) * 100}%` }}
            >
              {completedCount > 0 && (
                <span className="pixel-text text-xs text-black font-bold">
                  {Math.round((completedCount / totalCount) * 100)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Available Dares Section */}
        {showAvailableDares && (
          <div className="pixel-card bg-gray-900 mb-6 sm:mb-8 border-2 border-green-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="pixel-text text-green-400 text-sm sm:text-base">
                AVAILABLE DARES ({availableDares.length})
              </h3>
              <button
                onClick={() => setShowAvailableDares(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-auto">
              {availableDares.slice(0, 12).map((dare) => (
                <button
                  key={dare.id}
                  onClick={() => addDare(dare)}
                  className="text-left p-3 bg-gray-800 border border-green-500/20 hover:border-green-500/40 hover:bg-gray-700 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">{getCategoryIcon(dare.category)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="pixel-text text-xs text-green-400">{dare.category}</span>
                        <span className={`pixel-text text-xs ${getDifficultyColor(dare.difficulty)}`}>
                          {dare.difficulty}
                        </span>
                        <span className="text-xs">{getFunLevelEmoji(dare.funLevel)}</span>
                      </div>
                      <div className="outfit-text font-semibold text-white text-sm mb-1 break-words group-hover:text-green-300">
                        {dare.title}
                      </div>
                      <div className="outfit-text text-xs text-gray-400 break-words">
                        {dare.description.length > 60 ? `${dare.description.substring(0, 60)}...` : dare.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {availableDares.length > 12 && (
              <div className="text-center mt-4">
                <button
                  onClick={() => setAvailableDares(prev => [...prev].sort(() => Math.random() - 0.5))}
                  className="pixel-text text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mx-auto"
                >
                  <Shuffle className="w-3 h-3" />
                  SHUFFLE FOR MORE
                </button>
              </div>
            )}
          </div>
        )}

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* View Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setShowCompleted(false)}
              className={`px-4 py-2 rounded-md text-sm transition-all ${
                !showCompleted
                  ? 'bg-red-500 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              🎯 TO DARE ({totalCount - completedCount})
            </button>
            <button
              onClick={() => setShowCompleted(true)}
              className={`px-4 py-2 rounded-md text-sm transition-all ${
                showCompleted
                  ? 'bg-green-500 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              🏆 CONQUERED ({completedCount})
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-gray-800 border border-blue-500/20 text-white px-3 py-2 rounded-md text-sm"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category !== 'All' ? getCategoryIcon(category) : '🌟'} {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin mr-3" />
            <span className="pixel-text text-red-400">LOADING EPIC DARES...</span>
          </div>
        )}

        {/* Dares Grid */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredDares.map(dare => {
              const completed = dare.completed;
              return (
                <div 
                  key={dare.userDareId} 
                  className={`pixel-card transition-all group relative ${
                    completed 
                      ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50' 
                      : 'bg-gray-900 border-red-500/30 hover:border-red-500/50'
                  }`}
                >
                  {/* Completion Checkbox */}
                  <div 
                    className="absolute top-4 right-4 cursor-pointer z-10"
                    onClick={() => toggleDareCompletion({ 
                      id: dare.userDareId, 
                      bucket_item_id: dare.id, 
                      completed_at: dare.completedAt 
                    } as UserDare)}
                  >
                    {completed ? (
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                    ) : (
                      <Circle className="w-6 h-6 text-red-500 hover:text-red-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pr-12">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{getCategoryIcon(dare.category)}</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="pixel-text text-xs text-red-400">{dare.category}</span>
                        <span className={`pixel-text text-xs ${getDifficultyColor(dare.difficulty)}`}>
                          {dare.difficulty}
                        </span>
                        <span className="text-sm">{getFunLevelEmoji(dare.funLevel)}</span>
                        {completed && (
                          <span className="pixel-text text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">
                            CONQUERED!
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className={`outfit-text font-bold mb-3 leading-tight text-base ${
                      completed ? 'text-gray-400 line-through' : 'text-white'
                    }`}>
                      {dare.title}
                    </h3>

                    {/* Description */}
                    <p className={`outfit-text text-sm leading-relaxed mb-4 ${
                      completed ? 'text-gray-500' : 'text-gray-300'
                    }`}>
                      {dare.description}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {completed ? (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span className="pixel-text text-xs text-green-400">DARE CONQUERED!</span>
                          </div>
                        ) : (
                          <span className="pixel-text text-xs text-red-400">READY TO DARE?</span>
                        )}
                      </div>
                      <button
                        onClick={() => deleteDare(dare.userDareId, dare.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty States */}
        {!loading && filteredDares.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">
              {showCompleted ? '🏆' : '🎯'}
            </div>
            <h3 className="pixel-text text-xl text-gray-400 mb-4">
              {showCompleted ? 'NO CONQUERED DARES YET' : totalCount === 0 ? 'NO DARES ADDED YET' : 'ALL DARES CONQUERED!'}
            </h3>
            <p className="outfit-text text-gray-500 mb-6">
              {showCompleted 
                ? 'Start conquering dares to see your victories here'
                : totalCount === 0
                ? 'Add your first dare to begin your adventure'
                : 'Amazing! You\'ve conquered all your dares'
              }
            </p>
            {totalCount === 0 && (
              <button
                onClick={addRandomDare}
                disabled={availableDares.length === 0}
                className="pixel-button-primary bg-red-600 hover:bg-red-500 disabled:opacity-50"
              >
                ADD YOUR FIRST DARE
              </button>
            )}
          </div>
        )}

        {/* Motivational Footer */}
        {totalCount > 0 && (
          <div className="pixel-card bg-gray-900/30 mt-8 border border-gray-700">
            <div className="text-center">
              <p className="outfit-text text-gray-500 text-sm">
                🎯 {completedCount > 0 ? `You've conquered ${completedCount} dares!` : 'Ready for adventure?'} • 
                <span className="text-red-400 ml-1">
                  {totalCount - completedCount > 0 ? `${totalCount - completedCount} dares await your courage` : 'You are a dare legend!'}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BucketListPage;