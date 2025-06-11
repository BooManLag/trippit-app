import React, { useState } from 'react';
import { X, Mail, Send, Loader2, CheckCircle2, Copy, Users } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/my-trips?invitation=${tripId}`;

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: inviteError } = await supabase.rpc('create_trip_invitation', {
        p_trip_id: tripId,
        p_invitee_email: email.trim()
      });

      if (inviteError) {
        throw inviteError;
      }

      const result = data[0];
      if (!result.success) {
        throw new Error(result.message);
      }

      setSuccess('Invitation sent successfully!');
      setEmail('');
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      setError(error.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link', err);
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
            <Users className="h-6 sm:h-8 w-6 sm:w-8 text-purple-500" />
          </div>
          <h2 className="pixel-text text-lg sm:text-2xl mb-2 text-purple-400">
            INVITE ADVENTURERS
          </h2>
          <p className="outfit-text text-gray-400 text-sm sm:text-base">
            Share your trip to {tripDestination}
          </p>
        </div>

        {/* Trip Capacity Info */}
        <div className="pixel-card bg-gray-800/50 border-gray-700 mb-6">
          <div className="flex items-center justify-between">
            <span className="outfit-text text-gray-300 text-sm">Available spots:</span>
            <span className="pixel-text text-purple-400 text-sm">
              {availableSpots} / {maxParticipants}
            </span>
          </div>
          {availableSpots === 0 && (
            <p className="outfit-text text-red-400 text-xs mt-2">
              Trip is full! No more invitations can be sent.
            </p>
          )}
        </div>

        {availableSpots > 0 && (
          <>
            {/* Send Invitation Form */}
            <form onSubmit={handleSendInvitation} className="mb-6 sm:mb-8">
              <label className="block pixel-text text-xs sm:text-sm mb-2 text-purple-400">
                SEND INVITATION BY EMAIL
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="flex-1 input-pixel"
                  required
                />
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="pixel-button-primary px-4 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      SEND
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="text-center mb-6">
              <span className="pixel-text text-xs text-gray-500">OR</span>
            </div>
          </>
        )}

        {/* Share Link */}
        <div className="mb-6 sm:mb-8">
          <label className="block pixel-text text-xs sm:text-sm mb-2 text-purple-400">
            SHARE LINK
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 input-pixel text-xs"
            />
            <button
              onClick={copyShareLink}
              className="pixel-button-secondary px-4 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'COPIED!' : 'COPY'}
            </button>
          </div>
          <p className="outfit-text text-gray-500 text-xs mt-2">
            Anyone with this link can request to join your trip
          </p>
        </div>

        {error && (
          <div className="text-sm outfit-text text-red-500 mb-4 text-center break-words">
            {error}
          </div>
        )}

        {success && (
          <div className="text-sm outfit-text text-green-500 mb-4 text-center break-words flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {success}
          </div>
        )}

        <button
          onClick={onClose}
          className="pixel-button-secondary w-full"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};

export default ShareTripModal;