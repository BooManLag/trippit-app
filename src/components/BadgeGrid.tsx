import React, { useState, useEffect } from 'react';
import { Badge, UserBadge, BadgeProgress, badgeService } from '../services/badgeService';
import { Loader2, Star, Award, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [currentTab, setCurrentTab] = useState(0);

  const BADGES_PER_TAB = 5;

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

  const earnedCount = userBadges.length;
  const totalCount = badges.length;
  const totalTabs = Math.ceil(badges.length / BADGES_PER_TAB);
  const currentBadges = badges.slice(currentTab * BADGES_PER_TAB, (currentTab + 1) * BADGES_PER_TAB);

  const goToPrevTab = () => {
    setCurrentTab(prev => Math.max(0, prev - 1));
  };

  const goToNextTab = () => {
    setCurrentTab(prev => Math.min(totalTabs - 1, prev + 1));
  };

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Award className="w-5 h-5 text-yellow-400" />
          <span className="pixel-text text-yellow-400 text-sm">
            {earnedCount}/{totalCount} EARNED
          </span>
        </div>
        <div className="w-32 bg-gray-700 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 h-full transition-all duration-500"
            style={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevTab}
          disabled={currentTab === 0}
          className={`p-2 rounded-full transition-all ${
            currentTab === 0 
              ? 'text-gray-600 cursor-not-allowed' 
              : 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {Array.from({ length: totalTabs }, (_, index) => (
            <button
              key={index}
              onClick={() => setCurrentTab(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentTab 
                  ? 'bg-yellow-400 w-6' 
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
            />
          ))}
        </div>

        <button
          onClick={goToNextTab}
          disabled={currentTab === totalTabs - 1}
          className={`p-2 rounded-full transition-all ${
            currentTab === totalTabs - 1 
              ? 'text-gray-600 cursor-not-allowed' 
              : 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Badge Grid - Current Tab - Only Circles */}
      <div className="grid grid-cols-5 gap-4 justify-items-center">
        {currentBadges.map((badge, index) => {
          const status = getBadgeStatus(badge);
          const isEarned = status.type === 'earned';
          const hasProgress = status.type === 'progress';
          
          return (
            <div 
              key={badge.id}
              className="cursor-pointer group"
              onClick={() => handleBadgeClick(badge)}
            >
              <div className="relative">
                <div 
                  className={`
                    w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 border-4
                    ${isEarned 
                      ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-lg shadow-yellow-500/30 border-yellow-300 group-hover:scale-110' 
                      : 'bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 shadow-lg shadow-gray-700/30 border-gray-500 group-hover:scale-105'
                    }
                  `}
                >
                  <span 
                    className={`
                      text-xl sm:text-2xl transition-all duration-300
                      ${isEarned ? 'grayscale-0' : 'grayscale opacity-50'}
                      group-hover:scale-110
                    `}
                  >
                    {badge.emoji}
                  </span>
                </div>

                {/* Progress Ring for badges with progress */}
                {!isEarned && hasProgress && status.data && (
                  <div className="absolute inset-0">
                    <svg 
                      className="w-16 h-16 sm:w-20 sm:h-20 transform -rotate-90"
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
                        strokeDasharray={`${(status.data.current_count / status.data.target_count) * 283} 283`}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    </svg>
                  </div>
                )}

                {/* Glow effect for earned badges */}
                {isEarned && (
                  <div className="absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 opacity-20 animate-pulse blur-sm" />
                )}

                {/* Small earned indicator */}
                {isEarned && (
                  <div className="absolute -bottom-1 -right-1">
                    <Star className="w-4 h-4 text-yellow-400 drop-shadow-lg" />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Fill empty slots if current tab has less than 5 badges */}
        {currentBadges.length < BADGES_PER_TAB && 
          Array.from({ length: BADGES_PER_TAB - currentBadges.length }, (_, index) => (
            <div key={`empty-${index}`} className="w-16 h-16 sm:w-20 sm:h-20" />
          ))
        }
      </div>

      {/* Tab Indicator */}
      <div className="text-center">
        <span className="pixel-text text-xs text-gray-500">
          {currentTab + 1} / {totalTabs}
        </span>
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