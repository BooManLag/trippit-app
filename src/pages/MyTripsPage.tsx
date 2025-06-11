import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, isAuthenticated } from '../lib/supabase';
import { MapPin, Loader2, PlusCircle, Trash2, Play, Calendar, Star, Users, Crown, Share2 } from 'lucide-react';
import BackButton from '../components/BackButton';
import AuthStatus from '../components/AuthStatus';
import DeleteModal from '../components/DeleteModal';
import InvitationModal from '../components/InvitationModal';
import ShareTripModal from '../components/ShareTripModal';
import AuthModal from '../components/AuthModal';

interface Trip {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  status?: 'not_started' | 'in_progress' | 'completed';
  user_role?: 'owner' | 'participant';
  max_participants?: number;
  participant_count?: number;
}

interface TripInvitation {
  id: string;
  trip_id: string;
  inviter_id: string;
  invitee_email: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  trip: {
    destination: string;
    start_date: string;
    end_date: string;
    max_participants: number;
  };
  inviter: {
    display_name: string;
    email: string;
  };
}

const MyTripsPage: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<TripInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedTripForShare, setSelectedTripForShare] = useState<Trip | null>(null);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<TripInvitation | null>(null);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [invitationTripId, setInvitationTripId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingInvitationTripId, setPendingInvitationTripId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const fetchTrips = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Fetch trips where user is either owner or participant
      const { data: tripParticipants, error } = await supabase
        .from('trip_participants')
        .select(`
          trip_id,
          role,
          trips!inner (
            id,
            destination,
            start_date,
            end_date,
            max_participants,
            user_id
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false });

      if (error) {
        console.error('Error fetching user trips:', error);
        return;
      }

      // Get participant counts for each trip
      const tripIds = (tripParticipants || []).map(tp => (tp as any).trips.id);
      
      let participantCounts: { [key: string]: number } = {};
      if (tripIds.length > 0) {
        const { data: counts } = await supabase
          .from('trip_participants')
          .select('trip_id')
          .in('trip_id', tripIds);
        
        if (counts) {
          participantCounts = counts.reduce((acc, item) => {
            acc[item.trip_id] = (acc[item.trip_id] || 0) + 1;
            return acc;
          }, {} as { [key: string]: number });
        }
      }

      // Transform the data and add status
      const tripsWithStatus = (tripParticipants || []).map(tp => {
        const tripData = (tp as any).trips;
        const startDate = new Date(tripData.start_date);
        const endDate = new Date(tripData.end_date);
        const today = new Date();

        let status: Trip['status'] = 'not_started';
        if (today > endDate) {
          status = 'completed';
        } else if (today >= startDate && today <= endDate) {
          status = 'in_progress';
        }

        return {
          id: tripData.id,
          destination: tripData.destination,
          start_date: tripData.start_date,
          end_date: tripData.end_date,
          max_participants: tripData.max_participants,
          participant_count: participantCounts[tripData.id] || 0,
          status,
          user_role: tp.role as 'owner' | 'participant'
        };
      });

      setTrips(tripsWithStatus);
    } catch (error) {
      console.error('Error fetching trips:', error);
    }
  };

  const fetchPendingInvitations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Simplified query to avoid RLS issues
      const { data: invitations, error } = await supabase
        .from('trip_invitations')
        .select(`
          id,
          trip_id,
          inviter_id,
          invitee_email,
          status,
          created_at
        `)
        .eq('invitee_email', user.email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching invitations:', error);
        return;
      }

      // Fetch trip and inviter details separately
      const enrichedInvitations = [];
      for (const invitation of invitations || []) {
        try {
          // Fetch trip details
          const { data: tripData } = await supabase
            .from('trips')
            .select('destination, start_date, end_date, max_participants')
            .eq('id', invitation.trip_id)
            .single();

          // Fetch inviter details
          const { data: inviterData } = await supabase
            .from('users')
            .select('display_name, email')
            .eq('id', invitation.inviter_id)
            .single();

          if (tripData && inviterData) {
            enrichedInvitations.push({
              ...invitation,
              trip: tripData,
              inviter: inviterData
            });
          }
        } catch (err) {
          console.error('Error enriching invitation:', err);
        }
      }

      setPendingInvitations(enrichedInvitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const handleInvitationFromUrl = async (invitationTripId: string, user: any) => {
    try {
      // First check if this is a formal invitation
      const { data: invitation } = await supabase
        .from('trip_invitations')
        .select(`
          id,
          trip_id,
          inviter_id,
          invitee_email,
          status,
          created_at
        `)
        .eq('trip_id', invitationTripId)
        .eq('invitee_email', user.email)
        .eq('status', 'pending')
        .single();

      if (invitation) {
        // Fetch additional details
        const { data: tripData } = await supabase
          .from('trips')
          .select('destination, start_date, end_date, max_participants')
          .eq('id', invitation.trip_id)
          .single();

        const { data: inviterData } = await supabase
          .from('users')
          .select('display_name, email')
          .eq('id', invitation.inviter_id)
          .single();

        if (tripData && inviterData) {
          const formattedInvitation = {
            ...invitation,
            trip: tripData,
            inviter: inviterData
          };
          setSelectedInvitation(formattedInvitation);
        }
      } else {
        // This is just a shared trip link - check if trip exists and user can join
        const { data: tripData } = await supabase
          .from('trips')
          .select('*')
          .eq('id', invitationTripId)
          .single();

        if (tripData) {
          setInvitationTripId(invitationTripId);
          setShowInvitationModal(true);
        }
      }
    } catch (error) {
      console.error('Error handling invitation from URL:', error);
    }
  };

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      // Check URL parameter first
      const invitationParam = searchParams.get('invitation');
      
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        // If there's an invitation parameter and user is not authenticated, show auth modal
        if (invitationParam) {
          setPendingInvitationTripId(invitationParam);
          setShowAuthModal(true);
        } else {
          navigate('/');
        }
        setLoading(false);
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      // Handle invitation from URL if present
      if (invitationParam && !initialLoadComplete) {
        await handleInvitationFromUrl(invitationParam, user);
      }
      
      // Fetch data in parallel for better performance
      await Promise.all([fetchTrips(), fetchPendingInvitations()]);
      
      setInitialLoadComplete(true);
      setLoading(false);
    };

    checkAuthAndFetchData();
  }, [navigate, searchParams, initialLoadComplete]);

  const handleDeleteClick = (tripId: string) => {
    setTripToDelete(tripId);
    setDeleteModalOpen(true);
  };

  const handleShareClick = (trip: Trip) => {
    setSelectedTripForShare(trip);
    setShareModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!tripToDelete) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const tripToDeleteData = trips.find(t => t.id === tripToDelete);
    
    if (tripToDeleteData?.user_role === 'owner') {
      // If user is owner, delete the entire trip
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripToDelete);

      if (error) {
        console.error('Error deleting trip:', error);
      }
    } else {
      // If user is participant, just remove them from the trip
      const { error } = await supabase
        .from('trip_participants')
        .delete()
        .eq('trip_id', tripToDelete)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error leaving trip:', error);
      }
    }

    await fetchTrips();
  };

  const handleInvitationResponse = async (accepted: boolean) => {
    if (accepted) {
      // Refresh trips to show the newly joined trip
      await fetchTrips();
    }
    // Refresh invitations to remove the responded invitation
    await fetchPendingInvitations();
    
    // Clear URL parameter
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('invitation');
    navigate({ search: newSearchParams.toString() }, { replace: true });
  };

  const handleAuthSuccess = async () => {
    setShowAuthModal(false);
    
    // If there was a pending invitation, handle it now
    if (pendingInvitationTripId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await handleInvitationFromUrl(pendingInvitationTripId, user);
      }
      setPendingInvitationTripId(null);
    }
    
    // Refresh the page data
    setInitialLoadComplete(false);
    setLoading(true);
  };

  const handlePlayTrip = (tripId: string) => {
    navigate(`/trip/${tripId}`);
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = trips.filter(trip => trip.start_date >= today);
  const past = trips.filter(trip => trip.end_date < today);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: Trip['status']) => {
    switch (status) {
      case 'in_progress':
        return 'text-green-400';
      case 'completed':
        return 'text-blue-400';
      default:
        return 'text-yellow-400';
    }
  };

  const getStatusText = (status: Trip['status']) => {
    switch (status) {
      case 'in_progress':
        return 'IN PROGRESS';
      case 'completed':
        return 'COMPLETED';
      default:
        return 'NOT STARTED';
    }
  };

  const getStatusIcon = (status: Trip['status']) => {
    switch (status) {
      case 'in_progress':
        return '🔥';
      case 'completed':
        return '🏆';
      default:
        return '⏳';
    }
  };

  const getRoleIcon = (role: 'owner' | 'participant') => {
    return role === 'owner' ? <Crown className="w-4 h-4 text-yellow-400" /> : <Users className="w-4 h-4 text-blue-400" />;
  };

  const getRoleText = (role: 'owner' | 'participant') => {
    return role === 'owner' ? 'OWNER' : 'PARTICIPANT';
  };

  const getDeleteButtonText = (role: 'owner' | 'participant') => {
    return role === 'owner' ? 'Delete Trip' : 'Leave Trip';
  };

  return (
    <div className="min-h-screen w-full mobile-padding py-6 sm:py-8 lg:py-12 bg-black text-white flex justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-2 h-2 bg-blue-500 rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-32 right-20 w-1 h-1 bg-yellow-400 rounded-full animate-ping opacity-40"></div>
        <div className="absolute bottom-40 left-1/4 w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce opacity-50"></div>
        <div className="absolute top-1/2 right-10 w-1 h-1 bg-green-400 rounded-full animate-pulse opacity-30"></div>
        <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-pink-500 rounded-full animate-ping opacity-40"></div>
      </div>

      <div className="w-full max-w-6xl relative z-10">
        {/* Header */}
        <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 lg:mb-12 gap-4 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <BackButton to="/" />
            <div>
              <h2 className="pixel-text mobile-heading text-blue-400 glow-text">MY ADVENTURES</h2>
              <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base">Your travel journey awaits</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <AuthStatus className="flex-shrink-0" />
            <button
              onClick={() => navigate('/create-trip')}
              className="pixel-button-primary flex items-center justify-center gap-2 w-full sm:w-auto hover-float"
            >
              <PlusCircle className="w-4 sm:w-5 h-4 sm:h-5" />
              NEW ADVENTURE
            </button>
          </div>
        </div>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className={`animate-slide-in-up delay-100 mb-6 sm:mb-8`}>
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="text-2xl sm:text-3xl animate-bounce">📬</div>
              <h3 className="pixel-text text-purple-400 text-sm sm:text-base lg:text-lg">PENDING INVITATIONS</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-purple-500/50 to-transparent"></div>
              <span className="pixel-text text-xs text-purple-400">{pendingInvitations.length}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {pendingInvitations.map((invitation, index) => (
                <div
                  key={invitation.id}
                  className={`pixel-card bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-2 border-purple-500/30 hover:border-purple-500/60 transition-all duration-300 group animate-slide-in-up cursor-pointer`}
                  style={{ animationDelay: `${index * 100 + 200}ms` }}
                  onClick={() => setSelectedInvitation(invitation)}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="pixel-text text-xs text-purple-400">INVITATION</span>
                      <span className="text-lg">✉️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 sm:w-5 h-4 sm:h-5 text-purple-400 flex-shrink-0" />
                        <h4 className="pixel-text text-white text-sm sm:text-base break-words group-hover:text-purple-300 transition-colors">
                          {invitation.trip.destination}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <p className="outfit-text text-gray-400 text-sm">
                          {formatDate(invitation.trip.start_date)} — {formatDate(invitation.trip.end_date)}
                        </p>
                      </div>
                      <p className="outfit-text text-gray-300 text-sm">
                        From{' '}
                        <span className="text-purple-400 font-semibold">
                          {invitation.inviter.display_name || invitation.inviter.email.split('@')[0]}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-[60vh]">
            <div className="animate-bounce-in">
              <Loader2 className="w-8 sm:w-12 h-8 sm:h-12 text-blue-500 animate-spin" />
              <p className="pixel-text text-blue-400 mt-4 text-sm sm:text-base">LOADING ADVENTURES...</p>
            </div>
          </div>
        ) : trips.length > 0 ? (
          <div className="space-y-6 sm:space-y-8 lg:space-y-12">
            {upcoming.length > 0 && (
              <section className={`animate-slide-in-up delay-200`}>
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="text-2xl sm:text-3xl animate-float">🛫</div>
                  <h3 className="pixel-text text-blue-400 text-sm sm:text-base lg:text-lg">UPCOMING ADVENTURES</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-blue-500/50 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {upcoming.map((trip, index) => (
                    <div
                      key={trip.id}
                      className={`pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-blue-500/30 hover:border-blue-500/60 transition-all duration-300 group animate-slide-in-left`}
                      style={{ animationDelay: `${index * 100 + 300}ms` }}
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 sm:w-5 h-4 sm:h-5 text-blue-400 flex-shrink-0" />
                            <h4 className="pixel-text text-yellow-400 text-sm sm:text-base break-words group-hover:text-yellow-300 transition-colors">
                              {trip.destination}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <p className="outfit-text text-gray-400 text-sm sm:text-base">
                              {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getStatusIcon(trip.status)}</span>
                              <p className={`pixel-text text-xs sm:text-sm ${getStatusColor(trip.status)}`}>
                                {getStatusText(trip.status)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getRoleIcon(trip.user_role!)}
                              <p className="pixel-text text-xs text-gray-400">
                                {getRoleText(trip.user_role!)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-400" />
                            <p className="pixel-text text-xs text-purple-400">
                              {trip.participant_count}/{trip.max_participants || 4} ADVENTURERS
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 justify-end sm:justify-start flex-shrink-0">
                          {trip.user_role === 'owner' && (
                            <button
                              onClick={() => handleShareClick(trip)}
                              className="text-purple-500 hover:text-purple-400 transition-all duration-300 p-2 hover:scale-110"
                              title="Share trip"
                            >
                              <Share2 className="w-5 sm:w-6 h-5 sm:h-6" />
                            </button>
                          )}
                          <button
                            onClick={() => handlePlayTrip(trip.id)}
                            className="text-green-500 hover:text-green-400 transition-all duration-300 p-2 hover:scale-110 hover-glow"
                            title="View trip dashboard"
                          >
                            {trip.status === 'in_progress' ? (
                              <Play className="w-5 sm:w-6 h-5 sm:h-6 fill-current" />
                            ) : (
                              <Play className="w-5 sm:w-6 h-5 sm:h-6" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteClick(trip.id)}
                            className="text-red-500 hover:text-red-400 transition-all duration-300 p-2 hover:scale-110 hover-wiggle"
                            title={getDeleteButtonText(trip.user_role!)}
                          >
                            <Trash2 className="w-5 sm:w-6 h-5 sm:h-6" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section className={`animate-slide-in-up delay-400`}>
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="text-2xl sm:text-3xl animate-float delay-500">🗂️</div>
                  <h3 className="pixel-text text-blue-400 text-sm sm:text-base lg:text-lg">COMPLETED ADVENTURES</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-blue-500/50 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {past.map((trip, index) => (
                    <div
                      key={trip.id}
                      className={`pixel-card bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-2 border-blue-500/10 hover:border-blue-500/30 transition-all duration-300 group animate-slide-in-right`}
                      style={{ animationDelay: `${index * 100 + 600}ms` }}
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 sm:w-5 h-4 sm:h-5 text-gray-500 flex-shrink-0" />
                            <h4 className="pixel-text text-gray-400 text-sm sm:text-base break-words group-hover:text-gray-300 transition-colors">
                              {trip.destination}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <p className="outfit-text text-gray-500 text-sm sm:text-base">
                              {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 mb-2">
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-yellow-400" />
                              <p className="pixel-text text-xs sm:text-sm text-blue-400">
                                ADVENTURE COMPLETED
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getRoleIcon(trip.user_role!)}
                              <p className="pixel-text text-xs text-gray-500">
                                {getRoleText(trip.user_role!)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <p className="pixel-text text-xs text-gray-500">
                              {trip.participant_count}/{trip.max_participants || 4} ADVENTURERS
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 justify-end sm:justify-start flex-shrink-0">
                          <button
                            onClick={() => handlePlayTrip(trip.id)}
                            className="text-gray-500 hover:text-gray-400 transition-all duration-300 p-2 hover:scale-110"
                            title="View trip dashboard"
                          >
                            <Play className="w-5 sm:w-6 h-5 sm:h-6" />
                          </button>
                          {trip.user_role === 'owner' && (
                            <button
                              onClick={() => handleDeleteClick(trip.id)}
                              className="text-red-500/50 hover:text-red-400 transition-all duration-300 p-2 self-end sm:self-start hover:scale-110 hover-wiggle flex-shrink-0"
                              title={getDeleteButtonText(trip.user_role)}
                            >
                              <Trash2 className="w-5 sm:w-6 h-5 sm:h-6" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center h-[60vh] pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-blue-500/30 text-center p-6 sm:p-8 lg:p-12 animate-bounce-in delay-300`}>
            <div className="text-6xl sm:text-8xl mb-6 animate-float">🗺️</div>
            <h3 className="pixel-text mobile-heading text-gray-300 mb-4 glow-text">START YOUR FIRST ADVENTURE</h3>
            <p className="outfit-text text-gray-500 mb-6 sm:mb-8 text-sm sm:text-base lg:text-lg max-w-md">
              Every great journey begins with a single step. Create your first trip and begin your epic adventure!
            </p>
            <button
              onClick={() => navigate('/create-trip')}
              className="pixel-button-primary w-full sm:w-auto hover-float animate-pulse-glow"
            >
              CREATE FIRST ADVENTURE
            </button>
          </div>
        )}

        {/* Modals */}
        <DeleteModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title={trips.find(t => t.id === tripToDelete)?.user_role === 'owner' ? "DELETE ADVENTURE" : "LEAVE ADVENTURE"}
          message={
            trips.find(t => t.id === tripToDelete)?.user_role === 'owner' 
              ? "Are you sure you want to delete this adventure? This action cannot be undone and all associated data will be lost."
              : "Are you sure you want to leave this adventure? You can rejoin later if there's space available."
          }
        />

        {selectedInvitation && (
          <InvitationModal
            invitation={selectedInvitation}
            isOpen={!!selectedInvitation}
            onClose={() => setSelectedInvitation(null)}
            onResponse={handleInvitationResponse}
          />
        )}

        {showInvitationModal && invitationTripId && (
          <InvitationModal
            tripId={invitationTripId}
            isOpen={showInvitationModal}
            onClose={() => {
              setShowInvitationModal(false);
              setInvitationTripId(null);
              // Clear URL parameter
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.delete('invitation');
              navigate({ search: newSearchParams.toString() }, { replace: true });
            }}
            onResponse={handleInvitationResponse}
          />
        )}

        {selectedTripForShare && (
          <ShareTripModal
            isOpen={shareModalOpen}
            onClose={() => {
              setShareModalOpen(false);
              setSelectedTripForShare(null);
            }}
            tripId={selectedTripForShare.id}
            tripDestination={selectedTripForShare.destination}
            maxParticipants={selectedTripForShare.max_participants || 4}
            currentParticipants={selectedTripForShare.participant_count || 0}
          />
        )}

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            setPendingInvitationTripId(null);
            // Clear URL parameter if user cancels auth
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('invitation');
            navigate({ search: newSearchParams.toString() }, { replace: true });
          }}
          onSuccess={handleAuthSuccess}
        />
      </div>
    </div>
  );
};

export default MyTripsPage;