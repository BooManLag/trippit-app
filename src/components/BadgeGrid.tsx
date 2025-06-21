import React, { useState, useEffect } from 'react';
import { Trophy, Filter, Star, Award } from 'lucide-react';
import { badgeService, Badge, UserBadge, BadgeProgress } from '../services/badgeService';
import BadgeDisplay from './BadgeDisplay';

interface BadgeGridProps {
  userId: string;
  tripId?: string;
  showCategories?: boolean;
  compact?: boolean;
}

const BadgeGrid: React.FC<BadgeGridProps> = ({ 
  userId, 
  tripId, 
  showCategories = true,
  compact = false 
}) => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [badgeProgress, setBadgeProgress] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const fetchBadgeData = async () => {
      try {
        setLoading(true);
        
        const [allBadges, earnedBadges, progressData] = await Promise.all([
          badgeService.getAllBadges(),
          badgeService.getUserBadges(userId, tripId),
          badgeService.getBadgeProgress(userId, tripId)
        ]);

        setBadges(allBadges);
        setUserBadges(earnedBadges);
        setBadgeProgress(progressData);
      } catch (error) {
        console.error('Error fetching badge data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchBadgeData();
    }
  }, [userId, tripId]);

  const categories = ['All', ...Array.from(new Set(badges.map(badge => badge.category)))];

  const filteredBadges = badges.filter(badge => {
    if (selectedCategory === 'All') return true;
    return badge.category === selectedCategory;
  });

  const getBadgeProgress = (badge: Badge) => {
    const progress = badgeProgress.find(p => p.badge_key === badge.badge_key);
    return {
      current: progress?.current_count || 0,
      target: badge.requirement_value
    };
  };

  const getUserBadge = (badge: Badge) => {
    return userBadges.find(ub => ub.badge.badge_key === badge.badge_key);
  };

  const earnedCount = userBadges.length;
  const totalCount = filteredBadges.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-bounce-in">
          <Trophy className="w-8 h-8 text-yellow-500 animate-spin mr-3" />
          <span className="pixel-text text-yellow-400">LOADING BADGES...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-yellow-400" />
            <div>
              <h3 className="pixel-text text-yellow-400 text-lg">ACHIEVEMENT BADGES</h3>
              <p className="outfit-text text-gray-400 text-sm">
                {earnedCount} of {totalCount} badges earned
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-3">
            <div className="w-32 bg-gray-700 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-yellow-500 to-yellow-400 h-full transition-all duration-500"
                style={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
            <span className="pixel-text text-yellow-400 text-sm">
              {Math.round((earnedCount / Math.max(totalCount, 1)) * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Category Filter */}
      {showCategories && !compact && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-blue-400" />
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`
                pixel-text text-xs px-3 py-1 rounded transition-all
                ${selectedCategory === category
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }
              `}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Badge Grid */}
      <div className={`
        grid gap-4 sm:gap-6
        ${compact 
          ? 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-8' 
          : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'
        }
      `}>
        {filteredBadges.map(badge => {
          const userBadge = getUserBadge(badge);
          const progress = getBadgeProgress(badge);
          
          return (
            <BadgeDisplay
              key={badge.id}
              badge={badge}
              userBadge={userBadge}
              size={compact ? 'small' : 'medium'}
              showProgress={!userBadge && progress.current > 0}
              progress={progress.current}
              maxProgress={progress.target}
            />
          );
        })}
      </div>

      {/* Empty State */}
      {filteredBadges.length === 0 && (
        <div className="text-center py-8">
          <Star className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="pixel-text text-gray-400 mb-2">NO BADGES IN THIS CATEGORY</h3>
          <p className="outfit-text text-gray-500 text-sm">
            Try selecting a different category to see more badges
          </p>
        </div>
      )}

      {/* Recent Badges */}
      {!compact && earnedCount > 0 && (
        <div className="pixel-card bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-2 border-yellow-500/30">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h4 className="pixel-text text-yellow-400">RECENT ACHIEVEMENTS</h4>
          </div>
          
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
            {userBadges.slice(0, 8).map(userBadge => (
              <BadgeDisplay
                key={userBadge.id}
                badge={userBadge.badge}
                userBadge={userBadge}
                size="small"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgeGrid;