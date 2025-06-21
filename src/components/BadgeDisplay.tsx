import React from 'react';
import { Badge, UserBadge } from '../services/badgeService';

interface BadgeDisplayProps {
  badge: Badge;
  userBadge?: UserBadge;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  progress?: number;
  maxProgress?: number;
}

const BadgeDisplay: React.FC<BadgeDisplayProps> = ({ 
  badge, 
  userBadge, 
  size = 'medium',
  showProgress = false,
  progress = 0,
  maxProgress = 1
}) => {
  const isEarned = !!userBadge;
  const progressPercentage = maxProgress > 0 ? (progress / maxProgress) * 100 : 0;

  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16',
    large: 'w-24 h-24'
  };

  const emojiSizes = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-4xl'
  };

  const textSizes = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  return (
    <div className="flex flex-col items-center group">
      {/* Badge Circle */}
      <div className="relative">
        <div 
          className={`
            ${sizeClasses[size]} 
            rounded-full 
            flex items-center justify-center 
            transition-all duration-300 
            ${isEarned 
              ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-lg shadow-yellow-500/30 group-hover:shadow-yellow-500/50 group-hover:scale-110' 
              : 'bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 shadow-lg shadow-gray-700/30'
            }
            border-4 
            ${isEarned ? 'border-yellow-300' : 'border-gray-500'}
            group-hover:border-opacity-80
          `}
        >
          <span 
            className={`
              ${emojiSizes[size]} 
              ${isEarned ? 'grayscale-0' : 'grayscale opacity-50'}
              transition-all duration-300
              group-hover:scale-110
            `}
          >
            {badge.emoji}
          </span>
        </div>

        {/* Progress Ring for Unearned Badges */}
        {!isEarned && showProgress && progress > 0 && (
          <div className="absolute inset-0">
            <svg 
              className={`${sizeClasses[size]} transform -rotate-90`}
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(59, 130, 246, 0.2)"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgb(59, 130, 246)"
                strokeWidth="8"
                strokeDasharray={`${progressPercentage * 2.83} 283`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
          </div>
        )}

        {/* Earned Badge Glow Effect */}
        {isEarned && (
          <div 
            className={`
              absolute inset-0 
              ${sizeClasses[size]} 
              rounded-full 
              bg-gradient-to-br from-yellow-400 to-yellow-600 
              opacity-20 
              animate-pulse 
              blur-sm
            `}
          />
        )}
      </div>

      {/* Badge Info */}
      <div className="mt-2 text-center max-w-24">
        <h4 className={`
          pixel-text 
          ${textSizes[size]} 
          ${isEarned ? 'text-yellow-400' : 'text-gray-500'}
          break-words
          leading-tight
        `}>
          {badge.name}
        </h4>
        
        {showProgress && !isEarned && (
          <div className={`
            outfit-text 
            text-xs 
            text-gray-400 
            mt-1
          `}>
            {progress}/{maxProgress}
          </div>
        )}

        {isEarned && userBadge && (
          <div className={`
            outfit-text 
            text-xs 
            text-yellow-300 
            mt-1
          `}>
            {new Date(userBadge.earned_at).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Tooltip on Hover */}
      <div className="
        absolute 
        bottom-full 
        left-1/2 
        transform 
        -translate-x-1/2 
        mb-2 
        px-3 
        py-2 
        bg-gray-900 
        text-white 
        text-xs 
        rounded-lg 
        opacity-0 
        group-hover:opacity-100 
        transition-opacity 
        duration-300 
        pointer-events-none 
        z-10
        max-w-48
        text-center
      ">
        <div className="outfit-text font-semibold mb-1">{badge.name}</div>
        <div className="outfit-text text-gray-300">{badge.description}</div>
        {!isEarned && showProgress && (
          <div className="outfit-text text-blue-400 mt-1">
            Progress: {progress}/{maxProgress}
          </div>
        )}
        
        {/* Tooltip Arrow */}
        <div className="
          absolute 
          top-full 
          left-1/2 
          transform 
          -translate-x-1/2 
          border-4 
          border-transparent 
          border-t-gray-900
        "/>
      </div>
    </div>
  );
};

export default BadgeDisplay;