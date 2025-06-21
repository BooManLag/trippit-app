import React, { useState, useEffect } from 'react';
import { Badge, UserBadge, BadgeProgress, badgeService } from '../services/badgeService';
import BadgeItem from './BadgeItem';
import { useAuth } from '../hooks/useAuth';
import Button from './Button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface BadgeGridProps {
  tripId?: string;
  category?: string;
}

export function BadgeGrid({ tripId, category }: BadgeGridProps) {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [badgeProgress, setBadgeProgress] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchBadgeData();
  }, [user, tripId, category]);

  const fetchBadgeData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [allBadges, earnedBadges, progress] = await Promise.all([
        badgeService.getAllBadges(),
        badgeService.getUserBadges(user.id, tripId),
        badgeService.getBadgeProgress(user.id, tripId)
      ]);

      let filteredBadges = allBadges;
      if (category) {
        filteredBadges = allBadges.filter(badge => badge.category === category);
      }

      setBadges(filteredBadges);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-6 shadow-sm animate-pulse">
            <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🏆</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No badges available</h3>
        <p className="text-gray-600">Check back later for new badges to earn!</p>
      </div>
    );
  }

  const displayedBadges = showAll ? badges : badges.slice(0, 6);
  const hasMoreBadges = badges.length > 6;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedBadges.map((badge) => {
          const status = getBadgeStatus(badge);
          return (
            <BadgeItem
              key={badge.id}
              badge={badge}
              status={status}
            />
          );
        })}
      </div>

      {hasMoreBadges && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-2"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                View More ({badges.length - 6} more)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export default BadgeGrid