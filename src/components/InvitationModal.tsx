import React, { useState, useEffect } from 'react';
import { X, Mail, Users, MapPin, Calendar, Loader2, CheckCircle2, XCircle, Sparkles, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

interface InvitationModalProps {
  invitation?: TripInvitation;
  tripId?: string;
  isOpen: boolean;
  onClose: () => void;
  onResponse: (accepted: boolean) => void;
}

const InvitationModal: React.FC<InvitationModalProps> = ({
  invitation,
  tripId,
  isOpen,
  onClose,
  onResponse
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tripDetails, setTripDetails] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkAuthAndLoadData();
    }
  }, [isOpen, tripId, invitation]);

  const checkAuthAndLoadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (!user) {
        setNeedsAuth(true);
        setLoading(false);
        return;
      }

      // If we have tripId but no invitation, fetch trip details
      if (tripId && !invitation && !dataLoaded) {
        await fetchTripDetails();
      }

      setDataLoaded(true);
    } catch (error) {
      console.error('Error checking auth and loading data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTripDetails = async () => {
    if (!tripId) return;

    try {
      // Fetch trip details and participants in parallel for better performance
      const [tripResponse, participantResponse] = await Promise.all([
        supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .single(),
        supabase
          .from('trip_participants')
          .select(`
            id, user_id, role, joined_at,
            users!inner(id, display_name, email)
          `)
          .eq('trip_id', tripId)
      ]);

      if (tripResponse.error) throw tripResponse.error;
      if (participantResponse.error) throw participantResponse.error;

      setTripDetails(tripResponse.data);
      setParticipants(participantResponse.data || []);
    } catch (error) {
      console.error('Error fetching trip details:', error);
      setError('Failed to load trip details');
    }
  };

  const handleSignInRequired = () => {
    // Close this modal and let the parent handle auth
    onClose();
    // The parent component should show auth modal
  };

  if (!isOpen) return null;

  const handleJoinTrip = async () => {
    if (!tripId || !currentUser) return;

    setLoading(true);
    setError(null);

    try {
      // Check if trip is full
      if (tripDetails && participants.length >= tripDetails.max_participants) {
        throw new Error('This trip is full');
      }

      // Check if user is already a participant
      const isAlreadyParticipant = participants.some(p => p.user_id === currentUser.id);
      if (isAlreadyParticipant) {
        throw new Error('You are already a participant in this trip');
      }

      // Add user as participant
      const { error: joinError } = await supabase
        .from('trip_participants')
        .insert({
          trip_id: tripId,
          user_id: currentUser.id,
          role: 'participant'
        });

      if (joinError) {
        if (joinError.code === '23505') {
          throw new Error('You are already a participant in this trip');
        }
        throw joinError;
      }

      onResponse(true);
      onClose();
    } catch (error: any) {
      console.error('Error joining trip:', error);
      setError(error.message || 'Failed to join trip');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (accept: boolean) => {
    if (!invitation || !currentUser) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: responseError } = await supabase.rpc('respond_to_invitation', {
        p_invitation_id: invitation.id,
        p_response: accept ? 'accepted' : 'declined'
      });

      if (responseError) {
        throw responseError;
      }

      const result = data[0];
      if (!result.success) {
        throw new Error(result.message);
      }

      onResponse(accept);
      onClose();
    } catch (error: any) {
      console.error('Error responding to invitation:', error);
      setError(error.message || 'Failed to respond to invitation');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Show auth required state
  if (needsAuth) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="pixel-card max-w-md w-full relative animate-bounce-in">
          <button
            onClick={onClose}
            className="absolute top-3 sm:top-4 right-3 sm:right-4 text-gray-400 hover:text-white"
          >
            <X className="w-4 sm:w-5 h-4 sm:h-5" />
          </button>

          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center h-12 sm:h-16 w-12 sm:w-16 rounded-full bg-blue-500/20 mb-4">
              <UserPlus className="h-6 sm:h-8 w-6 sm:w-8 text-blue-500 animate-pulse" />
            </div>
            <h2 className="pixel-text text-lg sm:text-2xl mb-2 text-blue-400 glow-text">
              SIGN IN REQUIRED
            </h2>
            <p className="outfit-text text-gray-400 text-sm sm:text-base">
              You need to sign in to join this adventure
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={handleSignInRequired}
              className="pixel-button-primary w-full flex items-center justify-center gap-2 hover-glow"
            >
              <UserPlus className="w-4 sm:w-5 h-4 sm:h-5" />
              SIGN IN TO JOIN
            </button>
            <button
              onClick={onClose}
              className="pixel-button-secondary w-full"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Use invitation data if available, otherwise use fetched trip details
  const trip = invitation?.trip || tripDetails;
  const inviterName = invitation?.inviter?.display_name || invitation?.inviter?.email?.split('@')[0];

  // Show loading state only when we're actually fetching data
  if (!trip && loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="pixel-card max-w-md w-full relative">
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="pixel-text text-blue-400">LOADING TRIP DETAILS...</p>
          </div>
        </div>
      </div>
    );
  }

  // If we don't have trip data and we're not loading, show error
  if (!trip && !loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="pixel-card max-w-md w-full relative">
          <button
            onClick={onClose}
            className="absolute top-3 sm:top-4 right-3 sm:right-4 text-gray-400 hover:text-white"
          >
            <X className="w-4 sm:w-5 h-4 sm:h-5" />
          </button>
          <div className="text-center py-8">
            <p className="pixel-text text-red-400 mb-4">TRIP NOT FOUND</p>
            <button onClick={onClose} className="pixel-button-secondary">
              CLOSE
            </button>
          </div>
        </div>
      </div>
    );
  }

  const availableSpots = trip.max_participants - participants.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="pixel-card max-w-md w-full relative animate-bounce-in">
        <button
          onClick={onClose}
          className="absolute top-3 sm:top-4 right-3 sm:right-4 text-gray-400 hover:text-white"
        >
          <X className="w-4 sm:w-5 h-4 sm:h-5" />
        </button>

        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center h-12 sm:h-16 w-12 sm:w-16 rounded-full bg-blue-500/20 mb-4">
            <Sparkles className="h-6 sm:h-8 w-6 sm:w-8 text-blue-500 animate-pulse" />
          </div>
          <h2 className="pixel-text text-lg sm:text-2xl mb-2 text-blue-400 glow-text">
            {invitation ? 'TRIP INVITATION' : 'JOIN ADVENTURE'}
          </h2>
          <p className="outfit-text text-gray-400 text-sm sm:text-base">
            {invitation 
              ? "You've been invited to join an adventure!"
              : "Ready to join this epic adventure?"
            }
          </p>
        </div>

        {/* Trip Details */}
        <div className="pixel-card bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30 mb-6 sm:mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 sm:w-5 h-4 sm:h-5 text-blue-400 flex-shrink-0" />
              <span className="outfit-text text-white text-sm sm:text-base break-words font-semibold">
                {trip.destination}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 sm:w-5 h-4 sm:h-5 text-green-400 flex-shrink-0" />
              <span className="outfit-text text-gray-300 text-sm sm:text-base">
                {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-4 sm:w-5 h-4 sm:h-5 text-purple-400 flex-shrink-0" />
              <span className="outfit-text text-gray-300 text-sm sm:text-base">
                {participants.length} / {trip.max_participants} adventurers
              </span>
            </div>
          </div>

          {/* Capacity Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300"
                style={{ width: `${(participants.length / trip.max_participants) * 100}%` }}
              />
            </div>
            <div className="text-center mt-2">
              {availableSpots > 0 ? (
                <span className="pixel-text text-xs text-green-400">
                  {availableSpots} spot{availableSpots !== 1 ? 's' : ''} available
                </span>
              ) : (
                <span className="pixel-text text-xs text-red-400">
                  Trip is full!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Inviter Info (only for invitations) */}
        {invitation && inviterName && (
          <div className="mb-6 sm:mb-8">
            <p className="outfit-text text-gray-400 text-sm sm:text-base text-center">
              Invited by{' '}
              <span className="text-blue-400 font-semibold">
                {inviterName}
              </span>
            </p>
          </div>
        )}

        {error && (
          <div className="text-sm outfit-text text-red-500 mb-4 text-center break-words">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        {availableSpots > 0 ? (
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="pixel-button-secondary flex items-center justify-center gap-2 flex-1 disabled:opacity-50"
            >
              <XCircle className="w-4 sm:w-5 h-4 sm:h-5" />
              {invitation ? 'DECLINE' : 'CANCEL'}
            </button>
            <button
              onClick={invitation ? () => handleResponse(true) : handleJoinTrip}
              disabled={loading}
              className="pixel-button-primary flex items-center justify-center gap-2 flex-1 disabled:opacity-50 hover-glow"
            >
              {loading ? (
                <Loader2 className="w-4 sm:w-5 h-4 sm:h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5" />
                  {invitation ? 'ACCEPT' : 'JOIN TRIP'}
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className="pixel-button-secondary w-full"
          >
            CLOSE
          </button>
        )}

        <div className="text-center mt-6">
          <p className="outfit-text text-gray-500 text-xs sm:text-sm">
            {availableSpots > 0 
              ? "Join this adventure and create amazing memories!"
              : "This trip is at full capacity"
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvitationModal;