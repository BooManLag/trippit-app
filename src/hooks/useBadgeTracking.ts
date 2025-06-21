import { useEffect } from 'react';
import { badgeService } from '../services/badgeService';

export const useBadgeTracking = (userId: string | null, tripId: string | null) => {
  
  const checkAllBadges = async () => {
    if (!userId || !tripId) return;
    
    try {
      await Promise.all([
        badgeService.checkDareBadges(userId, tripId),
        badgeService.checkChecklistBadges(userId, tripId),
        badgeService.checkInvitationBadges(userId, tripId),
        badgeService.checkComboBadges(userId, tripId)
      ]);
    } catch (error) {
      console.error('Error checking badges:', error);
    }
  };

  const trackDareCompletion = async () => {
    if (!userId || !tripId) return;
    await badgeService.checkDareBadges(userId, tripId);
  };

  const trackChecklistCompletion = async () => {
    if (!userId || !tripId) return;
    await badgeService.checkChecklistBadges(userId, tripId);
  };

  const trackInvitation = async () => {
    if (!userId || !tripId) return;
    await badgeService.checkInvitationBadges(userId, tripId);
  };

  const trackTipSharing = async () => {
    if (!userId || !tripId) return;
    // Implement tip tracking when tip system is ready
  };

  return {
    checkAllBadges,
    trackDareCompletion,
    trackChecklistCompletion,
    trackInvitation,
    trackTipSharing
  };
};