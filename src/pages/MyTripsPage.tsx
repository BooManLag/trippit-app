import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Loader2, PlusCircle, Trash2, Play, Calendar, Star, AlertCircle, RefreshCw, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BackButton from '../components/BackButton';
import AuthStatus from '../components/AuthStatus';
import DeleteModal from '../components/DeleteModal';
import AuthModal from '../components/AuthModal';
import InvitationModal from '../components/InvitationModal';
import { useAuth } from '../hooks/useAuth';

interface Trip {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  max_participants: number;
  user_id: string;
  created_at: string;
  status: 'not_started' | 'in_progress' | 'completed';
}

const MyTripsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<any>(null);
  const [pendingInvitationTripId, setPendingInvitationTripId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const fetchTrips = async () => {
    if (!user) return;
    
    try {
      setError(null);
      
      // Single query approach - RLS will handle filtering automatically
      // This will return all trips the user owns OR is a participant of
      const { data: allTrips, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (tripsError) {
        throw new Error(`Failed to fetch trips: ${tripsError.message}`);
      }

      // Add status to each trip
      const tripsWithStatus = (allTrips || []).map(trip => {
        const today = new Date();
        const startDate = new Date(trip.start_date);
        const endDate = new Date(trip.end_date);

        let status: Trip['status'] = 'not_started';
        if (today > endDate) {
          status = 'completed';
        } else if (today >= startDate && today <= endDate) {
          status = 'in_progress';
        }

        return {
          ...trip,
          status
        };
      });

      setTrips(tripsWithStatus);
    } catch (error: any) {
      console.error('Error fetching trips:', error);
      setError(error.message || 'Failed to load your trips. Please try again.');
    }
  };

  const fetchPendingInvitations = async () => {
    if (!user) return;

    try {
      console.log('🔍 Fetching invitations for user:', user.email);
      
      // CRITICAL: Use the invitationService which now uses the RPC function
      const { invitationService } = await import('../services/invitationService');
      const invitations = await invitationService.getPendingInvitations();
      
      console.log('📊 Received invitations:', invitations.length);
      console.log('🔍 Debug - Invitations details:', invitations.map(inv => ({
        id: inv.id,
        invitee_email: inv.invitee_email,
        current_user_email: user.email,
        trip_destination: inv.trip.destination,
        matches_current_user: inv.invitee_email === user.email
      })));

      setPendingInvitations(invitations);
    } catch (error: any) {
      console.error('Error fetching invitations:', error);
      // Don't set error state for invitations - just log it
      setPendingInvitations([]);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      if (authLoading) return;

      const invitationParam = searchParams.get('invitation');
      
      if (!user) {
        if (invitationParam) {
          setPendingInvitationTripId(invitationParam);
          setShowAuthModal(true);
        } else {
          navigate('/');
        }
        setLoading(false);
        return;
      }

      // Fetch data
      await Promise.all([fetchTrips(), fetchPendingInvitations()]);
      setLoading(false);
    };

    initializeData();
  }, [user, authLoading, navigate, searchParams]);

  const handleDeleteClick = (tripId: string) => {
    setTripToDelete(tripId);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!tripToDelete) return;

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripToDelete)
        .eq('user_id', user?.id); // Extra safety check

      if (error) {
        throw new Error(`Failed to delete trip: ${error.message}`);
      }

      await fetchTrips();
    } catch (error: any) {
      console.error('Error deleting trip:', error);
      setError(error.message || 'Failed to delete trip. Please try again.');
    }
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
    setPendingInvitationTripId(null);
    
    // Clear URL parameter
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('invitation');
    navigate({ search: newSearchParams.toString() }, { replace: true });
  };

  const retryFetchTrips = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchTrips(), fetchPendingInvitations()]);
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: Trip['status']) => {
    switch (status) {
      case 'in_progress': return 'text-green-400';
      case 'completed': return 'text-blue-400';
      default: return 'text-yellow-400';
    }
  };

  const getStatusText = (status: Trip['status']) => {
    switch (status) {
      case 'in_progress': return 'IN PROGRESS';
      case 'completed': return 'COMPLETED';
      default: return 'NOT STARTED';
    }
  };

  const getStatusIcon = (status: Trip['status']) => {
    switch (status) {
      case 'in_progress': return '🔥';
      case 'completed': return '🏆';
      default: return '⏳';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-bounce-in">
          <Loader2 className="w-8 sm:w-12 h-8 sm:h-12 text-blue-500 animate-spin" />
          <p className="pixel-text text-blue-400 mt-4 text-sm sm:text-base">LOADING ADVENTURES...</p>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const upcoming = trips.filter(trip => trip.start_date >= today);
  const past = trips.filter(trip => trip.end_date < today);

  return (
    <div className="min-h-screen w-full mobile-padding py-6 sm:py-8 lg:py-12 flex justify-center relative overflow-hidden">
      <div className="w-full max-w-6xl relative z-10">
        {/* Header */}
        <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 lg:mb-12 gap-4 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <BackButton to="/" />
            <div>
              <h2 className="pixel-text mobile-heading text-blue-400 glow-text">MY ADVENTURES</h2>
              <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base">Your personal travel journey</p>
            </div>
          </div>
          <div className="flex items-center gap-4 relative z-[100]">
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

        {/* Error Messages */}
        {error && (
          <div className="pixel-card bg-red-500/10 border-2 border-red-500/30 mb-6 animate-bounce-in">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h4 className="pixel-text text-red-400 text-sm mb-2">LOADING ERROR</h4>
                  <p className="outfit-text text-red-300 text-sm break-words">{error}</p>
                </div>
              </div>
              <button
                onClick={retryFetchTrips}
                className="pixel-button-secondary text-xs px-3 py-1 flex items-center gap-1 flex-shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                RETRY
              </button>
            </div>
          </div>
        )}

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="animate-slide-in-up delay-100 mb-6 sm:mb-8">
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
                  className={`pixel-card bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-2 border-purple-500/30 hover:border-purple-500/60 transition-all duration-300 group animate-slide-in-up cursor-pointer relative z-10`}
                  style={{ animationDelay: `${index * 100 + 200}ms` }}
                  onClick={() => setSelectedInvitation(invitation)}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="pixel-text text-xs text-purple-400">INVITATION</span>
                      <Mail className="w-4 h-4 text-purple-400" />
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

        {/* Trips Content */}
        {trips.length > 0 ? (
          <div className="space-y-6 sm:space-y-8 lg:space-y-12">
            {upcoming.length > 0 && (
              <section className="animate-slide-in-up delay-200">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="text-2xl sm:text-3xl animate-float">🛫</div>
                  <h3 className="pixel-text text-blue-400 text-sm sm:text-base lg:text-lg">UPCOMING ADVENTURES</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-blue-500/50 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {upcoming.map((trip, index) => (
                    <div
                      key={trip.id}
                      className={`pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-blue-500/30 hover:border-blue-500/60 transition-all duration-300 group animate-slide-in-left relative z-10`}
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
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getStatusIcon(trip.status)}</span>
                            <p className={`pixel-text text-xs sm:text-sm ${getStatusColor(trip.status)}`}>
                              {getStatusText(trip.status)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 justify-end sm:justify-start flex-shrink-0">
                          <button
                            onClick={() => navigate(`/trip/${trip.id}`)}
                            className="text-green-500 hover:text-green-400 transition-all duration-300 p-2 hover:scale-110 hover-glow"
                            title="View trip dashboard"
                          >
                            <Play className="w-5 sm:w-6 h-5 sm:h-6" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(trip.id)}
                            className="text-red-500 hover:text-red-400 transition-all duration-300 p-2 hover:scale-110 hover-wiggle"
                            title="Delete trip"
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
              <section className="animate-slide-in-up delay-400">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="text-2xl sm:text-3xl animate-float delay-500">🗂️</div>
                  <h3 className="pixel-text text-blue-400 text-sm sm:text-base lg:text-lg">COMPLETED ADVENTURES</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-blue-500/50 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {past.map((trip, index) => (
                    <div
                      key={trip.id}
                      className={`pixel-card bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-2 border-blue-500/10 hover:border-blue-500/30 transition-all duration-300 group animate-slide-in-right relative z-10`}
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
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <p className="pixel-text text-xs sm:text-sm text-blue-400">
                              ADVENTURE COMPLETED
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 justify-end sm:justify-start flex-shrink-0">
                          <button
                            onClick={() => navigate(`/trip/${trip.id}`)}
                            className="text-gray-500 hover:text-gray-400 transition-all duration-300 p-2 hover:scale-110"
                            title="View trip dashboard"
                          >
                            <Play className="w-5 sm:w-6 h-5 sm:h-6" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(trip.id)}
                            className="text-red-500/50 hover:text-red-400 transition-all duration-300 p-2 hover:scale-110 hover-wiggle flex-shrink-0"
                            title="Delete trip"
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
          </div>
        ) : !error ? (
          <div className="flex flex-col items-center justify-center h-[60vh] pixel-card bg-gradient-to-br from-gray-900/80 to-gray-800/80 border-2 border-blue-500/30 text-center p-6 sm:p-8 lg:p-12 animate-bounce-in delay-300 backdrop-blur-sm">
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
        ) : null}

        {/* Modals */}
        <DeleteModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="DELETE ADVENTURE"
          message="Are you sure you want to delete this adventure? This action cannot be undone and all associated data will be lost."
        />

        <InvitationModal
          invitation={selectedInvitation}
          isOpen={!!selectedInvitation}
          onClose={() => setSelectedInvitation(null)}
          onResponse={handleInvitationResponse}
        />

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            setPendingInvitationTripId(null);
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