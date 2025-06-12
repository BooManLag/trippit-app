import { supabase } from '../lib/supabase';

export interface TripInvitation {
  id: string;
  trip_id: string;
  inviter_id: string;
  invitee_email: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  trip: {
    destination: string;
    start_date: string;
    end_date: string;
    max_participants: number;
  };
  inviter: {
    display_name: string;
    email: string;
  };
}

export const invitationService = {
  async getPendingInvitations(): Promise<TripInvitation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get basic invitation data
    const { data: invitations, error } = await supabase
      .from('trip_invitations')
      .select('id, trip_id, inviter_id, invitee_email, status, created_at')
      .eq('invitee_email', user.email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch invitations: ${error.message}`);
    }

    if (!invitations || invitations.length === 0) {
      return [];
    }

    // Enrich with trip and inviter data
    const enrichedInvitations: TripInvitation[] = [];

    for (const invitation of invitations) {
      try {
        // Get trip details
        const { data: tripData, error: tripError } = await supabase
          .from('trips')
          .select('destination, start_date, end_date, max_participants')
          .eq('id', invitation.trip_id)
          .single();

        // Get inviter details
        const { data: inviterData, error: inviterError } = await supabase
          .from('users')
          .select('display_name, email')
          .eq('id', invitation.inviter_id)
          .single();

        if (tripData && inviterData && !tripError && !inviterError) {
          enrichedInvitations.push({
            ...invitation,
            trip: tripData,
            inviter: inviterData
          });
        }
      } catch (err) {
        console.warn('Error enriching invitation:', err);
      }
    }

    return enrichedInvitations;
  },

  async respondToInvitation(invitationId: string, response: 'accepted' | 'declined'): Promise<void> {
    const { data, error } = await supabase.rpc('respond_to_invitation', {
      p_invitation_id: invitationId,
      p_response: response
    });

    if (error) {
      throw new Error(`Failed to respond to invitation: ${error.message}`);
    }

    const result = data?.[0];
    if (!result?.success) {
      throw new Error(result?.message || 'Failed to respond to invitation');
    }
  }
};