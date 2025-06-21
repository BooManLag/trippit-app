import React, { useState, useEffect } from 'react';
import { Badge, UserBadge, BadgeProgress, badgeService } from '../services/badgeService';
import { Loader2, ChevronRight } from 'lucide-react';

interface BadgeGridProps {
  userId: string;
  tripId?: string;
  showCategories?: boolean;
  compact?: boolean;
}

const BadgeGrid: React.FC<BadgeGridProps> = ({ 
  userId, 
  tripId, 
  showCategories = false, 
  compact = false 
}) => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [badgeProgress, setBadgeProgress] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadgeData();
  }, [userId, tripId]);

  const fetchBadgeData = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const [allBadges, earnedBadges, progress] = await Promise.all([
        badgeService.getAllBadges(),
        badgeService.getUserBadges(userId, tripId),
        badgeService.getBadgeProgress(userId, tripId)
      ]);

      setBadges(allBadges);
      setUserBadges(earnedBadges);
      setBadgeProgress(progress);
    } catch (error) {
      console.error('Error fetching badge data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeStatus = (badge: Badge) => {
    const earned = userBadges.find(ub => ub.badge_id === badge.id);
    if (earned) return { type: 'earned' as const, data: earned };

    const progress = badgeProgress.find(bp => bp.badge_key === badge.badge_key);
    if (progress) return { type: 'progress' as const, data: progress };

    return { type: 'locked' as const, data: null };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-yellow-500 animate-spin mr-3" />
        <span className="pixel-text text-yellow-400 text-sm">LOADING BADGES...</span>
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">🏆</div>
        <h3 className="pixel-text text-yellow-400 mb-2">NO BADGES YET</h3>
        <p className="outfit-text text-gray-500 text-sm">Complete activities to earn your first badge!</p>
      </div>
    );
  }

  // Group badges by category if needed
  const groupedBadges = showCategories 
    ? badges.reduce((acc, badge) => {
        if (!acc[badge.category]) acc[badge.category] = [];
        acc[badge.category].push(badge);
        return acc;
      }, {} as Record<string, Badge[]>)
    : { 'All Badges': badges };

  // For compact mode, show only first 4-6 badges
  const displayLimit = compact ? 4 : undefined;

  if (showCategories) {
    return (
      <div className="space-y-8">
        {Object.entries(groupedBadges).map(([category, categoryBadges]) => (
          <div key={category}>
            <h3 className="pixel-text text-yellow-400 text-sm mb-4 flex items-center gap-2">
              <span>{category}</span>
              <div className="flex-1 h-px bg-gradient-to-r from-yellow-500/50 to-transparent"></div>
            </h3>
            <div className="flex flex-wrap gap-4">
              {categoryBadges.slice(0, displayLimit).map((badge) => {
                const status = getBadgeStatus(badge);
                const isEarned = status.type === 'earned';
                
                return (
                  <div key={badge.id} className="flex flex-col items-center group">
                    <div className="relative">
                      <div 
                        className={`
                          w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border-4
                          ${isEarned 
                            ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-lg shadow-yellow-500/30 border-yellow-300 group-hover:scale-110' 
                            : 'bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 shadow-lg shadow-gray-700/30 border-gray-500'
                          }
                        `}
                      >
                        <span 
                          className={`
                            text-2xl transition-all duration-300
                            ${isEarned ? 'grayscale-0' : 'grayscale opacity-50'}
                            group-hover:scale-110
                          `}
                        >
                          {badge.emoji}
                        </span>
                      </div>

                      {/* Glow effect for earned badges */}
                      {isEarned && (
                        <div className="absolute inset-0 w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 opacity-20 animate-pulse blur-sm" />
                      )}
                    </div>
                    
                    {/* Badge name */}
                    <div className="text-center mt-2 max-w-20">
                      <div className={`pixel-text text-xs break-words leading-tight ${isEarned ? 'text-yellow-400' : 'text-gray-500'}`}>
                        {badge.name}
                      </div>
                    </div>

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 max-w-48 text-center">
                      <div className="outfit-text font-semibold mb-1">{badge.name}</div>
                      <div className="outfit-text text-gray-300">{badge.description}</div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Simple horizontal display for compact mode
  const badgesToShow = displayLimit ? badges.slice(0, displayLimit) : badges;
  const hasMore = displayLimit && badges.length > displayLimit;

  return (
    <div>
      <div className="flex items-center gap-4 flex-wrap">
        {badgesToShow.map((badge) => {
          const status = getBadgeStatus(badge);
          const isEarned = status.type === 'earned';
          
          return (
            <div key={badge.id} className="flex flex-col items-center group">
              <div className="relative">
                <div 
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border-4
                    ${isEarned 
                      ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-lg shadow-yellow-500/30 border-yellow-300 group-hover:scale-110' 
                      : 'bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 shadow-lg shadow-gray-700/30 border-gray-500'
                    }
                  `}
                >
                  <span 
                    className={`
                      text-2xl transition-all duration-300
                      ${isEarned ? 'grayscale-0' : 'grayscale opacity-50'}
                      group-hover:scale-110
                    `}
                  >
                    {badge.emoji}
                  </span>
                </div>

                {/* Glow effect for earned badges */}
                {isEarned && (
                  <div className="absolute inset-0 w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 opacity-20 animate-pulse blur-sm" />
                )}
              </div>
              
              {/* Badge name */}
              <div className="text-center mt-2 max-w-20">
                <div className={`pixel-text text-xs break-words leading-tight ${isEarned ? 'text-yellow-400' : 'text-gray-500'}`}>
                  {badge.name}
                </div>
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 max-w-48 text-center">
                <div className="outfit-text font-semibold mb-1">{badge.name}</div>
                <div className="outfit-text text-gray-300">{badge.description}</div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"/>
              </div>
            </div>
          );
        })}

        {/* Show more indicator */}
        {hasMore && (
          <div className="flex items-center text-blue-400 hover:text-blue-300 transition-colors">
            <span className="pixel-text text-xs mr-1">+{badges.length - displayLimit} MORE</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Empty state for no earned badges in compact mode */}
      {compact && userBadges.length === 0 && (
        <div className="text-center py-6">
          <div className="text-3xl mb-2">🎯</div>
          <p className="pixel-text text-gray-500 text-xs">COMPLETE ACTIVITIES TO EARN BADGES</p>
        </div>
      )}
    </div>
  );
};

export default BadgeGrid;