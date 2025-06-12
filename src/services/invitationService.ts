import { supabase } from '../lib/supabase';

export interface TripInvitation {
  id: string;
  trip_id: string;
  inviter_id: string;
  invitee_email: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  responded_at?: string;
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
  // Check if user exists in our system
  async checkUserExists(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error && error.code === 'PGRST116') {
        return false; // No rows returned - user doesn't exist
      }

      if (error) {
        console.error('Error checking user existence:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error in checkUserExists:', error);
      return false;
    }
  },

  // Send invitation to email (only if user exists)
  async sendInvitation(tripId: string, inviteeEmail: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First check if user exists in our system
    const userExists = await this.checkUserExists(inviteeEmail);
    if (!userExists) {
      throw new Error('This email is not registered in our system. They need to sign up first!');
    }

    // Create invitation
    const { error } = await supabase
      .from('trip_invitations')
      .insert({
        trip_id: tripId,
        inviter_id: user.id,
        invitee_email: inviteeEmail.toLowerCase().trim(),
        status: 'pending'
      });

    if (error) {
      if (error.code === '23505') {
        throw new Error('This email has already been invited to this trip');
      }
      throw new Error(`Failed to send invitation: ${error.message}`);
    }
  },

  // Get pending invitations for current user
  async getPendingInvitations(): Promise<TripInvitation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get basic invitation data
    const { data: invitations, error } = await supabase
      .from('trip_invitations')
      .select('id, trip_id, inviter_id, invitee_email, status, created_at, responded_at')
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

  // Respond to invitation
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
  },

  // Get sent invitations for a trip
  async getTripInvitations(tripId: string): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: invitations, error } = await supabase
      .from('trip_invitations')
      .select('id, trip_id, inviter_id, invitee_email, status, created_at, responded_at')
      .eq('trip_id', tripId)
      .eq('inviter_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch trip invitations: ${error.message}`);
    }

    return invitations || [];
  },

  // Get accepted invitations (users who can access the trip)
  async getTripAcceptedUsers(tripId: string): Promise<any[]> {
    const { data: acceptedInvitations, error } = await supabase
      .from('trip_invitations')
      .select(`
        invitee_email,
        status,
        responded_at,
        users!inner(id, display_name, email)
      `)
      .eq('trip_id', tripId)
      .eq('status', 'accepted');

    if (error) {
      console.error('Error fetching accepted users:', error);
      return [];
    }

    return (acceptedInvitations || []).map(inv => ({
      email: inv.invitee_email,
      status: inv.status,
      joined_at: inv.responded_at,
      user: (inv as any).users
    }));
  }
};