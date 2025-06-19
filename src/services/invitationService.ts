import { supabase } from '../lib/supabase';

export interface TripInvitation {
  id: string;
  trip_id: string;
  inviter_id: string;
  invitee_email: string;
  token: string;
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

export interface AcceptedUser {
  id: string;
  display_name: string;
  email: string;
  user: {
    id: string;
    display_name: string;
    email: string;
  };
}

// Generate a secure token
function generateToken(): string {
  return crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
}

export const invitationService = {
  // Check if user exists in our system
  async checkUserExists(email: string): Promise<boolean> {
    try {
      const cleanEmail = email.toLowerCase().trim();
      
      // First try exact match
      const { data: exactMatch, error: exactError } = await supabase
        .from('users')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (exactError) {
        console.error('Error in exact email match:', exactError);
      }

      if (exactMatch) {
        console.log('Found user with exact email match:', cleanEmail);
        return true;
      }

      // If exact match fails, try case-insensitive search
      const { data: caseInsensitiveMatch, error: caseError } = await supabase
        .from('users')
        .select('id, email')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (caseError) {
        console.error('Error in case-insensitive email search:', caseError);
      }

      if (caseInsensitiveMatch) {
        console.log('Found user with case-insensitive match:', caseInsensitiveMatch.email);
        return true;
      }

      // If both fail, try a broader search to see what emails exist
      const { data: allUsers, error: allError } = await supabase
        .from('users')
        .select('email')
        .limit(100);

      if (allError) {
        console.error('Error fetching all users for debugging:', allError);
      } else {
        console.log('Available emails in database:', allUsers?.map(u => u.email));
        console.log('Looking for email:', cleanEmail);
      }

      return false;
    } catch (error) {
      console.error('Error in checkUserExists:', error);
      return false;
    }
  },

  // Send invitation with token
  async sendInvitation(tripId: string, inviteeEmail: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First check if user exists in our system
    const userExists = await this.checkUserExists(inviteeEmail);
    if (!userExists) {
      throw new Error('This email is not registered in our system. They need to sign up first!');
    }

    // Generate secure token
    const token = generateToken();

    // Create invitation
    const { error } = await supabase
      .from('trip_invitations')
      .insert({
        trip_id: tripId,
        inviter_id: user.id,
        invitee_email: inviteeEmail.toLowerCase().trim(),
        token
      });

    if (error) {
      if (error.code === '23505') {
        throw new Error('This email has already been invited to this trip');
      }
      throw new Error(`Failed to send invitation: ${error.message}`);
    }

    // TODO: Send email with invitation link
    // For now, we'll handle invitations in-app only
    console.log(`Invitation created with token: ${token}`);
    console.log(`Invitation link would be: ${window.location.origin}/accept-invite?token=${token}`);
  },

  // Get pending invitations for current user
  async getPendingInvitations(): Promise<TripInvitation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get basic invitation data
    const { data: invitations, error } = await supabase
      .from('trip_invitations')
      .select('id, trip_id, inviter_id, invitee_email, token, status, created_at, responded_at')
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

  // Accept invitation by token
  async acceptInvitation(token: string): Promise<{ success: boolean; message: string; tripId?: string }> {
    try {
      const { data, error } = await supabase.rpc('accept_invitation', {
        p_token: token
      });

      if (error) {
        throw new Error(`Failed to accept invitation: ${error.message}`);
      }

      const result = data?.[0];
      if (!result) {
        throw new Error('No response from server');
      }

      return {
        success: result.success,
        message: result.message,
        tripId: result.trip_id
      };
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      return {
        success: false,
        message: error.message || 'Failed to accept invitation'
      };
    }
  },

  // Decline invitation by token
  async declineInvitation(token: string): Promise<void> {
    const { error } = await supabase
      .from('trip_invitations')
      .update({ 
        status: 'declined', 
        responded_at: new Date().toISOString() 
      })
      .eq('token', token);

    if (error) {
      throw new Error(`Failed to decline invitation: ${error.message}`);
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
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch trip invitations: ${error.message}`);
    }

    return invitations || [];
  },

  // Get users who have accepted invitations to a trip
  async getTripAcceptedUsers(tripId: string): Promise<AcceptedUser[]> {
    try {
      const { data: acceptedInvitations, error } = await supabase
        .from('trip_invitations')
        .select(`
          invitee_email,
          users!inner(id, display_name, email)
        `)
        .eq('trip_id', tripId)
        .eq('status', 'accepted');

      if (error) {
        throw new Error(`Failed to fetch accepted users: ${error.message}`);
      }

      if (!acceptedInvitations || acceptedInvitations.length === 0) {
        return [];
      }

      // Transform the data to match the expected format
      return acceptedInvitations.map((invitation: any) => ({
        id: invitation.users.id,
        display_name: invitation.users.display_name,
        email: invitation.users.email,
        user: {
          id: invitation.users.id,
          display_name: invitation.users.display_name,
          email: invitation.users.email
        }
      }));
    } catch (error: any) {
      console.error('Error fetching accepted users:', error);
      throw new Error(`Failed to fetch accepted users: ${error.message}`);
    }
  },

  // Get trip participants (accepted invitations + owner)
  async getTripParticipants(tripId: string): Promise<any[]> {
    const { data: participants, error } = await supabase
      .from('trip_participants')
      .select(`
        user_id,
        role,
        joined_at,
        users!inner(id, display_name, email)
      `)
      .eq('trip_id', tripId);

    if (error) {
      console.error('Error fetching participants:', error);
      return [];
    }

    return (participants || []).map(p => ({
      user_id: p.user_id,
      role: p.role,
      joined_at: p.joined_at,
      user: (p as any).users
    }));
  }
};