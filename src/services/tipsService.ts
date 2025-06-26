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
      
      // Attempt to fetch from edge function
      const response = await fetch(`${supabaseUrl}/functions/v1/get-reddit-tips`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ city, country }),
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        console.error(`Error fetching tips: ${response.status} ${response.statusText}`);
        return this.getFallbackTips(city, country);
      }
      
      const tips = await response.json();
      
      if (!Array.isArray(tips) || tips.length === 0) {
        console.warn('No tips returned from edge function');
        return this.getFallbackTips(city, country);
      }
      
      return tips;
    } catch (error) {
      console.error('Error fetching tips:', error);
      return this.getFallbackTips(city, country);
    }
  },
  
  getFallbackTips(city: string, country: string): RedditTip[] {
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
      }
    ];
  }
};