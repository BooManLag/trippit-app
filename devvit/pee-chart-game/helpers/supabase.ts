import type { FetchRequestInit } from '@devvit/public-api'

const QUERY = 'https://<PROJECT>.supabase.co/rest/v1/city_visits?select=city,country,trip_count'
const KEY = 'YOUR_SERVICE_ROLE_KEY'

export const fetchCityCounts = async (ctx): Promise<Array<{city:string,country:string,trip_count:number}>> => {
  const r = await ctx.http.request({
    url: QUERY,
    method: 'GET',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
  } as FetchRequestInit)
  return (await r.json()) as any
}
