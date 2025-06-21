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

    // CRITICAL: Check if we're trying to invite ourselves
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

  // Get pending invitations for current user using the new RPC function
  async getPendingInvitations(): Promise<TripInvitation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    console.log('📥 Fetching pending invitations for user:', user.email);

    try {
      // Use the new RPC function that returns properly enriched data
      const { data, error } = await supabase.rpc('get_pending_invitations_for_user');

      if (error) {
        console.error('❌ Error fetching invitations via RPC:', error);
        throw new Error(`Failed to fetch invitations: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.log('📊 No pending invitations found');
        return [];
      }

      console.log(`📊 Found ${data.length} pending invitations via RPC`);

      // Transform the RPC result to match our interface
      const enrichedInvitations: TripInvitation[] = data.map((row: any) => ({
        id: row.invitation_id,
        trip_id: row.trip_id,
        inviter_id: row.inviter_id,
        invitee_email: row.invitee_email,
        token: row.token,
        status: row.status,
        created_at: row.created_at,
        responded_at: row.responded_at,
        trip: {
          destination: row.trip_destination,
          start_date: row.trip_start_date,
          end_date: row.trip_end_date,
          max_participants: row.trip_max_participants
        },
        inviter: {
          display_name: row.inviter_display_name || row.inviter_email.split('@')[0],
          email: row.inviter_email
        }
      }));

      console.log(`✅ Enriched ${enrichedInvitations.length} invitations via RPC`);
      return enrichedInvitations;
    } catch (error: any) {
      console.error('💥 Error in getPendingInvitations:', error);
      throw new Error(`Failed to fetch invitations: ${error.message}`);
    }
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
        tripId: result.joined_trip_id
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

  // Get users who have accepted invitations to a trip using the new RPC function
  async getTripAcceptedUsers(tripId: string): Promise<AcceptedUser[]> {
    try {
      // Use the new RPC function for better data consistency
      const { data, error } = await supabase.rpc('get_trip_participants_with_users', {
        p_trip_id: tripId
      });

      if (error) {
        console.error('❌ Error fetching participants via RPC:', error);
        throw new Error(`Failed to fetch participants: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Transform the RPC result to match the expected format
      return data.map((participant: any) => ({
        id: participant.user_id,
        display_name: participant.user_display_name,
        email: participant.user_email,
        user: {
          id: participant.user_id,
          display_name: participant.user_display_name,
          email: participant.user_email
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
      // Use the new RPC function for consistency
      const { data, error } = await supabase.rpc('get_trip_participants_with_users', {
        p_trip_id: tripId
      });

      if (error) {
        console.error('Error fetching participants:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Transform to match expected format
      return data.map((p: any) => ({
        user_id: p.user_id,
        role: p.role,
        joined_at: p.joined_at,
        user: {
          id: p.user_id,
          display_name: p.user_display_name || 'Unknown',
          email: p.user_email || 'Unknown'
        }
      }));
    } catch (error: any) {
      console.error('Error fetching trip participants:', error);
      return [];
    }
  }
};