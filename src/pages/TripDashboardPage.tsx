import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Gamepad2, MapPin, CheckSquare, Calendar, Trophy, Lightbulb, Target, Loader2, ExternalLink, CheckCircle2, Circle, Star, Zap, Share2, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BackButton from '../components/BackButton';
import AuthStatus from '../components/AuthStatus';
import AuthModal from '../components/AuthModal';
import ShareTripModal from '../components/ShareTripModal';
import { ChecklistItem } from '../types';
import { defaultChecklist } from '../data/defaultChecklist';
import daresData from '../data/dares.json';
import { invitationService } from '../services/invitationService';

interface TripDetails {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  max_participants?: number;
  user_id?: string;
  participant_ids?: string[];
  owner_email?: string;
  owner_display_name?: string;
}

interface UserDare {
  id: string;
  user_id: string;
  trip_id: string;
  bucket_item_id: string;
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
  const [tripNumber, setTripNumber] = useState(1);
  const [acceptedUsers, setAcceptedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTips, setLoadingTips] = useState(true);
  const [loadingDares, setLoadingDares] = useState(true);
  const [tips, setTips] = useState<RedditTip[]>([]);
  const [userDares, setUserDares] = useState<UserDare[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isUserOwner, setIsUserOwner] = useState(false);
  const [canAccessTrip, setCanAccessTrip] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tipsError, setTipsError] = useState<string | null>(null);
  const [tripOwner, setTripOwner] = useState<{id: string, display_name?: string, email?: string} | null>(null);

  const fetchRedditTips = async (city: string, country: string) => {
    try {
      setLoadingTips(true);
      setTipsError(null);

      // Validate environment variables first
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Missing Supabase environment variables - tips feature disabled');
        setTipsError('Configuration missing');
        setTips([]);
        return;
      }

      // Check if the URL is a placeholder
      if (supabaseUrl.includes('your-project') || supabaseUrl === 'https://your-project-id.supabase.co') {
        console.warn('Supabase URL appears to be a placeholder value - tips feature disabled');
        setTipsError('Configuration incomplete');
        setTips([]);
        return;
      }

      const functionUrl = `${supabaseUrl}/functions/v1/get-reddit-tips`;
      
      console.log('Attempting to fetch Reddit tips from:', functionUrl);

      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ city, country }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read error response');
          console.warn('Edge function response error:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          
          // If it's a 404, the function doesn't exist
          if (response.status === 404) {
            console.warn('get-reddit-tips Edge Function not found. Tips feature disabled.');
            setTipsError('Function not deployed');
            setTips([]);
            return;
          }
          
          setTipsError(`Service error (${response.status})`);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const redditTips = await response.json();
        console.log('Successfully fetched Reddit tips:', redditTips);
        setTips(Array.isArray(redditTips) ? redditTips : []);
        setTipsError(null);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // More detailed error logging
        console.warn('Detailed fetch error:', {
          name: fetchError?.name,
          message: fetchError?.message,
          stack: fetchError?.stack,
          cause: fetchError?.cause
        });
        
        if (fetchError.name === 'AbortError') {
          console.warn('Reddit tips request timed out - tips feature disabled for this session');
          setTipsError('Request timeout');
        } else if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
          console.warn('Network error connecting to Edge Function - tips feature disabled for this session. This could be due to:');
          console.warn('- Edge Function not deployed');
          console.warn('- Network connectivity issues');
          console.warn('- CORS configuration problems');
          console.warn('- Supabase project configuration issues');
          setTipsError('Connection failed');
        } else {
          console.warn('Unexpected error fetching Reddit tips:', fetchError);
          setTipsError('Service unavailable');
        }
        
        setTips([]);
      }
    } catch (error: any) {
      console.warn('Error in fetchRedditTips wrapper:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      });
      setTipsError('Unexpected error');
      setTips([]);
    } finally {
      setLoadingTips(false);
    }
  };

  const fetchUserDares = async (userId: string, tripId: string) => {
    try {
      setLoadingDares(true);

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

  const fetchAcceptedUsers = async (tripId: string) => {
    try {
      // Use the new RPC function for better data consistency
      const { data: participants, error } = await supabase.rpc('get_trip_participants_with_users', {
        p_trip_id: tripId
      });

      if (error) {
        console.error('Error fetching participants via RPC:', error);
        setAcceptedUsers([]);
        return;
      }

      if (!participants || participants.length === 0) {
        setAcceptedUsers([]);
        return;
      }

      console.log('Participants data:', participants);

      // Transform the RPC result to match expected format
      const enrichedUsers = participants.map((participant: any) => ({
        user_id: participant.user_id,
        role: participant.role,
        joined_at: participant.joined_at,
        user: {
          id: participant.user_id,
          display_name: participant.user_display_name || participant.user_email?.split('@')[0] || 'Unknown',
          email: participant.user_email || 'Unknown'
        }
      }));

      setAcceptedUsers(enrichedUsers);
      
      // Find the owner in the participants list
      const owner = enrichedUsers.find(user => user.role === 'owner');
      if (owner) {
        setTripOwner({
          id: owner.user_id,
          display_name: owner.user.display_name,
          email: owner.user.email
        });
      }
    } catch (error) {
      console.error('Error fetching accepted users:', error);
      setAcceptedUsers([]);
    }
  };

  const fetchChecklistItems = async (userId: string, tripId: string) => {
    try {
      const { data: existingItems } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('user_id', userId)
        .eq('trip_id', tripId);

      if (existingItems && existingItems.length > 0) {
        setChecklistItems(existingItems);
      } else {
        // Create default checklist items for this user and trip
        const defaultItems = [];
        defaultChecklist.forEach(category => {
          category.items.forEach(item => {
            defaultItems.push({
              user_id: userId,
              trip_id: tripId,
              category: category.name,
              description: item.description,
              is_completed: false,
              is_default: true
            });
          });
        });

        const { data: insertedItems, error: insertError } = await supabase
          .from('checklist_items')
          .upsert(defaultItems, {
            onConflict: 'user_id, trip_id, description'
          })
          .select();

        if (!insertError && insertedItems) {
          setChecklistItems(insertedItems);
        }
      }
    } catch (error) {
      console.error('Error fetching checklist items:', error);
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
    if (!currentUser) return;

    const usedDareIds = userDares.map(ud => ud.bucket_item_id);
    const availableDares = daresData.filter(dare => !usedDareIds.includes(dare.id));

    if (availableDares.length === 0) return;

    const randomDare = availableDares[Math.floor(Math.random() * availableDares.length)];

    const { data, error } = await supabase
      .from('user_bucket_progress')
      .insert({
        user_id: currentUser.id,
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

  const checkTripAccess = async (user: any, tripData: any) => {
    // Check if user owns the trip
    if (tripData.user_id === user.id) {
      setIsUserOwner(true);
      setCanAccessTrip(true);
      return true;
    }

    // Check if user is in participant_ids array
    if (tripData.participant_ids && tripData.participant_ids.includes(user.id)) {
      setCanAccessTrip(true);
      return true;
    }

    // User has no access to this trip
    navigate('/my-trips');
    return false;
  };

  const fetchTripDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Use the new RPC function for better data consistency
      const { data: tripData, error: tripError } = await supabase.rpc('get_trip_with_participants', {
        p_trip_id: tripId
      });

      if (tripError || !tripData || tripData.length === 0) {
        console.error('Trip not found:', tripError);
        navigate('/my-trips');
        return;
      }

      const trip = tripData[0];
      console.log('Trip data from RPC:', trip);
      
      setTrip({
        id: trip.trip_id,
        destination: trip.destination,
        start_date: trip.start_date,
        end_date: trip.end_date,
        max_participants: trip.max_participants,
        user_id: trip.user_id,
        participant_ids: trip.participant_ids,
        owner_email: trip.owner_email,
        owner_display_name: trip.owner_display_name
      });

      // Set trip owner information
      if (trip.user_id) {
        setTripOwner({
          id: trip.user_id,
          display_name: trip.owner_display_name || trip.owner_email?.split('@')[0] || 'Unknown',
          email: trip.owner_email
        });
      }

      const [city, country] = trip.destination.split(', ');

      // Always try to fetch tips but don't let errors break the flow
      fetchRedditTips(city, country).catch(error => {
        console.warn('Tips fetch failed silently:', error);
        setTipsError('Service unavailable');
        setTips([]);
        setLoadingTips(false);
      });

      try {
        await fetchAcceptedUsers(tripId!);
      } catch (usersError) {
        console.warn('Failed to fetch accepted users:', usersError);
        setAcceptedUsers([]);
      }

      if (user) {
        // Check if user can access this trip
        const hasAccess = await checkTripAccess(user, trip);
        
        if (hasAccess) {
          // Fetch user-specific data
          try {
            await fetchUserDares(user.id, tripId!);
          } catch (daresError) {
            console.warn('Failed to fetch user dares:', daresError);
            setUserDares([]);
            setLoadingDares(false);
          }

          try {
            await fetchChecklistItems(user.id, tripId!);
          } catch (checklistError) {
            console.warn('Failed to fetch checklist items:', checklistError);
          }
        }

        // Get trip number for this user
        try {
          const { data: allTrips } = await supabase
            .from('trips')
            .select('id, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

          if (allTrips) {
            const currentTripIndex = allTrips.findIndex((t) => t.id === tripId);
            setTripNumber(currentTripIndex + 1);
          }
        } catch (tripNumberError) {
          console.warn('Failed to get trip number:', tripNumberError);
        }
      } else {
        // Not authenticated, show auth modal
        setShowAuthModal(true);
      }

    } catch (error) {
      console.error('Error fetching trip details:', error);
      navigate('/my-trips');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = async () => {
    setShowAuthModal(false);
    setLoading(true);
    await fetchTripDetails();
  };

  useEffect(() => {
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

  const getTipsErrorMessage = () => {
    switch (tipsError) {
      case 'Configuration missing':
        return 'Supabase configuration is missing';
      case 'Configuration incomplete':
        return 'Supabase configuration is incomplete';
      case 'Function not deployed':
        return 'Tips service is not deployed';
      case 'Connection failed':
        return 'Unable to connect to tips service';
      case 'Request timeout':
        return 'Tips service request timed out';
      case 'Service unavailable':
        return 'Tips service is temporarily unavailable';
      default:
        return 'Tips service is currently unavailable';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="pixel-text text-blue-400">LOADING...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen">
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => navigate('/my-trips')}
          onSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  if (!canAccessTrip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="pixel-text text-red-400 mb-4">ACCESS DENIED</p>
          <p className="outfit-text text-gray-400 mb-6">You don't have access to this trip.</p>
          <button
            onClick={() => navigate('/my-trips')}
            className="pixel-button-secondary"
          >
            BACK TO MY TRIPS
          </button>
        </div>
      </div>
    );
  }

  const { totalTasks, completedTasks, remainingTasks } = getChecklistSummary();
  const { totalDares, completedDares, remainingDares } = getDaresSummary();
  const incompleteDares = getIncompleteDares();
  const completedDaresList = getCompletedDares();

  // Calculate total people who can access the trip (owner + participants, excluding owner from participants count)
  const totalAccessibleUsers = acceptedUsers.length;

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        <div className="flex items-center justify-between mb-6 sm:mb-8 relative z-[100]">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="pixel-text text-xl sm:text-2xl lg:text-3xl">TRIP DASHBOARD</h1>
          </div>
          <AuthStatus />
        </div>

        <div className="pixel-card bg-gray-900/90 mb-6 sm:mb-8 border-2 border-blue-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4 sm:mb-6">
            <Trophy className="h-10 sm:h-12 w-10 sm:w-12 text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="pixel-text text-yellow-400 text-sm sm:text-base">
                  TRIP #{tripNumber}
                </h3>
                {/* Share Trip Button - Always visible for trip owners */}
                {isUserOwner && (
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="pixel-button-secondary text-xs px-3 py-1 flex items-center gap-1 hover:scale-105 transition-transform"
                  >
                    <Share2 className="w-3 h-3" />
                    INVITE FRIENDS
                  </button>
                )}
              </div>
              <p className="outfit-text text-gray-400 text-sm sm:text-base">
                {tripNumber === 1 ? 'Congratulations on starting your first adventure!' : 'Keep exploring, adventurer!'}
              </p>
              
              {/* Show trip members */}
              {acceptedUsers.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="pixel-text text-xs text-blue-400">ADVENTURERS ({totalAccessibleUsers})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* Show all participants including owner */}
                    {acceptedUsers.map((participant) => (
                      <div
                        key={participant.user_id}
                        className="bg-gray-800 px-2 py-1 rounded text-xs outfit-text text-gray-300 border border-gray-700"
                      >
                        {participant.user.display_name || participant.user.email?.split('@')[0] || 'Unknown'}
                        {participant.role === 'owner' && <span className="ml-1 text-yellow-400">👑</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

        <div className="pixel-card bg-gray-900/90 border-2 border-purple-500/20 flex items-center justify-center mb-6 sm:mb-8">
          <span className="pixel-text text-purple-400 text-xs sm:text-sm">BADGES COMING SOON</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Checklist Card */}
          <div className="pixel-card bg-gray-900/90 border-2 border-blue-500/20">
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

            <div className="text-center p-3 sm:p-4 bg-gray-800/80 backdrop-blur-sm border border-blue-500/10 mb-4 sm:mb-6">
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
          <div className="pixel-card bg-gray-900/90 border-2 border-blue-500/20">
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
        <div className="pixel-card bg-gray-900/90 mb-6 sm:mb-8 border-2 border-red-500/20">
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
                          className="pixel-card bg-gray-800/90 border border-red-500/10 hover:border-red-500/30 transition-all cursor-pointer group"
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
        <div className="pixel-card bg-gray-900/90 border-2 border-blue-500/20">
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
                <div key={tip.id} className="pixel-card bg-gray-800/90 border border-blue-500/10 hover:border-blue-500/30 transition-all">
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
              <div className="text-3xl sm:text-4xl mb-4">💡</div>
              <h3 className="pixel-text text-yellow-400 mb-2 text-sm sm:text-base">TIPS UNAVAILABLE</h3>
              <p className="outfit-text text-gray-500 text-sm">
                {getTipsErrorMessage()} for {trip?.destination}. Please check back later!
              </p>
              {tipsError === 'Function not deployed' && (
                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded">
                  <p className="outfit-text text-yellow-400 text-xs">
                    💡 <strong>Developer Note:</strong> The tips feature requires the get-reddit-tips Edge Function to be deployed to Supabase.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => navigate('/my-trips')}
        onSuccess={handleAuthSuccess}
      />

      {trip && (
        <ShareTripModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          tripId={trip.id}
          tripDestination={trip.destination}
          maxParticipants={trip.max_participants || 4}
          currentParticipants={totalAccessibleUsers}
        />
      )}
    </div>
  );
};

export default TripDashboardPage;