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
  // Check if user exists using direct query to users table
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
      
      console.log('🔍 Checking if user exists:', cleanEmail);
      
      // Use maybeSingle() instead of single() to avoid 406 errors
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (error) {
        console.error('❌ Error checking user existence:', error);
        // On errors, assume user exists to avoid blocking invitations
        console.log('⚠️ Falling back to assuming user exists');
        return true;
      }

      const exists = !!data;
      console.log(exists ? '✅ User found' : '❌ User not found');
      
      return exists;
    } catch (error) {
      console.error('💥 Error in checkUserExists:', error);
      // Fallback: assume user exists to avoid blocking invitations
      console.log('⚠️ Falling back to assuming user exists due to error');
      return true;
    }
  },

  // Validate invitation before sending
  async validateInvitation(tripId: string, inviteeEmail: string): Promise<{ valid: boolean; message: string }> {
    try {
      const { data, error } = await supabase.rpc('validate_invitation_request', {
        p_trip_id: tripId,
        p_invitee_email: inviteeEmail.toLowerCase().trim()
      });

      if (error) {
        console.error('❌ Error validating invitation:', error);
        return { valid: false, message: error.message };
      }

      const result = data?.[0];
      if (!result) {
        return { valid: false, message: 'Validation failed' };
      }

      return {
        valid: result.is_valid,
        message: result.error_message || 'Validation successful'
      };
    } catch (error: any) {
      console.error('💥 Error in validateInvitation:', error);
      return { valid: false, message: error.message || 'Validation failed' };
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

    // Use the database validation function first
    const validation = await this.validateInvitation(tripId, cleanEmail);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Check if user exists in our system
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
      if (error.message.includes('Cannot invite yourself')) {
        throw new Error('You cannot invite yourself to a trip');
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

  // Get pending invitations for current user with separate queries to avoid RLS join issues
  async getPendingInvitations(): Promise<TripInvitation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    console.log('📥 Fetching pending invitations for user:', user.email);

    // Step 1: Fetch invitations without joins
    const { data: invitations, error: invitationsError } = await supabase
      .from('trip_invitations')
      .select(`
        id,
        trip_id,
        inviter_id,
        invitee_email,
        token,
        status,
        created_at,
        responded_at
      `)
      .eq('invitee_email', user.email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (invitationsError) {
      console.error('❌ Error fetching invitations:', invitationsError);
      throw new Error(`Failed to fetch invitations: ${invitationsError.message}`);
    }

    console.log(`📊 Found ${invitations?.length || 0} pending invitations`);

    if (!invitations || invitations.length === 0) {
      return [];
    }

    // Step 2: Fetch trip details separately
    const tripIds = [...new Set(invitations.map(inv => inv.trip_id))];
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, destination, start_date, end_date, max_participants')
      .in('id', tripIds);

    if (tripsError) {
      console.error('❌ Error fetching trips:', tripsError);
      throw new Error(`Failed to fetch trip details: ${tripsError.message}`);
    }

    // Step 3: Fetch inviter details separately
    const inviterIds = [...new Set(invitations.map(inv => inv.inviter_id))];
    const { data: inviters, error: invitersError } = await supabase
      .from('users')
      .select('id, display_name, email')
      .in('id', inviterIds);

    if (invitersError) {
      console.error('❌ Error fetching inviters:', invitersError);
      // Continue without inviter details rather than failing completely
    }

    // Step 4: Merge the data in application code
    const enrichedInvitations: TripInvitation[] = invitations.map((invitation) => {
      const trip = trips?.find(t => t.id === invitation.trip_id);
      const inviter = inviters?.find(u => u.id === invitation.inviter_id);

      return {
        id: invitation.id,
        trip_id: invitation.trip_id,
        inviter_id: invitation.inviter_id,
        invitee_email: invitation.invitee_email,
        token: invitation.token,
        status: invitation.status,
        created_at: invitation.created_at,
        responded_at: invitation.responded_at,
        trip: {
          destination: trip?.destination || 'Unknown',
          start_date: trip?.start_date || '',
          end_date: trip?.end_date || '',
          max_participants: trip?.max_participants || 2
        },
        inviter: {
          display_name: inviter?.display_name || 'Unknown',
          email: inviter?.email || 'Unknown'
        }
      };
    });

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

  // Get users who have accepted invitations to a trip with separate queries to avoid RLS join issues
  async getTripAcceptedUsers(tripId: string): Promise<AcceptedUser[]> {
    try {
      // Step 1: Fetch accepted invitations without joins
      const { data: acceptedInvitations, error: invitationsError } = await supabase
        .from('trip_invitations')
        .select('invitee_email')
        .eq('trip_id', tripId)
        .eq('status', 'accepted');

      if (invitationsError) {
        throw new Error(`Failed to fetch accepted invitations: ${invitationsError.message}`);
      }

      if (!acceptedInvitations || acceptedInvitations.length === 0) {
        return [];
      }

      // Step 2: Fetch user details by email
      const inviteeEmails = acceptedInvitations.map(inv => inv.invitee_email);
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, display_name, email')
        .in('email', inviteeEmails);

      if (usersError) {
        console.error('❌ Error fetching users:', usersError);
        return [];
      }

      if (!users || users.length === 0) {
        return [];
      }

      // Step 3: Transform the data to match the expected format
      return users.map((user: any) => ({
        id: user.id,
        display_name: user.display_name,
        email: user.email,
        user: {
          id: user.id,
          display_name: user.display_name,
          email: user.email
        }
      }));
    } catch (error: any) {
      console.error('Error fetching accepted users:', error);
      throw new Error(`Failed to fetch accepted users: ${error.message}`);
    }
  },

  // Get trip participants (from trip_participants table)
  async getTripParticipants(tripId: string): Promise<any[]> {
    try {
      // Step 1: Fetch participants without joins
      const { data: participants, error: participantsError } = await supabase
        .from('trip_participants')
        .select('user_id, role, joined_at')
        .eq('trip_id', tripId);

      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        return [];
      }

      if (!participants || participants.length === 0) {
        return [];
      }

      // Step 2: Fetch user details separately
      const userIds = [...new Set(participants.map(p => p.user_id))];
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, display_name, email')
        .in('id', userIds);

      if (usersError) {
        console.error('Error fetching user details:', usersError);
        // Continue with unknown users rather than failing completely
      }

      // Step 3: Merge the data in application code
      return participants.map(p => {
        const user = users?.find(u => u.id === p.user_id);
        return {
          user_id: p.user_id,
          role: p.role,
          joined_at: p.joined_at,
          user: user || { id: p.user_id, display_name: 'Unknown', email: 'Unknown' }
        };
      });
    } catch (error: any) {
      console.error('Error fetching trip participants:', error);
      return [];
    }
  }
};