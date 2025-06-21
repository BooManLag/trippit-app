import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Calendar, MapPin, Cloud, Heart, Share2, Lock, Unlock, Plus, Edit3, Save, X, Users, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthStatus } from '../components/AuthStatus';

interface DiaryEntry {
  id: string;
  user_id: string;
  trip_id: string;
  day_number: number;
  entry_date: string;
  title: string;
  content: string;
  mood: string;
  weather: string;
  location: string;
  photos: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    display_name: string;
    email: string;
  };
}

interface Trip {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  user_id: string;
}

const DiaryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId');
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myEntries, setMyEntries] = useState<DiaryEntry[]>([]);
  const [sharedEntries, setSharedEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'my' | 'shared'>('my');
  const [isVisible, setIsVisible] = useState(false);

  const moods = [
    { emoji: '😊', label: 'Happy' },
    { emoji: '😍', label: 'Excited' },
    { emoji: '😌', label: 'Relaxed' },
    { emoji: '🤔', label: 'Thoughtful' },
    { emoji: '😴', label: 'Tired' },
    { emoji: '🤩', label: 'Amazed' },
    { emoji: '😋', label: 'Satisfied' },
    { emoji: '🥺', label: 'Homesick' }
  ];

  const weatherOptions = [
    { emoji: '☀️', label: 'Sunny' },
    { emoji: '⛅', label: 'Partly Cloudy' },
    { emoji: '☁️', label: 'Cloudy' },
    { emoji: '🌧️', label: 'Rainy' },
    { emoji: '⛈️', label: 'Stormy' },
    { emoji: '🌨️', label: 'Snowy' },
    { emoji: '🌫️', label: 'Foggy' },
    { emoji: '🌈', label: 'Rainbow' }
  ];

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!tripId) {
        navigate('/');
        return;
      }

      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }
        setCurrentUser(user);

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

        // Fetch user's own diary entries
        const { data: myEntriesData } = await supabase
          .from('diary_entries')
          .select('*')
          .eq('user_id', user.id)
          .eq('trip_id', tripId)
          .order('day_number', { ascending: true });

        setMyEntries(myEntriesData || []);

        // Fetch shared diary entries from other trip participants
        const { data: sharedEntriesData } = await supabase
          .from('diary_entries')
          .select(`
            *,
            user:users(display_name, email)
          `)
          .eq('trip_id', tripId)
          .eq('is_published', true)
          .neq('user_id', user.id)
          .order('day_number', { ascending: true });

        setSharedEntries(sharedEntriesData || []);

      } catch (error) {
        console.error('Error fetching diary data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tripId, navigate]);

  const getTripDays = () => {
    if (!trip) return [];
    
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const days = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayNumber = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      days.push({
        number: dayNumber,
        date: new Date(d),
        hasEntry: myEntries.some(entry => entry.day_number === dayNumber)
      });
    }
    
    return days;
  };

  const createNewEntry = (dayNumber: number) => {
    const tripDays = getTripDays();
    const dayInfo = tripDays.find(d => d.number === dayNumber);
    
    if (!dayInfo || !currentUser) return;

    const newEntry: Partial<DiaryEntry> = {
      user_id: currentUser.id,
      trip_id: tripId!,
      day_number: dayNumber,
      entry_date: dayInfo.date.toISOString().split('T')[0],
      title: `Day ${dayNumber} in ${trip?.destination}`,
      content: '',
      mood: '',
      weather: '',
      location: '',
      photos: [],
      is_published: false
    };

    setEditingEntry(newEntry as DiaryEntry);
    setIsCreating(true);
  };

  const saveEntry = async () => {
    if (!editingEntry || !currentUser) return;

    try {
      if (isCreating) {
        const { data, error } = await supabase
          .from('diary_entries')
          .insert({
            user_id: currentUser.id,
            trip_id: tripId,
            day_number: editingEntry.day_number,
            entry_date: editingEntry.entry_date,
            title: editingEntry.title,
            content: editingEntry.content,
            mood: editingEntry.mood,
            weather: editingEntry.weather,
            location: editingEntry.location,
            photos: editingEntry.photos,
            is_published: editingEntry.is_published
          })
          .select()
          .single();

        if (!error && data) {
          setMyEntries(prev => [...prev, data].sort((a, b) => a.day_number - b.day_number));
        }
      } else {
        const { error } = await supabase
          .from('diary_entries')
          .update({
            title: editingEntry.title,
            content: editingEntry.content,
            mood: editingEntry.mood,
            weather: editingEntry.weather,
            location: editingEntry.location,
            photos: editingEntry.photos,
            is_published: editingEntry.is_published
          })
          .eq('id', editingEntry.id);

        if (!error) {
          setMyEntries(prev => 
            prev.map(entry => 
              entry.id === editingEntry.id ? editingEntry : entry
            )
          );
        }
      }

      setEditingEntry(null);
      setIsCreating(false);
    } catch (error) {
      console.error('Error saving diary entry:', error);
    }
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setIsCreating(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysSinceStart = () => {
    if (!trip) return 0;
    const start = new Date(trip.start_date);
    const today = new Date();
    return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const tripDays = getTripDays();
  const currentDay = getDaysSinceStart();

  return (
    <div className="min-h-screen bg-black text-white mobile-padding py-6 sm:py-8 lg:py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-2 h-2 bg-purple-500 rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-32 right-20 w-1 h-1 bg-pink-400 rounded-full animate-ping opacity-40"></div>
        <div className="absolute bottom-40 left-1/4 w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce opacity-50"></div>
        <div className="absolute top-1/2 right-10 w-1 h-1 bg-pink-400 rounded-full animate-pulse opacity-30"></div>
        <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-purple-500 rounded-full animate-ping opacity-40"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className={`flex items-center justify-between mb-6 sm:mb-8 lg:mb-12 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <button 
              onClick={() => tripId ? navigate(`/trip/${tripId}`) : navigate('/my-trips')} 
              className="text-blue-400 hover:text-blue-300 transition-colors hover:scale-110 flex-shrink-0"
            >
              <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-6 sm:w-8 h-6 sm:h-8 text-purple-400 animate-pulse flex-shrink-0" />
                <h2 className="pixel-text mobile-heading text-purple-400 glow-text">TRAVEL DIARY</h2>
                <Heart className="w-6 sm:w-8 h-6 sm:h-8 text-pink-400 animate-float flex-shrink-0" />
              </div>
              {trip && (
                <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base break-words">
                  Document your journey through {trip.destination}
                </p>
              )}
            </div>
          </div>
          <AuthStatus className="flex-shrink-0" />
        </div>

        {/* View Toggle */}
        <div className={`flex bg-gray-800 rounded-lg p-1 mb-6 sm:mb-8 animate-slide-in-up delay-200`}>
          <button
            onClick={() => setViewMode('my')}
            className={`px-4 py-2 rounded-md text-sm transition-all flex items-center gap-2 ${
              viewMode === 'my'
                ? 'bg-purple-500 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            MY DIARY ({myEntries.length})
          </button>
          <button
            onClick={() => setViewMode('shared')}
            className={`px-4 py-2 rounded-md text-sm transition-all flex items-center gap-2 ${
              viewMode === 'shared'
                ? 'bg-purple-500 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            SHARED STORIES ({sharedEntries.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 sm:py-16">
            <div className="animate-bounce-in">
              <BookOpen className="w-8 sm:w-12 h-8 sm:h-12 text-purple-500 animate-spin mr-3" />
              <span className="pixel-text text-purple-400 text-sm sm:text-base">LOADING DIARY...</span>
            </div>
          </div>
        ) : (
          <>
            {/* My Diary View */}
            {viewMode === 'my' && (
              <div className="space-y-6">
                {/* Trip Timeline */}
                <div className={`pixel-card bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-2 border-purple-500/30 animate-slide-in-up delay-300`}>
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="w-6 h-6 text-purple-400" />
                    <h3 className="pixel-text text-purple-400 text-sm sm:text-base lg:text-lg glow-text">
                      TRIP TIMELINE
                    </h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-purple-500/50 to-transparent"></div>
                    <span className="pixel-text text-xs text-purple-400">
                      Day {Math.max(1, currentDay)} of {tripDays.length}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-2 sm:gap-3">
                    {tripDays.map((day, index) => (
                      <button
                        key={day.number}
                        onClick={() => day.hasEntry ? setEditingEntry(myEntries.find(e => e.day_number === day.number) || null) : createNewEntry(day.number)}
                        className={`
                          p-2 sm:p-3 text-center transition-all duration-300 group relative
                          ${day.hasEntry 
                            ? 'bg-purple-500/20 border-2 border-purple-500/50 hover:border-purple-500/80' 
                            : 'bg-gray-800/50 border-2 border-gray-600/30 hover:border-purple-500/50'
                          }
                          ${day.number === currentDay ? 'ring-2 ring-yellow-400' : ''}
                          hover:scale-105
                        `}
                      >
                        <div className="pixel-text text-xs text-purple-400 mb-1">
                          DAY {day.number}
                        </div>
                        <div className="outfit-text text-xs text-gray-300">
                          {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        {day.hasEntry && (
                          <div className="absolute top-1 right-1">
                            <BookOpen className="w-3 h-3 text-purple-400" />
                          </div>
                        )}
                        {!day.hasEntry && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-4 h-4 text-purple-400" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Diary Entries */}
                <div className="space-y-4">
                  {myEntries.map((entry, index) => (
                    <div 
                      key={entry.id}
                      className={`pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 animate-slide-in-up`}
                      style={{ animationDelay: `${index * 100 + 400}ms` }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                            <span className="pixel-text text-purple-400 text-sm">
                              {entry.day_number}
                            </span>
                          </div>
                          <div>
                            <h4 className="outfit-text font-bold text-white text-base break-words">
                              {entry.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span className="outfit-text text-xs text-gray-400">
                                {formatDate(entry.entry_date)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {entry.is_published ? (
                            <div className="flex items-center gap-1 text-green-400">
                              <Eye className="w-4 h-4" />
                              <span className="pixel-text text-xs">SHARED</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Lock className="w-4 h-4" />
                              <span className="pixel-text text-xs">PRIVATE</span>
                            </div>
                          )}
                          <button
                            onClick={() => setEditingEntry(entry)}
                            className="text-blue-400 hover:text-blue-300 p-1"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Entry metadata */}
                      <div className="flex items-center gap-4 mb-3 flex-wrap">
                        {entry.mood && (
                          <div className="flex items-center gap-1">
                            <span className="text-lg">{entry.mood}</span>
                            <span className="pixel-text text-xs text-gray-400">MOOD</span>
                          </div>
                        )}
                        {entry.weather && (
                          <div className="flex items-center gap-1">
                            <span className="text-lg">{entry.weather}</span>
                            <span className="pixel-text text-xs text-gray-400">WEATHER</span>
                          </div>
                        )}
                        {entry.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="outfit-text text-xs text-gray-400">{entry.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Entry content */}
                      <div className="outfit-text text-gray-300 text-sm leading-relaxed break-words">
                        {entry.content.split('\n').map((paragraph, i) => (
                          <p key={i} className="mb-2 last:mb-0">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Empty state for my diary */}
                {myEntries.length === 0 && (
                  <div className="text-center py-12 animate-bounce-in delay-500">
                    <div className="text-6xl mb-4">📖</div>
                    <h3 className="pixel-text text-xl text-purple-400 mb-4">START YOUR TRAVEL DIARY</h3>
                    <p className="outfit-text text-gray-500 mb-6">
                      Document your daily adventures and create lasting memories of your trip to {trip?.destination}
                    </p>
                    <button
                      onClick={() => createNewEntry(Math.max(1, currentDay))}
                      className="pixel-button-primary bg-purple-600 hover:bg-purple-500"
                    >
                      WRITE FIRST ENTRY
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Shared Stories View */}
            {viewMode === 'shared' && (
              <div className="space-y-4">
                {sharedEntries.map((entry, index) => (
                  <div 
                    key={entry.id}
                    className={`pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-pink-500/20 hover:border-pink-500/40 transition-all duration-300 animate-slide-in-up`}
                    style={{ animationDelay: `${index * 100 + 300}ms` }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center">
                          <span className="pixel-text text-pink-400 text-sm">
                            {entry.day_number}
                          </span>
                        </div>
                        <div>
                          <h4 className="outfit-text font-bold text-white text-base break-words">
                            {entry.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="outfit-text text-xs text-pink-400 font-semibold">
                              by {entry.user?.display_name || entry.user?.email?.split('@')[0] || 'Unknown'}
                            </span>
                            <span className="text-gray-500">•</span>
                            <span className="outfit-text text-xs text-gray-400">
                              {formatDate(entry.entry_date)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 text-green-400">
                        <Share2 className="w-4 h-4" />
                        <span className="pixel-text text-xs">SHARED</span>
                      </div>
                    </div>

                    {/* Entry metadata */}
                    <div className="flex items-center gap-4 mb-3 flex-wrap">
                      {entry.mood && (
                        <div className="flex items-center gap-1">
                          <span className="text-lg">{entry.mood}</span>
                          <span className="pixel-text text-xs text-gray-400">MOOD</span>
                        </div>
                      )}
                      {entry.weather && (
                        <div className="flex items-center gap-1">
                          <span className="text-lg">{entry.weather}</span>
                          <span className="pixel-text text-xs text-gray-400">WEATHER</span>
                        </div>
                      )}
                      {entry.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span className="outfit-text text-xs text-gray-400">{entry.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Entry content */}
                    <div className="outfit-text text-gray-300 text-sm leading-relaxed break-words">
                      {entry.content.split('\n').map((paragraph, i) => (
                        <p key={i} className="mb-2 last:mb-0">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Empty state for shared stories */}
                {sharedEntries.length === 0 && (
                  <div className="text-center py-12 animate-bounce-in delay-300">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="pixel-text text-xl text-pink-400 mb-4">NO SHARED STORIES YET</h3>
                    <p className="outfit-text text-gray-500 mb-6">
                      When your travel companions share their diary entries, they'll appear here
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Edit/Create Modal */}
        {editingEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="pixel-card max-w-2xl w-full relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={cancelEdit}
                className="absolute top-3 right-3 text-gray-400 hover:text-white z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <h3 className="pixel-text text-lg text-purple-400 mb-2">
                  {isCreating ? 'NEW DIARY ENTRY' : 'EDIT DIARY ENTRY'}
                </h3>
                <p className="outfit-text text-gray-400 text-sm">
                  Day {editingEntry.day_number} • {formatDate(editingEntry.entry_date)}
                </p>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block pixel-text text-xs text-purple-400 mb-2">
                    📝 TITLE
                  </label>
                  <input
                    type="text"
                    value={editingEntry.title}
                    onChange={(e) => setEditingEntry({...editingEntry, title: e.target.value})}
                    className="w-full input-pixel"
                    placeholder="Give your day a title..."
                  />
                </div>

                {/* Mood and Weather */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block pixel-text text-xs text-purple-400 mb-2">
                      😊 MOOD
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {moods.map((mood) => (
                        <button
                          key={mood.label}
                          type="button"
                          onClick={() => setEditingEntry({...editingEntry, mood: mood.emoji})}
                          className={`p-2 text-center transition-all ${
                            editingEntry.mood === mood.emoji
                              ? 'bg-purple-500/30 border-2 border-purple-500'
                              : 'bg-gray-800 border-2 border-gray-600 hover:border-purple-500/50'
                          }`}
                        >
                          <div className="text-lg">{mood.emoji}</div>
                          <div className="text-xs text-gray-400">{mood.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block pixel-text text-xs text-purple-400 mb-2">
                      🌤️ WEATHER
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {weatherOptions.map((weather) => (
                        <button
                          key={weather.label}
                          type="button"
                          onClick={() => setEditingEntry({...editingEntry, weather: weather.emoji})}
                          className={`p-2 text-center transition-all ${
                            editingEntry.weather === weather.emoji
                              ? 'bg-purple-500/30 border-2 border-purple-500'
                              : 'bg-gray-800 border-2 border-gray-600 hover:border-purple-500/50'
                          }`}
                        >
                          <div className="text-lg">{weather.emoji}</div>
                          <div className="text-xs text-gray-400">{weather.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block pixel-text text-xs text-purple-400 mb-2">
                    📍 LOCATION
                  </label>
                  <input
                    type="text"
                    value={editingEntry.location}
                    onChange={(e) => setEditingEntry({...editingEntry, location: e.target.value})}
                    className="w-full input-pixel"
                    placeholder="Where were you today?"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block pixel-text text-xs text-purple-400 mb-2">
                    ✍️ YOUR STORY
                  </label>
                  <textarea
                    value={editingEntry.content}
                    onChange={(e) => setEditingEntry({...editingEntry, content: e.target.value})}
                    className="w-full input-pixel h-32 resize-none"
                    placeholder="Tell the story of your day..."
                    required
                  />
                </div>

                {/* Privacy Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700 rounded">
                  <div className="flex items-center gap-2">
                    {editingEntry.is_published ? (
                      <Unlock className="w-4 h-4 text-green-400" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="outfit-text text-sm">
                      {editingEntry.is_published ? 'Shared with trip participants' : 'Private diary entry'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingEntry({...editingEntry, is_published: !editingEntry.is_published})}
                    className={`px-3 py-1 rounded text-xs transition-all ${
                      editingEntry.is_published
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-gray-700 text-gray-400 border border-gray-600'
                    }`}
                  >
                    {editingEntry.is_published ? 'SHARED' : 'PRIVATE'}
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={cancelEdit}
                    className="pixel-button-secondary flex-1"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={saveEntry}
                    disabled={!editingEntry.content.trim()}
                    className="pixel-button-primary flex-1 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isCreating ? 'CREATE ENTRY' : 'SAVE CHANGES'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiaryPage;