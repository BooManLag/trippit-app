import React, { useState, useEffect } from 'react';
import { X, Mail, MapPin, Calendar, UserPlus, CheckCircle2, XCircle, Clock, Users } from 'lucide-react';
import { invitationService } from '../services/invitationService';
import LoadingBar from './LoadingBar';

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
  const [searchingUser, setSearchingUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userFound, setUserFound] = useState<boolean | null>(null);
  const [sentInvitations, setSentInvitations] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchInvitationsAndParticipants();
    }
  }, [isOpen, tripId]);

  const fetchInvitationsAndParticipants = async () => {
    try {
      const [invitations, participantData] = await Promise.all([
        invitationService.getTripInvitations(tripId),
        invitationService.getTripParticipants(tripId)
      ]);
      
      setSentInvitations(invitations);
      setParticipants(participantData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkUserExists = async (email: string) => {
    if (!email.trim() || !validateEmail(email.trim())) {
      setUserFound(null);
      return;
    }

    try {
      setSearchingUser(true);
      const exists = await invitationService.checkUserExists(email.trim());
      setUserFound(exists);
    } catch (error) {
      console.error('Error checking user:', error);
      setUserFound(null);
    } finally {
      setSearchingUser(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setError(null);
    setSuccess(null);
    
    // Debounce user check
    if (newEmail.trim()) {
      const timeoutId = setTimeout(() => checkUserExists(newEmail), 500);
      return () => clearTimeout(timeoutId);
    } else {
      setUserFound(null);
    }
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

    if (userFound === false) {
      setError('This email is not registered in our system. They need to sign up first!');
      return;
    }

    if (userFound === null) {
      setError('Please wait while we check if this user exists');
      return;
    }

    // Clean the email for comparison
    const emailLower = email.toLowerCase().trim();

    // Check if email is already a participant
    const isAlreadyParticipant = participants.some(p => 
      p.user.email.toLowerCase() === emailLower
    );

    if (isAlreadyParticipant) {
      setError('This person is already a participant in the trip');
      return;
    }

    // Check if email has been invited before (any status)
    const existingInvitation = sentInvitations.find(inv => 
      inv.invitee_email.toLowerCase() === emailLower
    );

    if (existingInvitation) {
      if (existingInvitation.status === 'pending') {
        setError('This email has already been invited and is pending response');
      } else if (existingInvitation.status === 'accepted') {
        setError('This email was already invited and accepted (they should be a participant)');
      } else if (existingInvitation.status === 'declined') {
        setError('This email was previously invited but declined the invitation');
      } else {
        setError('This email has already been invited to this trip');
      }
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

      // Use the validation function first
      const validation = await invitationService.validateInvitation(tripId, emailLower);
      if (!validation.valid) {
        setError(validation.message);
        return;
      }

      await invitationService.sendInvitation(tripId, emailLower);
      
      setSuccess(`Invitation sent to ${email}! They'll see it when they open the app.`);
      setEmail('');
      setUserFound(null);
      
      // Refresh invitations list
      await fetchInvitationsAndParticipants();
      
      setTimeout(() => setSuccess(null), 4000);
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      setError(error.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const availableSpots = maxParticipants - currentParticipants;
  const pendingInvitations = sentInvitations.filter(inv => inv.status === 'pending');

  const getUserStatusIcon = () => {
    if (searchingUser) {
      return (
        <div className="w-20">
          <LoadingBar 
            text="" 
            color="blue" 
            height={3}
            width="100%"
            duration={800}
          />
        </div>
      );
    }
    if (userFound === true) return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    if (userFound === false) return <XCircle className="w-4 h-4 text-red-400" />;
    return null;
  };

  const getUserStatusText = () => {
    if (searchingUser) return 'Checking...';
    if (userFound === true) return 'User found! ✓';
    if (userFound === false) return 'User not registered ✗';
    return '';
  };

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
            Invite registered users to join your trip to {tripDestination}
          </p>
        </div>

        {/* Trip Capacity Info */}
        <div className="pixel-card bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/30 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="outfit-text text-gray-300 text-sm">Trip Capacity</span>
            </div>
            <span className="pixel-text text-xs text-purple-400">
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
              📧 INVITE BY EMAIL (REGISTERED USERS ONLY)
            </label>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="friend@example.com"
                  className="w-full input-pixel text-sm pr-10"
                  disabled={loading}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {getUserStatusIcon()}
                </div>
              </div>
              
              {/* User Status Indicator */}
              {email.trim() && (
                <div className="text-center">
                  <span className={`pixel-text text-xs ${
                    userFound === true ? 'text-green-400' : 
                    userFound === false ? 'text-red-400' : 'text-blue-400'
                  }`}>
                    {getUserStatusText()}
                  </span>
                </div>
              )}

              {loading ? (
                <div className="w-full">
                  <LoadingBar 
                    text="SENDING INVITATION..." 
                    color="purple" 
                    duration={1500}
                  />
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !email.trim() || userFound !== true}
                  className="pixel-button-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" />
                  <span>SEND INVITATION</span>
                </button>
              )}
            </div>
          </form>
        )}

        {/* Success/Error Messages */}
        {success && (
          <div className="text-center mb-4 animate-bounce-in">
            <div className="pixel-card bg-green-500/10 border-green-500/30">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="pixel-text text-xs">{success}</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center mb-4 animate-bounce-in">
            <div className="pixel-card bg-red-500/10 border-red-500/30">
              <span className="pixel-text text-xs text-red-400">{error}</span>
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
                  key={participant.user_id}
                  className="flex items-center justify-between p-2 bg-gray-800 border border-green-500/20 rounded"
                >
                  <span className="outfit-text text-sm text-gray-300 break-words flex-1 mr-2">
                    {participant.user.display_name || participant.user.email.split('@')[0]}
                  </span>
                  <div className="flex items-center gap-1">
                    {participant.role === 'owner' ? (
                      <span className="pixel-text text-xs text-yellow-400">👑 OWNER</span>
                    ) : (
                      <span className="pixel-text text-xs text-green-400">✅ JOINED</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-yellow-400" />
                    <span className="pixel-text text-xs text-yellow-400">PENDING</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="pixel-card bg-blue-900/20 border-blue-500/20 mb-6">
          <h4 className="pixel-text text-xs text-blue-400 mb-2">HOW IT WORKS:</h4>
          <ul className="outfit-text text-xs text-gray-400 space-y-1">
            <li>• Enter the email of a registered user</li>
            <li>• We'll check if they're in our system</li>
            <li>• They'll see the invitation in their "My Trips" page</li>
            <li>• They can accept or decline to join</li>
          </ul>
        </div>

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
              ? `${availableSpots} more registered user${availableSpots !== 1 ? 's' : ''} can join this trip`
              : 'This trip is at full capacity'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareTripModal;