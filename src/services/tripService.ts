import { supabase } from '../lib/supabase';

export interface Trip {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  max_participants: number;
  user_id: string;
  created_at: string;
}

export interface TripWithParticipants extends Trip {
  participant_count: number;
  user_role: 'owner' | 'participant';
  status: 'not_started' | 'in_progress' | 'completed';
}

export const tripService = {
  async createTrip(tripData: {
    destination: string;
    start_date: string;
    end_date: string;
    max_participants: number;
  }): Promise<Trip> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Ensure user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      // Create user profile
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          display_name: user.user_metadata?.display_name || user.email!.split('@')[0]
        });

      if (insertError) {
        throw new Error(`Failed to create user profile: ${insertError.message}`);
      }
    } else if (profileError) {
      throw new Error(`Profile error: ${profileError.message}`);
    }

    // Create trip
    const { data: trip, error } = await supabase
      .from('trips')
      .insert({
        ...tripData,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create trip: ${error.message}`);
    }

    return trip;
  },

  async getUserTrips(): Promise<TripWithParticipants[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get trips where user is participant
    const { data: participantData, error } = await supabase
      .from('trip_participants')
      .select(`
        role,
        trips!inner (
          id,
          destination,
          start_date,
          end_date,
          max_participants,
          user_id,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch trips: ${error.message}`);
    }

    if (!participantData || participantData.length === 0) {
      return [];
    }

    // Get participant counts for each trip
    const tripIds = participantData.map(p => (p as any).trips.id);
    const { data: participantCounts } = await supabase
      .from('trip_participants')
      .select('trip_id')
      .in('trip_id', tripIds);

    const countMap = (participantCounts || []).reduce((acc, item) => {
      acc[item.trip_id] = (acc[item.trip_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Transform data
    return participantData.map(p => {
      const trip = (p as any).trips;
      const today = new Date();
      const startDate = new Date(trip.start_date);
      const endDate = new Date(trip.end_date);

      let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
      if (today > endDate) {
        status = 'completed';
      } else if (today >= startDate && today <= endDate) {
        status = 'in_progress';
      }

      return {
        ...trip,
        participant_count: countMap[trip.id] || 0,
        user_role: p.role as 'owner' | 'participant',
        status
      };
    });
  },

  async deleteTrip(tripId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user owns the trip
    const { data: trip } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (trip?.user_id === user.id) {
      // Delete entire trip
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) {
        throw new Error(`Failed to delete trip: ${error.message}`);
      }
    } else {
      // Remove user from trip
      const { error } = await supabase
        .from('trip_participants')
        .delete()
        .eq('trip_id', tripId)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(`Failed to leave trip: ${error.message}`);
      }
    }
  }
};