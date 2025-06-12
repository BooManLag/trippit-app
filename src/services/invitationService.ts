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

export interface TripParticipant {
  id: string;
  trip_id: string;
  user_id: string;
  email: string;
  role: 'owner' | 'participant';
  joined_at: string;
  user: {
    display_name: string;
    email: string;
  };
}

export const invitationService = {
  // Send invitation to email
  async sendInvitation(tripId: string, inviteeEmail: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user exists in our system
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', inviteeEmail.toLowerCase().trim())
      .single();

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

  // Get trip participants
  async getTripParticipants(tripId: string): Promise<TripParticipant[]> {
    const { data: participants, error } = await supabase
      .from('trip_participants')
      .select(`
        id, trip_id, user_id, email, role, joined_at,
        users!inner(display_name, email)
      `)
      .eq('trip_id', tripId)
      .order('joined_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch participants: ${error.message}`);
    }

    return (participants || []).map(p => ({
      ...p,
      user: (p as any).users
    }));
  },

  // Get sent invitations for a trip
  async getTripInvitations(tripId: string): Promise<TripInvitation[]> {
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

  // Check if user can join trip (for direct links)
  async canJoinTrip(tripId: string): Promise<{ canJoin: boolean; reason?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { canJoin: false, reason: 'Not authenticated' };

    // Check if trip exists
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('max_participants')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      return { canJoin: false, reason: 'Trip not found' };
    }

    // Check if already a participant
    const { data: existingParticipant } = await supabase
      .from('trip_participants')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single();

    if (existingParticipant) {
      return { canJoin: false, reason: 'Already a participant' };
    }

    // Check if trip is full
    const { data: participants, error: participantError } = await supabase
      .from('trip_participants')
      .select('id')
      .eq('trip_id', tripId);

    if (participantError) {
      return { canJoin: false, reason: 'Error checking capacity' };
    }

    if ((participants?.length || 0) >= trip.max_participants) {
      return { canJoin: false, reason: 'Trip is full' };
    }

    return { canJoin: true };
  },

  // Join trip directly (for public links)
  async joinTrip(tripId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { canJoin, reason } = await this.canJoinTrip(tripId);
    if (!canJoin) {
      throw new Error(reason || 'Cannot join trip');
    }

    // Add user as participant
    const { error } = await supabase
      .from('trip_participants')
      .insert({
        trip_id: tripId,
        user_id: user.id,
        email: user.email!,
        role: 'participant'
      });

    if (error) {
      if (error.code === '23505') {
        throw new Error('You are already a participant in this trip');
      }
      throw new Error(`Failed to join trip: ${error.message}`);
    }
  }
};