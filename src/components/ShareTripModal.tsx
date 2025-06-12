import React, { useState } from 'react';
import { X, Mail, Users, Send, CheckCircle2, AlertCircle, Loader2, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  if (!isOpen) return null;

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const sendInvitation = async () => {
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter an email address' });
      return;
    }

    if (!validateEmail(email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: 'error', text: 'You must be signed in to send invitations' });
        setLoading(false);
        return;
      }

      // Check if trip is full
      if (currentParticipants >= maxParticipants) {
        setMessage({ type: 'error', text: 'This trip is full. Cannot send more invitations.' });
        setLoading(false);
        return;
      }

      // Check if user is the trip owner or participant
      const { data: userParticipant } = await supabase
        .from('trip_participants')
        .select('role')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .single();

      if (!userParticipant) {
        setMessage({ type: 'error', text: 'You must be a participant to send invitations' });
        setLoading(false);
        return;
      }

      // Check if email is already invited or participating
      const { data: existingInvitation } = await supabase
        .from('trip_invitations')
        .select('id, status')
        .eq('trip_id', tripId)
        .eq('invitee_email', email.toLowerCase())
        .single();

      if (existingInvitation) {
        if (existingInvitation.status === 'pending') {
          setMessage({ type: 'info', text: 'This email already has a pending invitation for this trip' });
        } else if (existingInvitation.status === 'accepted') {
          setMessage({ type: 'info', text: 'This person already accepted the invitation' });
        } else {
          setMessage({ type: 'info', text: 'This email was previously invited but declined' });
        }
        setLoading(false);
        return;
      }

      // Check if the email belongs to an existing user
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email, display_name')
        .eq('email', email.toLowerCase())
        .single();

      if (existingUser) {
        // User exists - check if they're already a participant
        const { data: userAlreadyParticipant } = await supabase
          .from('trip_participants')
          .select('id')
          .eq('trip_id', tripId)
          .eq('user_id', existingUser.id)
          .single();

        if (userAlreadyParticipant) {
          setMessage({ type: 'info', text: 'This person is already part of this trip' });
          setLoading(false);
          return;
        }

        // User exists and is not a participant - send invitation
        const { error: inviteError } = await supabase
          .from('trip_invitations')
          .insert({
            trip_id: tripId,
            inviter_id: user.id,
            invitee_email: email.toLowerCase(),
            status: 'pending'
          });

        if (inviteError) {
          console.error('Error sending invitation:', inviteError);
          setMessage({ type: 'error', text: 'Failed to send invitation. Please try again.' });
        } else {
          const userName = existingUser.display_name || existingUser.email.split('@')[0];
          setMessage({ 
            type: 'success', 
            text: `Invitation sent to ${userName}! They will see the invitation when they visit their trips page.` 
          });
          setEmail('');
        }
      } else {
        // User doesn't exist - they need to create an account first
        setMessage({ 
          type: 'info', 
          text: `${email} doesn't have a Trippit account yet. Ask them to sign up at trippit.com first, then you can invite them to join your trip!` 
        });
      }

    } catch (error) {
      console.error('Error sending invitation:', error);
      setMessage({ type: 'error', text: 'Failed to send invitation. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      sendInvitation();
    }
  };

  const availableSpots = maxParticipants - currentParticipants;

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
          <div className="inline-flex items-center justify-center h-12 sm:h-16 w-12 sm:w-16 rounded-full bg-purple-500/20 mb-4">
            <Mail className="h-6 sm:h-8 w-6 sm:w-8 text-purple-500 animate-pulse" />
          </div>
          <h2 className="pixel-text text-lg sm:text-2xl mb-2 text-purple-400 glow-text">
            INVITE BY EMAIL
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

        {/* Email Input */}
        <div className="mb-6">
          <label className="block pixel-text text-xs text-purple-400 mb-2 glow-text">
            📧 FRIEND'S EMAIL
          </label>
          <div className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="friend@example.com"
              className="flex-1 input-pixel"
              disabled={loading || availableSpots === 0}
            />
            <button
              onClick={sendInvitation}
              disabled={loading || !email.trim() || availableSpots === 0}
              className="pixel-button-primary flex items-center justify-center gap-2 disabled:opacity-50 hover-float"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  INVITE
                </>
              )}
            </button>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`pixel-card mb-6 border-2 animate-bounce-in ${
            message.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
            message.type === 'error' ? 'bg-red-500/10 border-red-500/30' :
            'bg-blue-500/10 border-blue-500/30'
          }`}>
            <div className="flex items-start gap-3">
              {message.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />}
              {message.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
              {message.type === 'info' && <UserPlus className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />}
              <p className={`outfit-text text-sm ${
                message.type === 'success' ? 'text-green-300' :
                message.type === 'error' ? 'text-red-300' :
                'text-blue-300'
              }`}>
                {message.text}
              </p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="pixel-card bg-blue-900/20 border-blue-500/20 mb-6">
          <h4 className="pixel-text text-xs text-blue-400 mb-2">HOW IT WORKS:</h4>
          <ul className="outfit-text text-xs text-gray-400 space-y-1">
            <li>• Enter your friend's email address</li>
            <li>• If they have a Trippit account, they'll get an invitation</li>
            <li>• If they don't have an account, ask them to sign up first</li>
            <li>• Invited friends will see the invitation in "My Trips"</li>
            <li>• They can accept or decline to join your adventure</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4">
          <button
            onClick={onClose}
            className="pixel-button-secondary w-full"
          >
            CLOSE
          </button>
        </div>

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