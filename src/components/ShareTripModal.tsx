import React, { useState } from 'react';
import { X, Copy, Users, Link2, CheckCircle2 } from 'lucide-react';

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
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/my-trips?invitation=${tripId}`;

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
            <Link2 className="h-6 sm:h-8 w-6 sm:w-8 text-purple-500 animate-pulse" />
          </div>
          <h2 className="pixel-text text-lg sm:text-2xl mb-2 text-purple-400 glow-text">
            SHARE YOUR ADVENTURE
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

        {/* Copy Success Message */}
        {copied && (
          <div className="text-center mb-6 animate-bounce-in">
            <div className="inline-flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="pixel-text text-xs">Link copied to clipboard!</span>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="pixel-card bg-blue-900/20 border-blue-500/20 mb-6">
          <h4 className="pixel-text text-xs text-blue-400 mb-2">HOW IT WORKS:</h4>
          <ul className="outfit-text text-xs text-gray-400 space-y-1">
            <li>• Copy the invitation link below</li>
            <li>• Share it with friends via WhatsApp, SMS, etc.</li>
            <li>• They'll be redirected to "My Trips"</li>
            <li>• An invitation modal will appear</li>
            <li>• They can accept or decline to join</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4">
          <button
            onClick={copyShareLink}
            className="pixel-button-primary w-full flex items-center justify-center gap-2 hover-float"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'LINK COPIED!' : 'COPY INVITATION LINK'}
          </button>
          
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