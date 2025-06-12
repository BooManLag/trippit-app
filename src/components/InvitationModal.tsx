import React, { useState, useEffect } from 'react';
import { X, Mail, Users, MapPin, Calendar, Loader2, CheckCircle2, XCircle, Sparkles, UserPlus } from 'lucide-react';
import { invitationService, type TripInvitation } from '../services/invitationService';

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
  const [canJoin, setCanJoin] = useState(false);

  useEffect(() => {
    if (isOpen && tripId && !invitation) {
      checkTripAccess();
    }
  }, [isOpen, tripId, invitation]);

  const checkTripAccess = async () => {
    if (!tripId) return;

    try {
      setLoading(true);
      setError(null);

      const { canJoin: canJoinTrip, reason } = await invitationService.canJoinTrip(tripId);
      setCanJoin(canJoinTrip);

      if (!canJoinTrip && reason) {
        setError(reason);
      }

      // Fetch trip details and participants
      const [participants] = await Promise.all([
        invitationService.getTripParticipants(tripId)
      ]);

      setParticipants(participants);
    } catch (error: any) {
      console.error('Error checking trip access:', error);
      setError(error.message || 'Failed to load trip details');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTrip = async () => {
    if (!tripId) return;

    setLoading(true);
    setError(null);

    try {
      await invitationService.joinTrip(tripId);
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
    if (!invitation) return;

    setLoading(true);
    setError(null);

    try {
      await invitationService.respondToInvitation(
        invitation.id,
        accept ? 'accepted' : 'declined'
      );
      onResponse(accept);
      onClose();
    } catch (error: any) {
      console.error('Error responding to invitation:', error);
      setError(error.message || 'Failed to respond to invitation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Use invitation data if available, otherwise use fetched trip details
  const trip = invitation?.trip || tripDetails;
  const inviterName = invitation?.inviter?.display_name || invitation?.inviter?.email?.split('@')[0];

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
        {trip && (
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
                {participants.length < trip.max_participants ? (
                  <span className="pixel-text text-xs text-green-400">
                    {trip.max_participants - participants.length} spot{trip.max_participants - participants.length !== 1 ? 's' : ''} available
                  </span>
                ) : (
                  <span className="pixel-text text-xs text-red-400">
                    Trip is full!
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

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

        {/* Loading State */}
        {loading && (
          <div className="text-center py-4">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
            <p className="pixel-text text-blue-400 text-xs">PROCESSING...</p>
          </div>
        )}

        {/* Action Buttons */}
        {!loading && (
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="pixel-button-secondary flex items-center justify-center gap-2 flex-1 disabled:opacity-50"
            >
              <XCircle className="w-4 sm:w-5 h-4 sm:h-5" />
              {invitation ? 'DECLINE' : 'CANCEL'}
            </button>
            
            {canJoin || invitation ? (
              <button
                onClick={invitation ? () => handleResponse(true) : handleJoinTrip}
                disabled={loading || (!canJoin && !invitation)}
                className="pixel-button-primary flex items-center justify-center gap-2 flex-1 disabled:opacity-50 hover-glow"
              >
                <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5" />
                {invitation ? 'ACCEPT' : 'JOIN TRIP'}
              </button>
            ) : null}
          </div>
        )}

        <div className="text-center mt-6">
          <p className="outfit-text text-gray-500 text-xs sm:text-sm">
            {canJoin || invitation
              ? "Join this adventure and create amazing memories!"
              : error || "Unable to join this trip"
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvitationModal;