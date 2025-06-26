import { supabase } from '../lib/supabase';

export interface RedditTip {
  id: string;
  category: string;
  title: string;
  content: string;
  source: string;
  reddit_url: string;
  score: number;
  created_at: string;
  relevance_score?: number;
}

export const tipsService = {
  async getTipsForDestination(city: string, country: string): Promise<RedditTip[]> {
    try {
      console.log(`Fetching tips for ${city}, ${country}`);
      
      // Check if Supabase URL and key are available
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing Supabase environment variables');
        return this.getFallbackTips(city, country);
      }
      
      // Attempt to fetch from edge function with longer timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
        
        const response = await fetch(`${supabaseUrl}/functions/v1/get-reddit-tips`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ city, country }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read error response');
          console.error(`Error fetching tips: ${response.status} ${response.statusText}`, errorText);
          throw new Error(`API error: ${response.status}`);
        }
        
        let tips = await response.json();
        
        // Handle non-array responses gracefully
        if (!Array.isArray(tips)) {
          console.warn('Response is not an array:', tips);
          tips = []; // Convert to empty array instead of throwing error
        }
        
        console.log(`Successfully fetched ${tips.length} tips from Reddit`);
        return tips;
      } catch (fetchError: any) {
        console.error('Edge function error:', fetchError);
        
        // Check if we need to refresh the Reddit token
        if (fetchError.message?.includes('401') || fetchError.message?.includes('403')) {
          console.log('Attempting to refresh Reddit token...');
          
          try {
            // Call the refresh token endpoint
            const refreshResponse = await fetch(`${supabaseUrl}/functions/v1/refresh-reddit-token`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json',
              }
            });
            
            if (refreshResponse.ok) {
              console.log('Token refreshed successfully, retrying tips fetch...');
              
              // Try the original request again
              const retryResponse = await fetch(`${supabaseUrl}/functions/v1/get-reddit-tips`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseAnonKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ city, country }),
              });
              
              if (retryResponse.ok) {
                let retryTips = await retryResponse.json();
                // Handle non-array responses gracefully in retry as well
                if (!Array.isArray(retryTips)) {
                  console.warn('Retry response is not an array:', retryTips);
                  retryTips = []; // Convert to empty array
                }
                console.log(`Successfully fetched ${retryTips.length} tips after token refresh`);
                return retryTips;
              }
            }
          } catch (refreshError) {
            console.error('Error refreshing token:', refreshError);
          }
        }
        
        // If we get here, all attempts failed
        throw new Error(fetchError.message || 'Failed to fetch tips');
      }
    } catch (error: any) {
      console.error('Error in getTipsForDestination:', error);
      return this.getFallbackTips(city, country);
    }
  },
  
  getFallbackTips(city: string, country: string): RedditTip[] {
    console.log(`Using fallback tips for ${city}, ${country}`);
    // Generate some fallback tips when the edge function fails
    return [
      {
        id: `fallback_${city}_1`,
        category: 'Safety',
        title: `Stay safe in ${city}`,
        content: `Research common scams in ${city} before your trip. Keep your valuables secure and be aware of your surroundings, especially in crowded tourist areas.`,
        source: 'Trippit',
        reddit_url: '#',
        score: 15,
        created_at: new Date().toISOString()
      },
      {
        id: `fallback_${city}_2`,
        category: 'Transport',
        title: `Getting around ${city}`,
        content: `Public transportation in ${city} is generally reliable and affordable. Consider getting a transit pass for the duration of your stay to save money.`,
        source: 'Trippit',
        reddit_url: '#',
        score: 12,
        created_at: new Date().toISOString()
      },
      {
        id: `fallback_${city}_3`,
        category: 'Food',
        title: `Must-try foods in ${city}`,
        content: `Don't leave ${city} without trying the local cuisine. Ask locals for restaurant recommendations to avoid tourist traps and discover authentic flavors.`,
        source: 'Trippit',
        reddit_url: '#',
        score: 18,
        created_at: new Date().toISOString()
      },
      {
        id: `fallback_${city}_4`,
        category: 'Culture',
        title: `Cultural etiquette in ${country}`,
        content: `Learn a few basic phrases in the local language and familiarize yourself with cultural customs in ${country}. This small effort will be greatly appreciated by locals.`,
        source: 'Trippit',
        reddit_url: '#',
        score: 14,
        created_at: new Date().toISOString()
      },
      {
        id: `fallback_${city}_5`,
        category: 'Budget',
        title: `Save money in ${city}`,
        content: `Many attractions in ${city} offer discounted tickets if you book online in advance. Also look for free museum days and city passes that include multiple attractions.`,
        source: 'Trippit',
        reddit_url: '#',
        score: 10,
        created_at: new Date().toISOString()
      },
      {
        id: `fallback_${city}_6`,
        category: 'Weather',
        title: `Weather in ${city}`,
        content: `${city} weather can be unpredictable, so pack layers and check the forecast before heading out each day. Always have a light rain jacket or umbrella handy.`,
        source: 'Trippit',
        reddit_url: '#',
        score: 9,
        created_at: new Date().toISOString()
      },
      {
        id: `fallback_${city}_7`,
        category: 'Things to Do',
        title: `Hidden gems in ${city}`,
        content: `While the main attractions in ${city} are worth visiting, don't miss the lesser-known spots. Explore local neighborhoods and parks for a more authentic experience.`,
        source: 'Trippit',
        reddit_url: '#',
        score: 16,
        created_at: new Date().toISOString()
      },
      {
        id: `fallback_${city}_8`,
        category: 'Accommodation',
        title: `Where to stay in ${city}`,
        content: `For the best experience in ${city}, stay in a central neighborhood with good public transport connections. This will save you time and money on commuting.`,
        source: 'Trippit',
        reddit_url: '#',
        score: 11,
        created_at: new Date().toISOString()
      }
    ];
  }
};