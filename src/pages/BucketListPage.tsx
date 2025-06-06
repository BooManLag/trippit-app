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
    'Adventure', 'Shopping', 'Nature', 'Nightlife', 'Photography',
    'Local Life', 'Entertainment', 'Wellness'
  ];

  // 30+ predefined bucket list items that get randomized
  const allBucketListItems = [
    {
      title: 'Eat Something Wildly Local (Without Googling First)',
      description: 'Order the most mysterious-looking street food you can find. Embrace the unknown flavors!',
      category: 'Food & Drink'
    },
    {
      title: 'Learn & Use a Local Slang Phrase in Public',
      description: 'Ask a local for a funny expression. Drop it into conversation at least once—bonus points for pronunciation!',
      category: 'Culture'
    },
    {
      title: 'Improvise a Local Dance Move on the Street',
      description: 'Find a busy plaza, drop coins for street musicians, and bust out your best traditional dance attempt!',
      category: 'Culture'
    },
    {
      title: 'Make One "100% Tourist" Photo—Pridefully',
      description: 'Pose in front of the biggest cliché landmark with goofy props or dramatic pose. No shame—only glory!',
      category: 'Photography'
    },
    {
      title: 'Challenge a Stranger to a Mini Talent Swap',
      description: 'Teach someone a party trick, ask them to teach you something local—song snippet, hand gesture, etc.',
      category: 'Local Life'
    },
    {
      title: 'Use Public Transport in "Stealth Mode"',
      description: 'Ride local transport without studying routes—just hop on and ask "is this going downtown?"',
      category: 'Adventure'
    },
    {
      title: 'Find & Photograph the Hackiest Tourist Souvenir',
      description: 'Seek out the most bizarre magnet or keychain that screams "tourist." Wear/use it for a day!',
      category: 'Shopping'
    },
    {
      title: 'Crash a Local Gathering (Festival, Market, etc.)',
      description: 'Spot a public festival or lively market—step in, join the circle, and participate for five minutes.',
      category: 'Local Life'
    },
    {
      title: 'Barter Like a Boss',
      description: 'At a market stall, negotiate a discount on something you don\'t need. Aim for at least 20% off!',
      category: 'Shopping'
    },
    {
      title: 'Speak Only in Questions for 10 Minutes',
      description: 'Challenge yourself to ask every sentence as a question and see how locals react.',
      category: 'Culture'
    },
    {
      title: 'Send a Postcard to Yourself with Tomorrow\'s Challenge',
      description: 'Write "Try the spiciest local snack tomorrow!" and mail it. Hilarious reminder when it arrives home!',
      category: 'Experience'
    },
    {
      title: 'Attempt at Least One Local "Extreme" Activity',
      description: 'Zip-lining? Sandboarding? Even if mild back home, try the local version!',
      category: 'Adventure'
    },
    {
      title: 'Learn One Traditional Toast & Down a Local Drink',
      description: 'Ask for their classic "cheers" toast, sample their favorite beverage, perform it in native language.',
      category: 'Food & Drink'
    },
    {
      title: 'Perform a Random Act of "Tourist Kindness"',
      description: 'Buy coffee for a stranger, help carry groceries, or feed pigeons—spread good tourist vibes!',
      category: 'Experience'
    },
    {
      title: 'Discover & Share a Local "Spooky Legend"',
      description: 'Research a ghost story or urban legend. Whisper it dramatically to friends at night!',
      category: 'Culture'
    },
    {
      title: 'Get a Local to Teach You a Secret Greeting',
      description: 'Learn a special handshake or greeting. Use it at least three times before leaving!',
      category: 'Local Life'
    },
    {
      title: 'Attempt Phrasebook Karaoke',
      description: 'Find a popular local song, grab lyrics, and film yourself singing it—off-key encouraged!',
      category: 'Entertainment'
    },
    {
      title: 'Eat Dessert First—Local Style',
      description: 'Order the sweetest street dessert as your very first bite of the day, then proceed normally.',
      category: 'Food & Drink'
    },
    {
      title: 'Snap a Selfie Mimicking a Local Icon',
      description: 'Find a statue or mural, strike a pose that mimics it, embrace the cheesy matching moment.',
      category: 'Photography'
    },
    {
      title: 'Leave Your Mark (Respectfully)',
      description: 'Use washable chalk to draw a tiny doodle on a permitted spot as your "tourist signature."',
      category: 'Experience'
    },
    {
      title: 'Master the Art of Local Coffee Ordering',
      description: 'Learn exactly how locals order their morning coffee. Nail the pronunciation and etiquette.',
      category: 'Food & Drink'
    },
    {
      title: 'Find the Best Local Sunset/Sunrise Spot',
      description: 'Ask three different locals for their favorite golden hour location. Visit the most recommended.',
      category: 'Nature'
    },
    {
      title: 'Attend a Local Sports Event or Match',
      description: 'Experience the passion of local sports culture—even if you don\'t understand the rules!',
      category: 'Entertainment'
    },
    {
      title: 'Navigate Using Only Landmark Directions',
      description: 'Ask for directions using only landmarks ("turn left at the big tree") instead of street names.',
      category: 'Adventure'
    },
    {
      title: 'Try a Local Wellness or Spa Tradition',
      description: 'Experience traditional baths, massage styles, or wellness practices unique to the region.',
      category: 'Wellness'
    },
    {
      title: 'Photograph 5 Different Local Door Styles',
      description: 'Capture the unique architectural personality of the place through its diverse doorways.',
      category: 'Photography'
    },
    {
      title: 'Learn to Cook One Local Dish',
      description: 'Take a cooking class or convince a local to teach you their family recipe.',
      category: 'Food & Drink'
    },
    {
      title: 'Experience Local Nightlife Like a Resident',
      description: 'Ask locals where THEY go for fun at night—avoid tourist traps, find authentic spots.',
      category: 'Nightlife'
    },
    {
      title: 'Collect Sounds of the City',
      description: 'Record 1-minute audio clips of unique local sounds—markets, music, street calls, nature.',
      category: 'Experience'
    },
    {
      title: 'Find the Oldest Thing in the City',
      description: 'Hunt down the most ancient building, tree, or artifact. Learn its story.',
      category: 'Culture'
    },
    {
      title: 'Master Local Public Transport Etiquette',
      description: 'Learn the unwritten rules—where to stand, how to pay, what\'s considered polite.',
      category: 'Local Life'
    },
    {
      title: 'Discover a Hidden Local Gem',
      description: 'Find a place that\'s not in guidebooks but locals love—ask "where do you go to relax?"',
      category: 'Sightseeing'
    },
    {
      title: 'Experience Local Weather Like a Pro',
      description: 'Learn how locals dress and behave in their typical weather. Adapt your style accordingly.',
      category: 'Local Life'
    },
    {
      title: 'Find the Best Local Viewpoint',
      description: 'Discover where locals go for the best city views—not necessarily the most famous tourist spot.',
      category: 'Nature'
    },
    {
      title: 'Learn a Traditional Local Game',
      description: 'Find locals playing cards, board games, or street games. Ask them to teach you!',
      category: 'Entertainment'
    }
  ];

  // Function to get randomized bucket list items (max 10)
  const getRandomizedBucketItems = () => {
    const shuffled = [...allBucketListItems].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
  };

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

        setBucketItems(items || []);

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

  const addPredefinedItem = async (bucketItem: typeof allBucketListItems[0]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('bucket_list_items')
      .insert({
        user_id: user.id,
        trip_id: tripId,
        title: bucketItem.title,
        description: bucketItem.description,
        category: bucketItem.category,
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
      'Experience': '✨',
      'Photography': '📸',
      'Local Life': '🏠',
      'Entertainment': '🎭',
      'Wellness': '🧘'
    };
    return icons[category] || '✨';
  };

  // Filter out predefined items that are already added
  const availableItems = getRandomizedBucketItems().filter(item => 
    !bucketItems.some(bucketItem => bucketItem.title === item.title)
  );

  const filteredItems = bucketItems.filter(item => {
    const matchesCompletion = showCompleted ? item.is_completed : !item.is_completed;
    return matchesCompletion;
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
            <h2 className="pixel-text mobile-heading">BUCKET LIST</h2>
            {trip && (
              <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base break-words">
                Epic experiences for {trip.destination}
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

        {/* Add Item Section */}
        <div className="pixel-card bg-gray-900 mb-6 sm:mb-8 border-2 border-green-500/20">
          <h3 className="pixel-text text-green-400 mb-4 text-sm sm:text-base">ADD NEW BUCKET LIST ITEM</h3>
          
          {/* Predefined Items Dropdown */}
          {availableItems.length > 0 && (
            <div className="mb-4">
              <label className="block pixel-text text-xs text-blue-400 mb-2">CHOOSE FROM CURATED LIST</label>
              <div className="relative">
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="w-full flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-blue-500/20 text-white hover:border-blue-500/40 transition-colors text-sm sm:text-base"
                >
                  <span className="outfit-text">Select an experience... ({availableItems.length} available)</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showCategoryDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-blue-500/20 z-10 max-h-80 overflow-auto">
                    {availableItems.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          addPredefinedItem(item);
                          setShowCategoryDropdown(false);
                        }}
                        className="w-full px-3 sm:px-4 py-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-lg flex-shrink-0">{getCategoryIcon(item.category)}</span>
                          <div className="min-w-0 flex-1">
                            <div className="outfit-text font-semibold text-white text-sm mb-1 break-words">
                              {item.title}
                            </div>
                            <div className="outfit-text text-xs text-gray-400 mb-2 break-words">
                              {item.description}
                            </div>
                            <div className="pixel-text text-xs text-blue-400">
                              {item.category}
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

          {/* Custom Item Option */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="pixel-button-secondary flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {showAddForm ? 'CANCEL CUSTOM' : 'CREATE CUSTOM'}
            </button>
          </div>

          {/* Custom Item Form */}
          {showAddForm && (
            <div className="mt-4 space-y-4 border-t border-gray-700 pt-4">
              <div>
                <label className="block pixel-text text-xs text-blue-400 mb-2">CUSTOM ITEM TITLE</label>
                <input
                  type="text"
                  value={newItem.title}
                  onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="What's your custom bucket list item?"
                  className="w-full input-pixel"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block pixel-text text-xs text-blue-400 mb-2">DESCRIPTION</label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your bucket list item..."
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
                ADD CUSTOM ITEM
              </button>
            </div>
          )}
        </div>

        {/* Completion Filter */}
        <div className="pixel-card bg-gray-900 mb-6 sm:mb-8 border-2 border-blue-500/20">
          <div className="flex gap-2">
            <button
              onClick={() => setShowCompleted(false)}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm transition-colors ${
                !showCompleted
                  ? 'bg-blue-500 text-white'
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

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <Loader2 className="w-6 sm:w-8 h-6 sm:h-8 text-blue-500 animate-spin mr-3" />
            <span className="pixel-text text-blue-400 text-sm sm:text-base">LOADING BUCKET LIST...</span>
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
                    : 'bg-gray-900 border-blue-500/20 hover:border-blue-500/40'
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
                      <Circle className="w-5 h-5 text-blue-500 hover:text-blue-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getCategoryIcon(item.category)}</span>
                      <span className="pixel-text text-xs text-blue-400">{item.category}</span>
                      {completed && <span className="pixel-text text-xs text-green-400">COMPLETED!</span>}
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
                        {completed ? 'COMPLETED!' : 'PENDING'}
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
              {showCompleted ? '🎉' : '🎯'}
            </div>
            <h3 className="pixel-text text-sm sm:text-lg text-gray-400 mb-2">
              {showCompleted ? 'NO COMPLETED ITEMS YET' : 'ALL ITEMS COMPLETED!'}
            </h3>
            <p className="outfit-text text-gray-500 text-sm sm:text-base">
              {showCompleted 
                ? 'Start checking off items to see your progress here'
                : 'Amazing! You\'ve completed all your bucket list items'
              }
            </p>
          </div>
        )}

        {/* Motivational Footer */}
        {bucketItems.length > 0 && (
          <div className="pixel-card bg-gray-900/30 mt-6 sm:mb-8 border border-gray-700">
            <div className="text-center">
              <p className="outfit-text text-gray-500 text-xs sm:text-sm">
                🎯 {completedCount > 0 ? `You've completed ${completedCount} items!` : 'Ready for adventure?'} • 
                <span className="text-blue-400 ml-1">
                  {totalCount - completedCount > 0 ? `${totalCount - completedCount} items await` : 'You are a travel legend!'}
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