import React from 'react';
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
  progress = 0,
  maxProgress = 1
}) => {
  if (!isOpen) return null;

  const isEarned = !!userBadge;
  const progressPercentage = maxProgress > 0 ? (progress / maxProgress) * 100 : 0;

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

            {/* Progress Ring for Unearned Badges */}
            {!isEarned && progress > 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg 
                  className="w-24 h-24 sm:w-32 sm:h-32 transform -rotate-90"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgba(59, 130, 246, 0.2)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgb(59, 130, 246)"
                    strokeWidth="6"
                    strokeDasharray={`${progressPercentage * 2.83} 283`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
              </div>
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

        {/* Progress Information */}
        {!isEarned && (
          <div className="pixel-card bg-blue-500/10 border-blue-500/20 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="pixel-text text-blue-400 text-sm">PROGRESS</span>
              <span className="pixel-text text-blue-400 text-sm">
                {progress}/{maxProgress}
              </span>
            </div>
            <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="mt-2 text-center">
              <span className="outfit-text text-xs text-gray-400">
                {progressPercentage.toFixed(0)}% Complete
              </span>
            </div>
          </div>
        )}

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

        {/* Requirements */}
        <div className="pixel-card bg-gray-900/30 border border-gray-700 mb-6">
          <h4 className="pixel-text text-purple-400 text-sm mb-2">REQUIREMENTS</h4>
          <div className="outfit-text text-gray-400 text-sm">
            {badge.requirement_type === 'count' && (
              <span>Complete {badge.requirement_value} {badge.requirement_value === 1 ? 'action' : 'actions'}</span>
            )}
            {badge.requirement_type === 'boolean' && (
              <span>Complete the required action</span>
            )}
            {badge.requirement_type === 'combo' && (
              <span>Complete multiple different activities</span>
            )}
            {badge.is_per_trip ? ' on this trip' : ' across all trips'}
          </div>
        </div>

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