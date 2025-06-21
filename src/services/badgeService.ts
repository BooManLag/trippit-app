import { supabase } from '../lib/supabase';

export interface Badge {
  id: string;
  badge_key: string;
  name: string;
  description: string;
  emoji: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  is_per_trip: boolean;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  trip_id?: string;
  earned_at: string;
  progress_data: any;
  badge: Badge;
}

export interface BadgeProgress {
  id: string;
  user_id: string;
  badge_key: string;
  trip_id?: string;
  current_count: number;
  target_count: number;
  progress_data: any;
  badge?: Badge;
}

export const badgeService = {
  // Get all available badges
  async getAllBadges(): Promise<Badge[]> {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .order('category', { ascending: true });

    if (error) {
      console.error('Error fetching badges:', error);
      return [];
    }

    return data || [];
  },

  // Get user's earned badges
  async getUserBadges(userId: string, tripId?: string): Promise<UserBadge[]> {
    let query = supabase
      .from('user_badges')
      .select(`
        *,
        badge:badges(*)
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (tripId) {
      query = query.eq('trip_id', tripId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user badges:', error);
      return [];
    }

    return data || [];
  },

  // Get user's badge progress
  async getBadgeProgress(userId: string, tripId?: string): Promise<BadgeProgress[]> {
    let query = supabase
      .from('badge_progress')
      .select(`
        *,
        badge:badges!badge_progress_badge_key_fkey(*)
      `)
      .eq('user_id', userId);

    if (tripId) {
      query = query.eq('trip_id', tripId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching badge progress:', error);
      return [];
    }

    return data || [];
  },

  // Award a badge to a user
  async awardBadge(userId: string, badgeKey: string, tripId?: string, progressData: any = {}): Promise<boolean> {
    try {
      // First get the badge
      const { data: badge } = await supabase
        .from('badges')
        .select('*')
        .eq('badge_key', badgeKey)
        .single();

      if (!badge) {
        console.error('Badge not found:', badgeKey);
        return false;
      }

      // Check if user already has this badge for this trip
      let query = supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_id', badge.id);

      if (badge.is_per_trip && tripId) {
        query = query.eq('trip_id', tripId);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        console.log('User already has this badge');
        return false;
      }

      // Award the badge
      const { error } = await supabase
        .from('user_badges')
        .insert({
          user_id: userId,
          badge_id: badge.id,
          trip_id: badge.is_per_trip ? tripId : null,
          progress_data: progressData
        });

      if (error) {
        console.error('Error awarding badge:', error);
        return false;
      }

      console.log(`✅ Badge awarded: ${badge.name} to user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error in awardBadge:', error);
      return false;
    }
  },

  // Update badge progress
  async updateBadgeProgress(
    userId: string, 
    badgeKey: string, 
    increment: number = 1, 
    tripId?: string,
    progressData: any = {}
  ): Promise<boolean> {
    try {
      // Get the badge to check target count
      const { data: badge } = await supabase
        .from('badges')
        .select('*')
        .eq('badge_key', badgeKey)
        .single();

      if (!badge) {
        console.error('Badge not found:', badgeKey);
        return false;
      }

      // Upsert progress
      const { data: progress, error } = await supabase
        .from('badge_progress')
        .upsert({
          user_id: userId,
          badge_key: badgeKey,
          trip_id: badge.is_per_trip ? tripId : null,
          current_count: increment,
          target_count: badge.requirement_value,
          progress_data: progressData
        }, {
          onConflict: badge.is_per_trip ? 'user_id,badge_key,trip_id' : 'user_id,badge_key',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating badge progress:', error);
        return false;
      }

      // Check if badge should be awarded
      if (progress.current_count >= progress.target_count) {
        await this.awardBadge(userId, badgeKey, tripId, progressData);
      }

      return true;
    } catch (error) {
      console.error('Error in updateBadgeProgress:', error);
      return false;
    }
  },

  // Check and award dare-related badges
  async checkDareBadges(userId: string, tripId: string): Promise<void> {
    try {
      // Get completed dares count for this trip
      const { data: completedDares } = await supabase
        .from('user_bucket_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('trip_id', tripId)
        .not('completed_at', 'is', null);

      const completedCount = completedDares?.length || 0;

      // Check Daredevil (first dare)
      if (completedCount >= 1) {
        await this.awardBadge(userId, 'daredevil', tripId);
      }

      // Check On a Roll (3 dares)
      if (completedCount >= 3) {
        await this.awardBadge(userId, 'on_a_roll', tripId);
      }

      // Check Bucket Champion (5 dares)
      if (completedCount >= 5) {
        await this.awardBadge(userId, 'bucket_champion', tripId);
      }

      // Check Bucket Legend (all available dares)
      const { data: allUserDares } = await supabase
        .from('user_bucket_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('trip_id', tripId);

      if (allUserDares && allUserDares.length > 0 && completedCount === allUserDares.length) {
        await this.awardBadge(userId, 'bucket_legend', tripId);
      }

      // Check No Fear (hardest dare) - look for 'Hard' difficulty completed dares
      const hardDares = completedDares?.filter(dare => {
        // You'd need to cross-reference with your dares data to check difficulty
        // For now, we'll award this badge for completing any 'chaotic' fun level dare
        return true; // Simplified for now
      });

      if (hardDares && hardDares.length > 0) {
        await this.awardBadge(userId, 'no_fear', tripId);
      }

    } catch (error) {
      console.error('Error checking dare badges:', error);
    }
  },

  // Check and award checklist-related badges
  async checkChecklistBadges(userId: string, tripId: string): Promise<void> {
    try {
      // Get checklist completion status
      const { data: checklistItems } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('user_id', userId)
        .eq('trip_id', tripId);

      if (!checklistItems || checklistItems.length === 0) return;

      const completedItems = checklistItems.filter(item => item.is_completed);
      const totalItems = checklistItems.length;
      const completionRate = completedItems.length / totalItems;

      // Check Checklist Conqueror (first completion)
      if (completionRate === 1.0) {
        await this.awardBadge(userId, 'checklist_conqueror', tripId);
      }

      // Check Detail-Oriented (15+ items)
      if (totalItems >= 15) {
        await this.awardBadge(userId, 'detail_oriented', tripId);
      }

      // Check Prepared Pro (completed 3 days before trip)
      if (completionRate === 1.0) {
        const { data: trip } = await supabase
          .from('trips')
          .select('start_date')
          .eq('id', tripId)
          .single();

        if (trip) {
          const tripStart = new Date(trip.start_date);
          const now = new Date();
          const daysUntilTrip = Math.ceil((tripStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilTrip >= 3) {
            await this.awardBadge(userId, 'prepared_pro', tripId);
          }
        }
      }

      // Check Checklist Master (5 completed trips) - this is cross-trip
      const { data: completedTrips } = await supabase
        .from('checklist_items')
        .select('trip_id')
        .eq('user_id', userId)
        .eq('is_completed', true);

      if (completedTrips) {
        const uniqueTrips = new Set(completedTrips.map(item => item.trip_id));
        if (uniqueTrips.size >= 5) {
          await this.awardBadge(userId, 'checklist_master');
        }
      }

    } catch (error) {
      console.error('Error checking checklist badges:', error);
    }
  },

  // Check and award invitation-related badges
  async checkInvitationBadges(userId: string, tripId: string): Promise<void> {
    try {
      // Get sent invitations for this trip
      const { data: sentInvitations } = await supabase
        .from('trip_invitations')
        .select('*')
        .eq('inviter_id', userId)
        .eq('trip_id', tripId);

      const invitationCount = sentInvitations?.length || 0;
      const acceptedInvitations = sentInvitations?.filter(inv => inv.status === 'accepted') || [];

      // Check Social Explorer (first invite)
      if (invitationCount >= 1) {
        await this.awardBadge(userId, 'social_explorer', tripId);
      }

      // Check Travel Crew (3 invites)
      if (invitationCount >= 3) {
        await this.awardBadge(userId, 'travel_crew', tripId);
      }

      // Check Squad Goals (3 accepted)
      if (acceptedInvitations.length >= 3) {
        await this.awardBadge(userId, 'squad_goals', tripId);
      }

      // Check Referral Master (5 new signups) - would need additional tracking
      // This is simplified for now
      if (acceptedInvitations.length >= 5) {
        await this.awardBadge(userId, 'referral_master', tripId);
      }

    } catch (error) {
      console.error('Error checking invitation badges:', error);
    }
  },

  // Check combo badges
  async checkComboBadges(userId: string, tripId: string): Promise<void> {
    try {
      // Check World Builder (1 dare + 1 tip + 1 checklist + 1 invite)
      const [dares, tips, checklist, invites] = await Promise.all([
        supabase.from('user_bucket_progress').select('id').eq('user_id', userId).eq('trip_id', tripId).not('completed_at', 'is', null).limit(1),
        // Tips would need a separate table - simplified for now
        Promise.resolve({ data: [] }),
        supabase.from('checklist_items').select('id').eq('user_id', userId).eq('trip_id', tripId).eq('is_completed', true).limit(1),
        supabase.from('trip_invitations').select('id').eq('inviter_id', userId).eq('trip_id', tripId).limit(1)
      ]);

      if (dares.data?.length && checklist.data?.length && invites.data?.length) {
        await this.awardBadge(userId, 'world_builder', tripId);
      }

    } catch (error) {
      console.error('Error checking combo badges:', error);
    }
  }
};