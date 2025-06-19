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
  // Check if user exists in our system using the users table
  async checkUserExists(email: string): Promise<boolean> {
    try {
      // Clean and validate the email first
      const cleanEmail = email?.toString()?.toLowerCase()?.trim();
      
      if (!cleanEmail) {
        console.log('❌ Invalid email provided:', email);
        return false;
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        console.log('❌ Invalid email format:', cleanEmail);
        return false;
      }
      
      console.log('🔍 Checking if user exists in users table:', cleanEmail);
      
      // Query the public.users table
      const { data: userRecord, error } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (error) {
        console.error('❌ Database error querying users table:', error);
        throw error;
      }

      const exists = !!userRecord;
      console.log(exists ? '✅ User found in users table' : '❌ User not found in users table');
      console.log('📊 Query result:', { 
        found: exists, 
        userEmail: userRecord?.email,
        userId: userRecord?.id 
      });
      
      return exists;
    } catch (error) {
      console.error('💥 Error in checkUserExists:', error);
      return false;
    }
  },

  // Send invitation with token
  async sendInvitation(tripId: string, inviteeEmail: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Clean the email first
    const cleanEmail = inviteeEmail?.toString()?.toLowerCase()?.trim();
    if (!cleanEmail) {
      throw new Error('Please provide a valid email address');
    }

    console.log('📧 sendInvitation called with:', { 
      tripId, 
      inviteeEmail: cleanEmail,
      currentUserEmail: user.email,
      currentUserId: user.id
    });

    // Validate that we're not inviting ourselves
    if (cleanEmail === user.email?.toLowerCase()) {
      throw new Error('You cannot invite yourself to a trip');
    }

    // First check if user exists in our system
    const userExists = await this.checkUserExists(cleanEmail);
    if (!userExists) {
      throw new Error('This email is not registered in our system. They need to sign up first!');
    }

    // Generate secure token
    const token = generateToken();

    console.log('💾 Creating invitation with data:', {
      trip_id: tripId,
      inviter_id: user.id,
      invitee_email: cleanEmail,
      token: token.substring(0, 10) + '...' // Only log first 10 chars for security
    });

    // Create invitation
    const { data, error } = await supabase
      .from('trip_invitations')
      .insert({
        trip_id: tripId,
        inviter_id: user.id,
        invitee_email: cleanEmail,
        token
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Database error creating invitation:', error);
      if (error.code === '23505') {
        throw new Error('This email has already been invited to this trip');
      }
      throw new Error(`Failed to send invitation: ${error.message}`);
    }

    console.log('✅ Invitation created successfully:', {
      id: data.id,
      invitee_email: data.invitee_email,
      status: data.status
    });

    // TODO: Send email with invitation link
    // For now, we'll handle invitations in-app only
    console.log(`🔗 Invitation link would be: ${window.location.origin}/accept-invite?token=${token}`);
  },

  // Get pending invitations for current user with optimized single query
  async getPendingInvitations(): Promise<TripInvitation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    console.log('📥 Fetching pending invitations for user:', user.email);

    // Use a single query with joins to get all data at once
    const { data: invitations, error } = await supabase
      .from('trip_invitations')
      .select(`
        id,
        trip_id,
        inviter_id,
        invitee_email,
        token,
        status,
        created_at,
        responded_at,
        trips!inner(destination, start_date, end_date, max_participants),
        users!trip_invitations_inviter_id_fkey(display_name, email)
      `)
      .eq('invitee_email', user.email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching invitations:', error);
      throw new Error(`Failed to fetch invitations: ${error.message}`);
    }

    console.log(`📊 Found ${invitations?.length || 0} pending invitations`);

    if (!invitations || invitations.length === 0) {
      return [];
    }

    // Transform the data to match the expected interface
    const enrichedInvitations: TripInvitation[] = invitations.map((invitation: any) => ({
      id: invitation.id,
      trip_id: invitation.trip_id,
      inviter_id: invitation.inviter_id,
      invitee_email: invitation.invitee_email,
      token: invitation.token,
      status: invitation.status,
      created_at: invitation.created_at,
      responded_at: invitation.responded_at,
      trip: {
        destination: invitation.trips.destination,
        start_date: invitation.trips.start_date,
        end_date: invitation.trips.end_date,
        max_participants: invitation.trips.max_participants
      },
      inviter: {
        display_name: invitation.users.display_name,
        email: invitation.users.email
      }
    }));

    console.log(`✅ Enriched ${enrichedInvitations.length} invitations`);
    return enrichedInvitations;
  },

  // Accept invitation by token
  async acceptInvitation(token: string): Promise<{ success: boolean; message: string; tripId?: string }> {
    try {
      console.log('🎯 Accepting invitation with token:', token.substring(0, 10) + '...');
      
      const { data, error } = await supabase.rpc('accept_invitation', {
        p_token: token
      });

      if (error) {
        console.error('❌ RPC error:', error);
        throw new Error(`Failed to accept invitation: ${error.message}`);
      }

      const result = data?.[0];
      if (!result) {
        throw new Error('No response from server');
      }

      console.log('✅ Invitation acceptance result:', result);

      return {
        success: result.success,
        message: result.message,
        tripId: result.trip_id
      };
    } catch (error: any) {
      console.error('💥 Error accepting invitation:', error);
      return {
        success: false,
        message: error.message || 'Failed to accept invitation'
      };
    }
  },

  // Decline invitation by token
  async declineInvitation(token: string): Promise<void> {
    console.log('❌ Declining invitation with token:', token.substring(0, 10) + '...');
    
    const { error } = await supabase
      .from('trip_invitations')
      .update({ 
        status: 'declined', 
        responded_at: new Date().toISOString() 
      })
      .eq('token', token);

    if (error) {
      console.error('❌ Error declining invitation:', error);
      throw new Error(`Failed to decline invitation: ${error.message}`);
    }

    console.log('✅ Invitation declined successfully');
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