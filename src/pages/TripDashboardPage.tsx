import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Gamepad2, MapPin, CheckSquare, Calendar, Trophy, Lightbulb, Target, Loader2, ExternalLink, CheckCircle2, Circle, Star, Zap, Share2, Users, Award, Crown, BookOpen, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BackButton from '../components/BackButton';
import { AuthStatus } from '../components/AuthStatus';
import AuthModal from '../components/AuthModal';
import ShareTripModal from '../components/ShareTripModal';
import BadgeGrid from '../components/BadgeGrid';
import { useBadgeTracking } from '../hooks/useBadgeTracking';
import { ChecklistItem } from '../types';
import { defaultChecklist } from '../data/defaultChecklist';
import daresData from '../data/dares.json';

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
  const [diaryEntries, setDiaryEntries] = useState<any[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isUserOwner, setIsUserOwner] = useState(false);
  const [canAccessTrip, setCanAccessTrip] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tipsError, setTipsError] = useState<string | null>(null);
  const [tripOwner, setTripOwner] = useState<{id: string, display_name?: string, email?: string} | null>(null);

  // Badge tracking hook
  const { checkAllBadges, trackDareCompletion, trackChecklistCompletion } = useBadgeTracking(
    currentUser?.id || null, 
    tripId || null
  );

  const fetchTripDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: tripData, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (error || !tripData) {
        console.error('Trip not found:', error);
        navigate('/my-trips');
        return;
      }

      setTrip(tripData);
      setIsUserOwner(tripData.user_id === user.id);
    } catch (error) {
      console.error('Error fetching trip details:', error);
      navigate('/my-trips');
    } finally {
      setLoading(false);
    }
  };

  const fetchDiaryEntries = async (userId: string, tripId: string) => {
    try {
      const { data: entries, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('trip_id', tripId)
        .order('day_number', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error fetching diary entries:', error);
        return;
      }

      setDiaryEntries(entries || []);
    } catch (error) {
      console.error('Error fetching diary entries:', error);
      setDiaryEntries([]);
    }
  };

  useEffect(() => {
    fetchTripDetails();
  }, [tripId]);

  const handleAuthSuccess = async () => {
    setShowAuthModal(false);
    setLoading(true);
    await fetchTripDetails();
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

        {/* Game Card */}
        <div className="pixel-card bg-gray-900/90 border-2 border-blue-500/20 mb-6 sm:mb-8">
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
          <button
            onClick={() => navigate(`/diary?tripId=${tripId}`)}
            className="pixel-button-secondary w-full mt-3 flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 sm:w-5 h-4 sm:h-5" />
            OPEN DIARY
          </button>
        </div>

        {/* Other content (e.g., badge grid, checklist, etc.) */}
        <div className="pixel-card bg-gray-900/90 mb-6 sm:mb-8 border-2 border-yellow-500/20">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <Award className="h-5 sm:h-6 w-5 sm:w-6 text-yellow-500" />
              <h3 className="pixel-text text-sm sm:text-lg">ACHIEVEMENT BADGES</h3>
            </div>
            <button 
              onClick={() => navigate(`/badges?tripId=${tripId}`)}
              className="pixel-text text-xs sm:text-sm text-blue-400 hover:text-blue-300"
            >
              VIEW ALL
            </button>
          </div>

          {currentUser ? (
            <BadgeGrid 
              userId={currentUser.id} 
              tripId={tripId || undefined}
              showCategories={false}
              compact={true}
            />
          ) : (
            <div className="text-center py-8">
              <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-4 opacity-50" />
              <p className="pixel-text text-yellow-400 text-sm">SIGN IN TO VIEW BADGES</p>
            </div>
          )}
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
            currentParticipants={acceptedUsers.length}
          />
        )}
      </div>
    </div>
  );
};

export default TripDashboardPage;
