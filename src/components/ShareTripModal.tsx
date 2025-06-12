import React, { useState, useEffect } from 'react';
import { X, Copy, Users, Link2, CheckCircle2, Mail, Send, Loader2, Trash2 } from 'lucide-react';
import { invitationService } from '../services/invitationService';

interface ShareTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripDestination: string;
  maxParticipants: number;
  currentParticipants: number;
}

const ShareTripModal: React.FC<ShareTripModalProps> = ({
  isOpen,
  onClose,
  tripId,
  tripDestination,
  maxParticipants,
  currentParticipants
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sentInvitations, setSentInvitations] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchInvitationsAndParticipants();
    }
  }, [isOpen, tripId]);

  const fetchInvitationsAndParticipants = async () => {
    try {
      const [invitations, participantList] = await Promise.all([
        invitationService.getTripInvitations(tripId),
        invitationService.getTripParticipants(tripId)
      ]);
      
      setSentInvitations(invitations);
      setParticipants(participantList);
    } catch (error: any) {
      console.error('Error fetching data:', error);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    // Check if email is already invited or participating
    const emailLower = email.toLowerCase().trim();
    const isAlreadyParticipant = participants.some(p => p.email.toLowerCase() === emailLower);
    const isAlreadyInvited = sentInvitations.some(inv => 
      inv.invitee_email.toLowerCase() === emailLower && inv.status === 'pending'
    );

    if (isAlreadyParticipant) {
      setError('This person is already a participant in the trip');
      return;
    }

    if (isAlreadyInvited) {
      setError('This email has already been invited');
      return;
    }

    if (currentParticipants >= maxParticipants) {
      setError('Trip is full - cannot send more invitations');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await invitationService.sendInvitation(tripId, emailLower);
      
      setSuccess(`Invitation sent to ${email}!`);
      setEmail('');
      
      // Refresh invitations list
      await fetchInvitationsAndParticipants();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      setError(error.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = async () => {
    const shareUrl = `${window.location.origin}/my-trips?invitation=${tripId}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  if (!isOpen) return null;

  const availableSpots = maxParticipants - currentParticipants;
  const pendingInvitations = sentInvitations.filter(inv => inv.status === 'pending');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="pixel-card max-w-md w-full relative animate-bounce-in max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 sm:top-4 right-3 sm:right-4 text-gray-400 hover:text-white z-10"
        >
          <X className="w-4 sm:w-5 h-4 sm:h-5" />
        </button>

        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center h-12 sm:h-16 w-12 sm:w-16 rounded-full bg-purple-500/20 mb-4">
            <Mail className="h-6 sm:h-8 w-6 sm:w-8 text-purple-500 animate-pulse" />
          </div>
          <h2 className="pixel-text text-lg sm:text-2xl mb-2 text-purple-400 glow-text">
            INVITE FRIENDS
          </h2>
          <p className="outfit-text text-gray-400 text-sm sm:text-base">
            Invite friends to join your trip to {tripDestination}
          </p>
        </div>

        {/* Trip Capacity Info */}
        <div className="pixel-card bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="outfit-text text-gray-300 text-sm">Trip Capacity</span>
            </div>
            <span className="pixel-text text-purple-400 text-sm">
              {currentParticipants} / {maxParticipants}
            </span>
          </div>
          <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-full transition-all duration-300"
              style={{ width: `${(currentParticipants / maxParticipants) * 100}%` }}
            />
          </div>
          <div className="mt-2 text-center">
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

        {/* Send Invitation Form */}
        {availableSpots > 0 && (
          <form onSubmit={handleSendInvitation} className="mb-6">
            <label className="block pixel-text text-xs text-purple-400 mb-2">
              📧 INVITE BY EMAIL
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="friend@example.com"
                className="flex-1 input-pixel text-sm"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="pixel-button-primary px-4 py-2 flex items-center gap-1 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>
        )}

        {/* Success/Error Messages */}
        {success && (
          <div className="text-center mb-4 animate-bounce-in">
            <div className="inline-flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="pixel-text text-xs">{success}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center mb-4 animate-bounce-in">
            <div className="text-red-400">
              <span className="pixel-text text-xs">{error}</span>
            </div>
          </div>
        )}

        {/* Share Link */}
        <div className="pixel-card bg-blue-900/20 border-blue-500/20 mb-6">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-400" />
              <span className="pixel-text text-blue-400 text-xs">SHARE LINK</span>
            </div>
            <button
              onClick={copyShareLink}
              className="pixel-button-secondary text-xs px-2 py-1 flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              {copied ? 'COPIED!' : 'COPY'}
            </button>
          </div>
          <p className="outfit-text text-gray-400 text-xs break-all">
            {`${window.location.origin}/my-trips?invitation=${tripId}`}
          </p>
        </div>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="mb-6">
            <h4 className="pixel-text text-xs text-yellow-400 mb-3">
              📤 PENDING INVITATIONS ({pendingInvitations.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-2 bg-gray-800 border border-yellow-500/20 rounded"
                >
                  <span className="outfit-text text-sm text-gray-300 break-words flex-1 mr-2">
                    {invitation.invitee_email}
                  </span>
                  <span className="pixel-text text-xs text-yellow-400">PENDING</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Participants */}
        {participants.length > 0 && (
          <div className="mb-6">
            <h4 className="pixel-text text-xs text-green-400 mb-3">
              👥 CURRENT PARTICIPANTS ({participants.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-2 bg-gray-800 border border-green-500/20 rounded"
                >
                  <span className="outfit-text text-sm text-gray-300 break-words flex-1 mr-2">
                    {participant.user.display_name || participant.email}
                  </span>
                  <div className="flex items-center gap-1">
                    {participant.role === 'owner' && (
                      <span className="text-yellow-400">👑</span>
                    )}
                    <span className="pixel-text text-xs text-green-400">
                      {participant.role.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="pixel-button-secondary w-full"
        >
          CLOSE
        </button>

        {/* Footer Note */}
        <div className="text-center mt-4">
          <p className="outfit-text text-gray-500 text-xs">
            {availableSpots > 0 
              ? `${availableSpots} more adventurer${availableSpots !== 1 ? 's' : ''} can join this trip`
              : 'This trip is at full capacity'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareTripModal;