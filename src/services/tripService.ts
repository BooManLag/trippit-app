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

export const tripService = {
  async createTrip(tripData: {
    destination: string;
    start_date: string;
    end_date: string;
    max_participants: number;
  }): Promise<Trip> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Ensure user profile exists using maybeSingle()
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Profile error: ${profileError.message}`);
    }

    if (!profile) {
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

    // Log the city visit for the pee chart
    try {
      const [city, country] = tripData.destination.split(', ');
      
      if (city && country) {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log_visit`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            city,
            country,
          })
        });
      }
    } catch (logError) {
      console.error('Failed to log city visit:', logError);
      // Don't throw here, as the trip was still created successfully
    }

    return trip;
  },

  async getUserTrips(): Promise<Trip[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Simple query - just get user's own trips
    const { data: trips, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch trips: ${error.message}`);
    }

    return trips || [];
  },

  async deleteTrip(tripId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Delete trip (only if user owns it)
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to delete trip: ${error.message}`);
    }
  }
};