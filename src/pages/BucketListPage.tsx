import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Trophy, Target, CheckCircle2, Circle, Plus, Trash2, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BucketListItem {
  id: string;
  title: string;
  description: string;
  category: string;
  is_completed: boolean;
  created_at: string;
}

const BucketListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId');
  
  const [trip, setTrip] = useState<any>(null);
  const [bucketItems, setBucketItems] = useState<BucketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    category: 'Experience'
  });

  const categories = [
    'Experience', 'Food & Drink', 'Culture', 'Sightseeing', 
    'Adventure', 'Shopping', 'Nature', 'Nightlife'
  ];

  // Predefined fun dare options (max 10 as requested)
  const predefinedDares = [
    {
      title: 'Eat Something Wildly Local (Without Googling First)',
      description: 'Dare yourself to order the most mysterious-looking street food you can find. Embrace the unknown flavors!',
      category: 'Food & Drink'
    },
    {
      title: 'Learn & Use a Local Slang Phrase in Public',
      description: 'Ask a local for a funny or cheeky expression. Drop it into conversation at least once—bonus points if you nail the pronunciation!',
      category: 'Culture'
    },
    {
      title: 'Improvise a Local Dance Move on the Street',
      description: 'Find a busy plaza or market, drop some coins for street musicians (if there are any), and bust out your best attempt at their traditional dance. Embrace the laughs!',
      category: 'Culture'
    },
    {
      title: 'Make One "100% Tourist" Photo—Pridefully',
      description: 'Pose in front of the biggest cliché landmark and go all out with goofy props or a dramatic pose. No shame—only glory.',
      category: 'Sightseeing'
    },
    {
      title: 'Challenge a Stranger to a Mini Talent Swap',
      description: 'Offer to teach someone a silly party trick, and ask them to teach you something uniquely local—song snippet, hand gesture, etc.',
      category: 'Culture'
    },
    {
      title: 'Use Public Transport in "Stealth Mode"',
      description: 'Ride the local bus/train without studying routes—just hop on, ask "is this going downtown?" and go with whatever happens.',
      category: 'Adventure'
    },
    {
      title: 'Find & Photograph the Hackiest Tourist Souvenir',
      description: 'Seek out the most bizarre magnet, keychain, or hat that screams "tourist." Snap a pic and wear/use it for the next day.',
      category: 'Shopping'
    },
    {
      title: 'Crash a Local Gathering (Festival, Market, etc.)',
      description: 'Spot a public festival, open-air karaoke, or lively market—step in, join the circle, and participate for at least five minutes.',
      category: 'Culture'
    },
    {
      title: 'Barter Like a Boss',
      description: 'At a small market or roadside stall, negotiate a discount on something you don\'t actually need. Aim to get at least 20% off!',
      category: 'Shopping'
    },
    {
      title: 'Perform a Random Act of "Tourist Kindness"',
      description: 'Buy a coffee for a stranger, help someone carry groceries, or feed pigeons in a public square—spread good vibes!',
      category: 'Experience'
    }
  ];

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

        // Fetch user's bucket list items for this trip
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }

        const { data: items, error } = await supabase
          .from('bucket_list_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching bucket list:', error);
          return;
        }

        // If no items exist, create default ones
        if (!items || items.length === 0) {
          const { error: createError } = await supabase.rpc('create_default_bucket_list_items', {
            p_user_id: user.id,
            p_trip_id: tripId,
            p_destination: tripData.destination
          });

          if (!createError) {
            // Fetch the newly created items
            const { data: newItems } = await supabase
              .from('bucket_list_items')
              .select('*')
              .eq('user_id', user.id)
              .eq('trip_id', tripId)
              .order('created_at', { ascending: false });

            setBucketItems(newItems || []);
          }
        } else {
          setBucketItems(items);
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

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from('bucket_list_items')
      .delete()
      .eq('id', itemId);

    if (!error) {
      setBucketItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const addPredefinedItem = async (dare: typeof predefinedDares[0]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('bucket_list_items')
      .insert({
        user_id: user.id,
        trip_id: tripId,
        title: dare.title,
        description: dare.description,
        category: dare.category,
        is_completed: false
      })
      .select()
      .single();

    if (!error && data) {
      setBucketItems(prev => [data, ...prev]);
    }
  };

  const addCustomItem = async () => {
    if (!newItem.title.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('bucket_list_items')
      .insert({
        user_id: user.id,
        trip_id: tripId,
        title: newItem.title.trim(),
        description: newItem.description.trim(),
        category: newItem.category,
        is_completed: false
      })
      .select()
      .single();

    if (!error && data) {
      setBucketItems(prev => [data, ...prev]);
      setNewItem({ title: '', description: '', category: 'Experience' });
      setShowAddForm(false);
    }
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
      'Experience': '✨'
    };
    return icons[category] || '✨';
  };

  // Filter out predefined dares that are already added
  const availableDares = predefinedDares.filter(dare => 
    !bucketItems.some(item => item.title === dare.title)
  );

  const filteredItems = bucketItems.filter(item => {
    const matchesCategory = filter === 'All' || item.category === filter;
    const matchesCompletion = showCompleted ? item.is_completed : !item.is_completed;
    return matchesCategory && matchesCompletion;
  });

  const completedCount = bucketItems.filter(item => item.is_completed).length;
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
            <h2 className="pixel-text mobile-heading">DARE BUCKET LIST</h2>
            {trip && (
              <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base break-words">
                Epic dares & challenges for {trip.destination}
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
                  {completedCount}/{totalCount} DARES COMPLETED
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-5 sm:w-6 h-5 sm:h-6 text-blue-400" />
                <span className="pixel-text text-blue-400 text-sm sm:text-base">
                  {Math.round((completedCount / Math.max(totalCount, 1)) * 100)}% BRAVE
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

        {/* Add Dare Section */}
        <div className="pixel-card bg-gray-900 mb-6 sm:mb-8 border-2 border-green-500/20">
          <h3 className="pixel-text text-green-400 mb-4 text-sm sm:text-base">ADD NEW DARE</h3>
          
          {/* Predefined Dares Dropdown */}
          {availableDares.length > 0 && (
            <div className="mb-4">
              <label className="block pixel-text text-xs text-blue-400 mb-2">CHOOSE A DARE (MAX 10 TOTAL)</label>
              <div className="relative">
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="w-full flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-blue-500/20 text-white hover:border-blue-500/40 transition-colors text-sm sm:text-base"
                >
                  <span className="outfit-text">Select a fun dare... ({availableDares.length} available)</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showCategoryDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-blue-500/20 z-10 max-h-80 overflow-auto">
                    {availableDares.map((dare, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          addPredefinedItem(dare);
                          setShowCategoryDropdown(false);
                        }}
                        className="w-full px-3 sm:px-4 py-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-lg flex-shrink-0">{getCategoryIcon(dare.category)}</span>
                          <div className="min-w-0 flex-1">
                            <div className="outfit-text font-semibold text-white text-sm mb-1 break-words">
                              {dare.title}
                            </div>
                            <div className="outfit-text text-xs text-gray-400 mb-2 break-words">
                              {dare.description}
                            </div>
                            <div className="pixel-text text-xs text-blue-400">
                              {dare.category}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Custom Dare Option */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="pixel-button-secondary flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {showAddForm ? 'CANCEL CUSTOM' : 'CREATE CUSTOM'}
            </button>
          </div>

          {/* Custom Dare Form */}
          {showAddForm && (
            <div className="mt-4 space-y-4 border-t border-gray-700 pt-4">
              <div>
                <label className="block pixel-text text-xs text-blue-400 mb-2">CUSTOM DARE TITLE</label>
                <input
                  type="text"
                  value={newItem.title}
                  onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="What's your custom dare?"
                  className="w-full input-pixel"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block pixel-text text-xs text-blue-400 mb-2">DESCRIPTION</label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your dare..."
                  className="w-full input-pixel h-20 resize-none"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block pixel-text text-xs text-blue-400 mb-2">CATEGORY</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full input-pixel"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {getCategoryIcon(category)} {category}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={addCustomItem}
                disabled={!newItem.title.trim()}
                className="pixel-button-primary w-full disabled:opacity-50"
              >
                ADD CUSTOM DARE
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="pixel-card bg-gray-900 mb-6 sm:mb-8 border-2 border-blue-500/20">
          <div className="flex flex-col gap-4">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {['All', ...categories].map(category => (
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
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                🎯 PENDING DARES ({totalCount - completedCount})
              </button>
              <button
                onClick={() => setShowCompleted(true)}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm transition-colors ${
                  showCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                ✅ CONQUERED ({completedCount})
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <Loader2 className="w-6 sm:w-8 h-6 sm:h-8 text-blue-500 animate-spin mr-3" />
            <span className="pixel-text text-blue-400 text-sm sm:text-base">LOADING EPIC DARES...</span>
          </div>
        )}

        {/* Bucket List Items - Compact Checklist Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredItems.map(item => {
            const completed = item.is_completed;
            return (
              <div 
                key={item.id} 
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
                    onClick={() => toggleItemCompletion(item)}
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
                      <span className="text-lg">{getCategoryIcon(item.category)}</span>
                      <span className="pixel-text text-xs text-blue-400">{item.category}</span>
                      {completed && <span className="pixel-text text-xs text-green-400">CONQUERED!</span>}
                    </div>

                    <h3 className={`outfit-text font-semibold mb-2 leading-tight text-sm break-words ${
                      completed ? 'text-gray-400 line-through' : 'text-white'
                    }`}>
                      {item.title}
                    </h3>

                    {item.description && (
                      <p className={`outfit-text text-xs leading-relaxed break-words mb-3 ${
                        completed ? 'text-gray-500' : 'text-gray-300'
                      }`}>
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="pixel-text text-xs text-gray-500">
                        {completed ? 'DARE COMPLETED!' : 'DARE PENDING'}
                      </span>
                      <button
                        onClick={() => deleteItem(item.id)}
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

        {filteredItems.length === 0 && !loading && (
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
                : 'Amazing! You\'ve conquered all your travel dares'
              }
            </p>
          </div>
        )}

        {/* Motivational Footer */}
        {bucketItems.length > 0 && (
          <div className="pixel-card bg-gray-900/30 mt-6 sm:mb-8 border border-gray-700">
            <div className="text-center">
              <p className="outfit-text text-gray-500 text-xs sm:text-sm">
                🔥 {completedCount > 0 ? `You've conquered ${completedCount} dares!` : 'Ready to be brave?'} • 
                <span className="text-red-400 ml-1">
                  {totalCount - completedCount > 0 ? `${totalCount - completedCount} dares await your courage` : 'You are a travel legend!'}
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