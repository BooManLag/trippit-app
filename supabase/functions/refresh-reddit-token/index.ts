import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RedditTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
}

// Reddit API credentials
const REDDIT_USERNAME = 'BooManLagg';
const REDDIT_PASSWORD = 'Joshua152foe!';
const REDDIT_CLIENT_ID = 'VqkcjSqTaWGym_Y1UNGt5A';
const REDDIT_CLIENT_SECRET = 'mfmgrvATE39u-S5B-oGWvvFGyNxtEA';

// Initialize Supabase client with service role key
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function getStoredToken(): Promise<{ access_token: string; refresh_token?: string; expires_at: string } | null> {
  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('service', 'reddit')
      .single();

    if (error) {
      console.log('📭 No stored Reddit token found');
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Error fetching stored token:', error);
    return null;
  }
}

async function storeToken(accessToken: string, refreshToken: string | null, expiresIn: number): Promise<boolean> {
  try {
    const expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();
    
    const { error } = await supabase
      .from('tokens')
      .upsert({
        service: 'reddit',
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('❌ Error storing token:', error);
      return false;
    }

    console.log(`✅ Token stored successfully, expires at: ${expiresAt}`);
    return true;
  } catch (error) {
    console.error('💥 Error in storeToken:', error);
    return false;
  }
}

async function refreshWithRefreshToken(refreshToken: string): Promise<RedditTokenResponse | null> {
  try {
    console.log('🔄 Using refresh token to get new access token...');
    
    const auth = btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`);
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);

    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'web:Trippit:v1.0 (by /u/BooManLagg)',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Refresh token request failed: ${response.status} - ${errorText}`);
      return null;
    }

    const data: RedditTokenResponse = await response.json();
    console.log(`✅ Successfully refreshed token using refresh_token`);
    return data;
  } catch (error) {
    console.error('💥 Error refreshing with refresh token:', error);
    return null;
  }
}

async function getNewTokenWithPassword(): Promise<RedditTokenResponse | null> {
  try {
    console.log('🔑 Getting new Reddit token with password grant...');
    
    const auth = btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`);
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('username', REDDIT_USERNAME);
    params.append('password', REDDIT_PASSWORD);
    params.append('scope', 'read');
    params.append('duration', 'permanent');

    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'web:Trippit:v1.0 (by /u/BooManLagg)',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Password grant failed: ${response.status} - ${errorText}`);
      return null;
    }

    const data: RedditTokenResponse = await response.json();
    console.log(`✅ Successfully obtained new token with password grant`);
    return data;
  } catch (error) {
    console.error('💥 Error getting new token:', error);
    return null;
  }
}

async function ensureValidToken(): Promise<string | null> {
  try {
    // First, check if we have a stored token
    const storedToken = await getStoredToken();
    
    if (storedToken) {
      const now = new Date();
      const expiresAt = new Date(storedToken.expires_at);
      
      // If token is still valid (with 5 minute buffer), use it
      if (expiresAt.getTime() > now.getTime() + (5 * 60 * 1000)) {
        console.log('✅ Using valid stored token');
        return storedToken.access_token;
      }
      
      // Token is expired or about to expire, try to refresh
      if (storedToken.refresh_token) {
        console.log('🔄 Token expired, attempting refresh...');
        const refreshedToken = await refreshWithRefreshToken(storedToken.refresh_token);
        
        if (refreshedToken) {
          const stored = await storeToken(
            refreshedToken.access_token,
            refreshedToken.refresh_token || storedToken.refresh_token,
            refreshedToken.expires_in
          );
          
          if (stored) {
            return refreshedToken.access_token;
          }
        }
      }
    }
    
    // No valid token or refresh failed, get new token with password
    console.log('🆕 Getting new token with password grant...');
    const newToken = await getNewTokenWithPassword();
    
    if (newToken) {
      const stored = await storeToken(
        newToken.access_token,
        newToken.refresh_token || null,
        newToken.expires_in
      );
      
      if (stored) {
        return newToken.access_token;
      }
    }
    
    return null;
  } catch (error) {
    console.error('💥 Error ensuring valid token:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  console.log('🔄 REDDIT TOKEN REFRESH REQUEST');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const validToken = await ensureValidToken();
    
    if (!validToken) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to obtain valid Reddit access token' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🎉 Reddit token management completed successfully!');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Reddit token is valid and ready',
        token_preview: `${validToken.substring(0, 20)}...`,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 Critical error in Reddit token management:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Critical error during token management',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});