import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  try {
    const { city, country } = await req.json()
    if (!city || !country) {
      return new Response('city & country required', { status: 400 })
    }

    const { data, error } = await supabase.rpc('increment_city_visit', { p_city: city, p_country: country })
    if (error) throw error
    return new Response(JSON.stringify(data), { status: 200 })
  } catch (e) {
    return new Response(String(e), { status: 500 })
  }
})
