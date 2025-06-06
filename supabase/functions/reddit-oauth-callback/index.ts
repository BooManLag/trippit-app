const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory session store (in production, use a database)
const sessions = new Map<string, {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  username: string;
}>();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();
    
    if (!code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization code' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Reddit app credentials (set these in your Supabase environment variables)
    const clientId = Deno.env.get('REDDIT_CLIENT_ID');
    const clientSecret = Deno.env.get('REDDIT_CLIENT_SECRET');
    const redirectUri = Deno.env.get('REDDIT_REDIRECT_URI') || 'http://localhost:5173/auth/reddit/callback';

    if (!clientId || !clientSecret) {
      console.error('Missing Reddit OAuth credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🔄 Exchanging code for Reddit access token...');

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'web:Trippit:v1.0 (by /u/BooManLaggg)',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Reddit token exchange failed:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to exchange code for token' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Successfully got Reddit access token');

    // Get user info to create a session
    const userResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'User-Agent': 'web:Trippit:v1.0 (by /u/BooManLaggg)',
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to get Reddit user info');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to get user info' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const userData = await userResponse.json();
    console.log(`✅ Reddit user authenticated: ${userData.name}`);

    // Create a session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = Date.now() + (tokenData.expires_in * 1000);

    // Store session
    sessions.set(sessionToken, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: expiresAt,
      username: userData.name,
    });

    console.log(`💾 Created session for user: ${userData.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        sessionToken: sessionToken,
        username: userData.name,
        expiresAt: expiresAt,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Reddit OAuth callback error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Export sessions for use in other functions
export { sessions };