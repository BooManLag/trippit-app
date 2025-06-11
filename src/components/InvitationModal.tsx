import React, { useState } from 'react';
import { X, Mail, Users, MapPin, Calendar, Loader2, CheckCircle2, XCircle } from 'lucide-react';
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
  invitation: TripInvitation;
  isOpen: boolean;
  onClose: () => void;
  onResponse: (accepted: boolean) => void;
}

const InvitationModal: React.FC<InvitationModalProps> = ({
  invitation,
  isOpen,
  onClose,
  onResponse
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleResponse = async (accept: boolean) => {
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
            <Mail className="h-6 sm:h-8 w-6 sm:w-8 text-blue-500" />
          </div>
          <h2 className="pixel-text text-lg sm:text-2xl mb-2 text-blue-400">
            TRIP INVITATION
          </h2>
          <p className="outfit-text text-gray-400 text-sm sm:text-base">
            You've been invited to join an adventure!
          </p>
        </div>

        {/* Trip Details */}
        <div className="pixel-card bg-gray-800/50 border-gray-700 mb-6 sm:mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 sm:w-5 h-4 sm:h-5 text-blue-400 flex-shrink-0" />
              <span className="outfit-text text-white text-sm sm:text-base break-words">
                {invitation.trip.destination}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 sm:w-5 h-4 sm:h-5 text-green-400 flex-shrink-0" />
              <span className="outfit-text text-gray-300 text-sm sm:text-base">
                {formatDate(invitation.trip.start_date)} - {formatDate(invitation.trip.end_date)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-4 sm:w-5 h-4 sm:h-5 text-purple-400 flex-shrink-0" />
              <span className="outfit-text text-gray-300 text-sm sm:text-base">
                Up to {invitation.trip.max_participants} adventurers
              </span>
            </div>
          </div>
        </div>

        {/* Inviter Info */}
        <div className="mb-6 sm:mb-8">
          <p className="outfit-text text-gray-400 text-sm sm:text-base text-center">
            Invited by{' '}
            <span className="text-blue-400 font-semibold">
              {invitation.inviter.display_name || invitation.inviter.email.split('@')[0]}
            </span>
          </p>
        </div>

        {error && (
          <div className="text-sm outfit-text text-red-500 mb-4 text-center break-words">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => handleResponse(false)}
            disabled={loading}
            className="pixel-button-secondary flex items-center justify-center gap-2 flex-1 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 sm:w-5 h-4 sm:h-5 animate-spin" />
            ) : (
              <>
                <XCircle className="w-4 sm:w-5 h-4 sm:h-5" />
                DECLINE
              </>
            )}
          </button>
          <button
            onClick={() => handleResponse(true)}
            disabled={loading}
            className="pixel-button-primary flex items-center justify-center gap-2 flex-1 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 sm:w-5 h-4 sm:h-5 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5" />
                ACCEPT
              </>
            )}
          </button>
        </div>

        <div className="text-center mt-6">
          <p className="outfit-text text-gray-500 text-xs sm:text-sm">
            This invitation will expire if the trip becomes full
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvitationModal;