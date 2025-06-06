import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Trophy, Target, CheckCircle2, Circle, Plus, Trash2, ChevronDown, Shuffle } from 'lucide-react';
import { supabase } from '../lib/supabase';
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
  dare_id: string;
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Food & Drink', 'Culture', 'Adventure', 'Photography', 'Local Life', 'Shopping', 'Entertainment', 'Experience', 'Nature', 'Wellness', 'Nightlife', 'Sightseeing'];

  // Get random dares from JSON
  const getRandomDares = (count: number = 10) => {
    const shuffled = [...daresData].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

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
        const usedDareIds = (userDareData || []).map(ud => ud.dare_id);
        const available = daresData.filter(dare => !usedDareIds.includes(dare.id));
        setAvailableDares(available);

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
        dare_id: dare.id,
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

  const shuffleAvailableDares = () => {
    const shuffled = [...availableDares].sort(() => Math.random() - 0.5);
    setAvailableDares(shuffled);
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
    const dare = daresData.find(d => d.id === userDare.dare_id);
    return {
      ...dare,
      userDareId: userDare.id,
      completed: !!userDare.completed_at,
      completedAt: userDare.completed_at
    };
  }).filter(Boolean);

  const filteredDares = daresWithStatus.filter(dare => {
    const matchesCompletion = showCompleted ? dare.completed : !dare.completed;
    const matchesCategory = selectedCategory === 'All' || dare.category === selectedCategory;
    return matchesCompletion && matchesCategory;
  });

  const completedCount = daresWithStatus.filter(dare => dare.completed).length;
  const totalCount = daresWithStatus.length;

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
            <h2 className="pixel-text mobile-heading">DARE BUCKET LIST</h2>
            {trip && (
              <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base break-words">
                Epic dares for {trip.destination}
              </p>
            )}
          </div>
        </div>

        {/* Progress Stats */}
        <div className="pixel-card bg-gray-900 mb-6 sm:mb-8 border-2 border-red-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 sm:w-6 h-5 sm:h-6 text-yellow-400" />
                <span className="pixel-text text-yellow-400 text-sm sm:text-base">
                  {completedCount}/{totalCount} CONQUERED
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-5 sm:w-6 h-5 sm:h-6 text-red-400" />
                <span className="pixel-text text-red-400 text-sm sm:text-base">
                  {Math.round((completedCount / Math.max(totalCount, 1)) * 100)}% DARED
                </span>
              </div>
            </div>
          </div>
          
          <div className="w-full bg-gray-700 h-3 mt-4 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 h-full transition-all duration-500"
              style={{ width: `${(completedCount / Math.max(totalCount, 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Controls Section */}
        <div className="pixel-card bg-gray-900 mb-6 sm:mb-8 border-2 border-green-500/20">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Add Dare Section */}
            <div className="flex-1">
              <h3 className="pixel-text text-green-400 mb-4 text-sm sm:text-base">ADD NEW DARE</h3>
              
              {/* Available Dares */}
              {availableDares.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block pixel-text text-xs text-blue-400">CHOOSE A DARE</label>
                    <button
                      onClick={shuffleAvailableDares}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="Shuffle dares"
                    >
                      <Shuffle className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-auto">
                    {availableDares.slice(0, 8).map((dare) => (
                      <button
                        key={dare.id}
                        onClick={() => addDare(dare)}
                        className="text-left p-3 bg-gray-800 border border-red-500/20 hover:border-red-500/40 hover:bg-gray-700 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-lg flex-shrink-0">{getCategoryIcon(dare.category)}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="pixel-text text-xs text-red-400">{dare.category}</span>
                              <span className={`pixel-text text-xs ${getDifficultyColor(dare.difficulty)}`}>
                                {dare.difficulty}
                              </span>
                              <span className="text-xs">{getFunLevelEmoji(dare.funLevel)}</span>
                            </div>
                            <div className="outfit-text font-semibold text-white text-sm mb-1 break-words">
                              {dare.title}
                            </div>
                            <div className="outfit-text text-xs text-gray-400 break-words">
                              {dare.description.length > 80 ? `${dare.description.substring(0, 80)}...` : dare.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Filter Buttons */}
            <div className="lg:ml-6 lg:min-w-[200px]">
              <h3 className="pixel-text text-blue-400 mb-4 text-sm sm:text-base">VIEW DARES</h3>
              <div className="flex flex-col gap-2 mb-4">
                <button
                  onClick={() => setShowCompleted(false)}
                  className={`px-3 sm:px-4 py-2 text-xs sm:text-sm transition-colors ${
                    !showCompleted
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  🎯 TO DARE ({totalCount - completedCount})
                </button>
                <button
                  onClick={() => setShowCompleted(true)}
                  className={`px-3 sm:px-4 py-2 text-xs sm:text-sm transition-colors ${
                    showCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  🏆 CONQUERED ({completedCount})
                </button>
              </div>

              {/* Category Filter */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-blue-500/20 text-white text-xs"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category !== 'All' ? getCategoryIcon(category) : '🌟'} {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <Loader2 className="w-6 sm:w-8 h-6 sm:h-8 text-red-500 animate-spin mr-3" />
            <span className="pixel-text text-red-400 text-sm sm:text-base">LOADING EPIC DARES...</span>
          </div>
        )}

        {/* Dares Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredDares.map(dare => {
            const completed = dare.completed;
            return (
              <div 
                key={dare.userDareId} 
                className={`pixel-card transition-all group ${
                  completed 
                    ? 'bg-green-500/10 border-green-500/20 hover:border-green-500/40' 
                    : 'bg-gray-900 border-red-500/20 hover:border-red-500/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div 
                    className="flex-shrink-0 mt-1 cursor-pointer"
                    onClick={() => toggleDareCompletion({ id: dare.userDareId, dare_id: dare.id, completed_at: dare.completedAt } as UserDare)}
                  >
                    {completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-red-500 hover:text-red-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getCategoryIcon(dare.category)}</span>
                      <span className="pixel-text text-xs text-red-400">{dare.category}</span>
                      <span className={`pixel-text text-xs ${getDifficultyColor(dare.difficulty)}`}>
                        {dare.difficulty}
                      </span>
                      <span className="text-xs">{getFunLevelEmoji(dare.funLevel)}</span>
                      {completed && <span className="pixel-text text-xs text-green-400">CONQUERED!</span>}
                    </div>

                    <h3 className={`outfit-text font-semibold mb-2 leading-tight text-sm break-words ${
                      completed ? 'text-gray-400 line-through' : 'text-white'
                    }`}>
                      {dare.title}
                    </h3>

                    <p className={`outfit-text text-xs leading-relaxed break-words mb-3 ${
                      completed ? 'text-gray-500' : 'text-gray-300'
                    }`}>
                      {dare.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="pixel-text text-xs text-gray-500">
                        {completed ? 'DARE CONQUERED!' : 'DARE PENDING'}
                      </span>
                      <button
                        onClick={() => deleteDare(dare.userDareId, dare.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredDares.length === 0 && !loading && (
          <div className="text-center py-8 sm:py-12">
            <div className="text-3xl sm:text-4xl mb-4">
              {showCompleted ? '🏆' : '🎯'}
            </div>
            <h3 className="pixel-text text-sm sm:text-lg text-gray-400 mb-2">
              {showCompleted ? 'NO CONQUERED DARES YET' : 'ALL DARES CONQUERED!'}
            </h3>
            <p className="outfit-text text-gray-500 text-sm sm:text-base">
              {showCompleted 
                ? 'Start conquering dares to see your victories here'
                : 'Amazing! You\'ve conquered all your dares'
              }
            </p>
          </div>
        )}

        {/* Motivational Footer */}
        {totalCount > 0 && (
          <div className="pixel-card bg-gray-900/30 mt-6 sm:mb-8 border border-gray-700">
            <div className="text-center">
              <p className="outfit-text text-gray-500 text-xs sm:text-sm">
                🎯 {completedCount > 0 ? `You've conquered ${completedCount} dares!` : 'Ready for adventure?'} • 
                <span className="text-red-400 ml-1">
                  {totalCount - completedCount > 0 ? `${totalCount - completedCount} dares await` : 'You are a dare legend!'}
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