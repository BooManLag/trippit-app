import React, { useState, useEffect } from 'react';
import { Badge, UserBadge, BadgeProgress, badgeService } from '../services/badgeService';
import { Loader2, ChevronRight } from 'lucide-react';
import BadgeModal from './BadgeModal';

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
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [showModal, setShowModal] = useState(false);

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

  const handleBadgeClick = (badge: Badge) => {
    setSelectedBadge(badge);
    setShowModal(true);
  };

  const getSelectedBadgeData = () => {
    if (!selectedBadge) return {};
    
    const status = getBadgeStatus(selectedBadge);
    return {
      userBadge: status.type === 'earned' ? status.data : undefined,
      progress: status.type === 'progress' ? status.data.current_count : 0,
      maxProgress: status.type === 'progress' ? status.data.target_count : selectedBadge.requirement_value
    };
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

  // Limit the number of badges to the first 6
  const badgesToShow = badges.slice(0, 6);  // Only display the first 6 badges

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        {badgesToShow.map((badge) => {
          const status = getBadgeStatus(badge);
          const isEarned = status.type === 'earned';
          
          return (
            <div 
              key={badge.id} 
              className="flex flex-col items-center cursor-pointer group"
              onClick={() => handleBadgeClick(badge)}
            >
              <div className="relative">
                <div 
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border-4
                    ${isEarned 
                      ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-lg shadow-yellow-500/30 border-yellow-300 group-hover:scale-110' 
                      : 'bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 shadow-lg shadow-gray-700/30 border-gray-500 group-hover:scale-105'
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
            </div>
          );
        })}
      </div>

      {/* Badge Modal */}
      {selectedBadge && (
        <BadgeModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          badge={selectedBadge}
          {...getSelectedBadgeData()}
        />
      )}
    </div>
  );
};

export default BadgeGrid;
