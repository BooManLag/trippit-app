import type { FetchRequestInit } from '@devvit/public-api'

// Replace these with your actual Supabase project URL and key
const SUPABASE_URL = 'https://your-project-id.supabase.co'
const SUPABASE_KEY = 'your-anon-key-here'

export const fetchCityCounts = async (ctx): Promise<Array<{city:string,country:string,trip_count:number}>> => {
  try {
    const r = await ctx.http.request({
      url: `${SUPABASE_URL}/rest/v1/city_visits?select=city,country,trip_count&order=trip_count.desc`,
      method: 'GET',
      headers: { 
        apikey: SUPABASE_KEY, 
        Authorization: `Bearer ${SUPABASE_KEY}` 
      }
    } as FetchRequestInit)
    
    if (!r.ok) {
      console.error(`Failed to fetch city counts: ${r.status} ${r.statusText}`)
      return []
    }
    
    return await r.json()
  } catch (error) {
    console.error('Error fetching city counts:', error)
    return []
  }
}