import { supabase } from '../lib/supabase';

export interface ReactionCounts {
  starsCount: number;
  shitsCount: number;
  totalCount: number;
  starPercentage: number;
  shitPercentage: number;
  userReaction: 'star' | 'shit' | null;
}

export const reactionService = {
  /**
   * Add or update a reaction to a post
   * @param postId The ID of the post to react to
   * @param reactionType The type of reaction ('star' or 'shit')
   * @returns The updated reaction counts
   */
  async addReaction(postId: string, reactionType: 'star' | 'shit'): Promise<ReactionCounts> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if user already has a reaction for this post
      const { data: existingReaction } = await supabase
        .from('post_reactions')
        .select('id, reaction_type')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .maybeSingle();

      if (existingReaction) {
        if (existingReaction.reaction_type === reactionType) {
          // User is clicking the same reaction again, remove it (toggle off)
          await supabase
            .from('post_reactions')
            .delete()
            .eq('id', existingReaction.id);
        } else {
          // User is changing their reaction type
          await supabase
            .from('post_reactions')
            .update({ reaction_type: reactionType })
            .eq('id', existingReaction.id);
        }
      } else {
        // User is adding a new reaction
        await supabase
          .from('post_reactions')
          .insert({
            user_id: user.id,
            post_id: postId,
            reaction_type: reactionType
          });
      }

      // Get updated reaction counts
      return await this.getReactionCounts(postId);
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  },

  /**
   * Get reaction counts for a post
   * @param postId The ID of the post to get reactions for
   * @returns The reaction counts
   */
  async getReactionCounts(postId: string): Promise<ReactionCounts> {
    try {
      const { data, error } = await supabase
        .rpc('get_post_reactions', { p_post_id: postId });

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          starsCount: 0,
          shitsCount: 0,
          totalCount: 0,
          starPercentage: 0,
          shitPercentage: 0,
          userReaction: null
        };
      }

      return {
        starsCount: data[0].stars_count,
        shitsCount: data[0].shits_count,
        totalCount: data[0].total_count,
        starPercentage: data[0].star_percentage,
        shitPercentage: data[0].shit_percentage,
        userReaction: data[0].user_reaction as 'star' | 'shit' | null
      };
    } catch (error) {
      console.error('Error getting reaction counts:', error);
      throw error;
    }
  },

  /**
   * Subscribe to reaction changes for a post
   * @param postId The ID of the post to subscribe to
   * @param callback Function to call when reactions change
   * @returns A function to unsubscribe
   */
  subscribeToReactions(postId: string, callback: (counts: ReactionCounts) => void): () => void {
    const channel = supabase
      .channel(`post_reactions:${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_reactions',
          filter: `post_id=eq.${postId}`
        },
        async () => {
          // When any reaction changes, fetch the latest counts
          try {
            const counts = await this.getReactionCounts(postId);
            callback(counts);
          } catch (error) {
            console.error('Error in reaction subscription:', error);
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  }
};