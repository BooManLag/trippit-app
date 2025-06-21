import React from 'react';
import { createPortal } from 'react-dom';
import { X, Lock, CheckCircle2, Trophy } from 'lucide-react';
import { Badge, UserBadge } from '../services/badgeService';

interface BadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  badge: Badge;
  userBadge?: UserBadge;
  progress?: number;
  maxProgress?: number;
}

const BadgeModal: React.FC<BadgeModalProps> = ({
  isOpen,
  onClose,
  badge,
  userBadge,
}) => {
  if (!isOpen) return null;

  const isEarned = !!userBadge;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
      <div className="pixel-card max-w-md w-full relative animate-bounce-in bg-gray-900 border-2 border-yellow-500/30">
        <button
          onClick={onClose}
          className="absolute top-3 sm:top-4 right-3 sm:right-4 text-gray-400 hover:text-white z-10"
        >
          <X className="w-4 sm:w-5 h-4 sm:h-5" />
        </button>

        <div className="text-center mb-6 sm:mb-8">
          {/* Large Badge Display */}
          <div className="relative inline-block mb-6">
            <div 
              className={`
                w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center transition-all duration-300 border-4 mx-auto
                ${isEarned 
                  ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-lg shadow-yellow-500/30 border-yellow-300' 
                  : 'bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 shadow-lg shadow-gray-700/30 border-gray-500'
                }
              `}
            >
              <span 
                className={`
                  text-4xl sm:text-5xl transition-all duration-300
                  ${isEarned ? 'grayscale-0' : 'grayscale opacity-50'}
                `}
              >
                {badge.emoji}
              </span>
            </div>

            {/* Glow effect for earned badges */}
            {isEarned && (
              <div className="absolute inset-0 w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 opacity-20 animate-pulse blur-sm mx-auto" />
            )}
          </div>

          {/* Badge Status */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {isEarned ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="pixel-text text-green-400 text-sm">EARNED</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 text-gray-500" />
                <span className="pixel-text text-gray-500 text-sm">LOCKED</span>
              </>
            )}
          </div>

          {/* Badge Title */}
          <h2 className={`pixel-text text-lg sm:text-2xl mb-2 ${isEarned ? 'text-yellow-400' : 'text-gray-400'} glow-text`}>
            {badge.name}
          </h2>

          {/* Badge Category */}
          <div className="pixel-text text-xs text-blue-400 mb-4">
            {badge.category}
          </div>
        </div>

        {/* Badge Description */}
        <div className="pixel-card bg-gray-800/50 border-gray-700 mb-6">
          <p className="outfit-text text-gray-300 text-sm sm:text-base break-words leading-relaxed">
            {badge.description}
          </p>
        </div>

        {/* Earned Date */}
        {isEarned && userBadge && (
          <div className="pixel-card bg-green-500/10 border-green-500/20 mb-6">
            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="pixel-text text-green-400 text-sm">
                EARNED ON {new Date(userBadge.earned_at).toLocaleDateString()}
              </span>
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
      </div>
    </div>
  );
};

export default BadgeModal;
