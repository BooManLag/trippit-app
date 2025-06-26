import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RedditTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

// Reddit API credentials from environment variables
const REDDIT_USERNAME = Deno.env.get('REDDIT_USERNAME');
const REDDIT_PASSWORD = Deno.env.get('REDDIT_PASSWORD');
const REDDIT_CLIENT_ID = Deno.env.get('REDDIT_CLIENT_ID');
const REDDIT_CLIENT_SECRET = Deno.env.get('REDDIT_CLIENT_SECRET');

// Validate environment variables and initialize Supabase client
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || (() => { 
  throw new Error('SUPABASE_URL environment variable is not set'); 
})();

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || (() => { 
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set'); 
})();

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function validateRedditCredentials(): { valid: boolean; missing: string[] } {
  const missing = [];
  
  if (!REDDIT_USERNAME) missing.push('REDDIT_USERNAME');
  if (!REDDIT_PASSWORD) missing.push('REDDIT_PASSWORD');
  if (!REDDIT_CLIENT_ID) missing.push('REDDIT_CLIENT_ID');
  if (!REDDIT_CLIENT_SECRET) missing.push('REDDIT_CLIENT_SECRET');
  
  return {
    valid: missing.length === 0,
    missing
  };
}

async function getStoredToken(): Promise<{ access_token: string; expires_at: string } | null> {
  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('access_token, expires_at')
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

async function storeToken(accessToken: string, expiresIn: number): Promise<boolean> {
  try {
    // Validate that we have an access token
    if (!accessToken || typeof accessToken !== 'string' || accessToken.trim() === '') {
      console.error('❌ Cannot store invalid access token:', { accessToken: !!accessToken, type: typeof accessToken });
      return false;
    }

    // Validate expires_in and provide fallback
    let validExpiresIn = expiresIn;
    if (!validExpiresIn || typeof validExpiresIn !== 'number' || validExpiresIn <= 0) {
      console.warn('⚠️ Invalid expires_in value, using default 1 hour');
      validExpiresIn = 3600; // Default to 1 hour
    }
    
    // Calculate expiration time with validation
    const expirationTime = Date.now() + (validExpiresIn * 1000);
    const expiresAt = new Date(expirationTime);
    
    // Validate the date before converting to ISO string
    if (isNaN(expiresAt.getTime())) {
      console.error('❌ Invalid expiration date calculated');
      return false;
    }
    
    const expiresAtISO = expiresAt.toISOString();
    console.log(`📅 Token will expire at: ${expiresAtISO}`);
    
    // First, check if a token already exists
    const { data: existingToken } = await supabase
      .from('tokens')
      .select('id')
      .eq('service', 'reddit')
      .single();
      
    let result;
    
    if (existingToken) {
      // Update existing token
      console.log('🔄 Updating existing token record');
      result = await supabase
        .from('tokens')
        .update({
          access_token: accessToken,
          refresh_token: null, // Password grant doesn't provide refresh tokens
          expires_at: expiresAtISO,
          updated_at: new Date().toISOString()
        })
        .eq('service', 'reddit');
    } else {
      // Insert new token
      console.log('🆕 Creating new token record');
      result = await supabase
        .from('tokens')
        .insert({
          service: 'reddit',
          access_token: accessToken,
          refresh_token: null, // Password grant doesn't provide refresh tokens
          expires_at: expiresAtISO,
          updated_at: new Date().toISOString()
        });
    }

    if (result.error) {
      console.error('❌ Error storing token:', result.error);
      return false;
    }

    console.log(`✅ Token stored successfully, expires at: ${expiresAtISO}`);
    return true;
  } catch (error) {
    console.error('💥 Error in storeToken:', error);
    return false;
  }
}

async function getNewTokenWithPassword(): Promise<RedditTokenResponse | null> {
  try {
    console.log('🔑 Getting new Reddit token with password grant...');
    
    // Validate credentials first
    const credentialCheck = validateRedditCredentials();
    if (!credentialCheck.valid) {
      console.error('❌ Missing Reddit credentials:', credentialCheck.missing);
      return {
        error: 'missing_credentials',
        error_description: `Missing required environment variables: ${credentialCheck.missing.join(', ')}`
      };
    }
    
    const auth = btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`);
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('username', REDDIT_USERNAME!);
    params.append('password', REDDIT_PASSWORD!);
    params.append('scope', 'read submit');

    console.log('📡 Making password grant request to Reddit API...');
    console.log('🔍 Request details:', {
      username: REDDIT_USERNAME,
      clientId: REDDIT_CLIENT_ID?.substring(0, 8) + '...',
      scope: 'read submit'
    });

    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'web:Trippit:v1.0 (by /u/BooManLagg)',
      },
      body: params.toString(),
    });

    console.log(`📡 Password grant response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Password grant failed: ${response.status} - ${errorText}`);
      
      // Parse common Reddit API errors
      let errorType = 'unknown_error';
      let errorDescription = `HTTP ${response.status}: ${errorText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorType = errorData.error;
          errorDescription = errorData.error_description || errorData.message || errorDescription;
        }
      } catch (e) {
        // Keep default error description if JSON parsing fails
      }
      
      return {
        error: errorType,
        error_description: errorDescription
      };
    }

    const data: RedditTokenResponse = await response.json();
    console.log(`📋 Password grant response data:`, {
      hasAccessToken: !!data.access_token,
      accessTokenLength: data.access_token?.length,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
      error: data.error,
      errorDescription: data.error_description
    });

    // Check for API errors
    if (data.error) {
      console.error(`❌ Reddit API error during password grant: ${data.error} - ${data.error_description}`);
      return data;
    }

    // Validate that we got an access token
    if (!data.access_token) {
      console.error('❌ No access_token in password grant response');
      return {
        error: 'no_access_token',
        error_description: 'Reddit API did not return an access token'
      };
    }

    console.log(`✅ Successfully obtained new token with password grant`);
    return data;
  } catch (error) {
    console.error('💥 Error getting new token:', error);
    return {
      error: 'network_error',
      error_description: `Network error: ${error.message}`
    };
  }
}

async function ensureValidToken(): Promise<{ token: string | null; error?: string; details?: string }> {
  try {
    // First, check if we have a stored token
    const storedToken = await getStoredToken();
    
    if (storedToken) {
      const now = new Date();
      const expiresAt = new Date(storedToken.expires_at);
      
      // If token is still valid (with 5 minute buffer), use it
      if (expiresAt.getTime() > now.getTime() + (5 * 60 * 1000)) {
        console.log('✅ Using valid stored token');
        return { token: storedToken.access_token };
      }
    }
    
    // No valid token or token expired, get new token with password
    console.log('🆕 Getting new token with password grant...');
    const newToken = await getNewTokenWithPassword();
    
    if (!newToken) {
      return {
        token: null,
        error: 'Failed to get new token',
        details: 'Reddit API request failed'
      };
    }
    
    if (newToken.error) {
      return {
        token: null,
        error: newToken.error,
        details: newToken.error_description
      };
    }
    
    if (newToken.access_token) {
      const stored = await storeToken(
        newToken.access_token,
        newToken.expires_in || 3600
      );
      
      if (stored) {
        return { token: newToken.access_token };
      } else {
        // Return token even if storage failed
        return { 
          token: newToken.access_token,
          error: 'storage_failed',
          details: 'Token obtained but failed to store in database'
        };
      }
    }
    
    return {
      token: null,
      error: 'invalid_response',
      details: 'Reddit API response was invalid'
    };
  } catch (error) {
    console.error('💥 Error ensuring valid token:', error);
    return {
      token: null,
      error: 'critical_error',
      details: error.message
    };
  }
}

Deno.serve(async (req) => {
  console.log('🔄 REDDIT TOKEN REFRESH REQUEST');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // First, validate that we have the required credentials
    const credentialCheck = validateRedditCredentials();
    if (!credentialCheck.valid) {
      console.error('❌ Missing Reddit API credentials:', credentialCheck.missing);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing Reddit API credentials',
          details: `Please set the following Supabase secrets: ${credentialCheck.missing.join(', ')}`,
          setup_instructions: {
            message: 'To fix this error, you need to set Reddit API credentials as Supabase secrets',
            steps: [
              '1. Go to your Supabase project dashboard',
              '2. Navigate to Settings > Edge Functions',
              '3. Add the following secrets:',
              '   - REDDIT_USERNAME: Your Reddit username',
              '   - REDDIT_PASSWORD: Your Reddit password',
              '   - REDDIT_CLIENT_ID: Your Reddit app client ID',
              '   - REDDIT_CLIENT_SECRET: Your Reddit app client secret',
              '4. Make sure your Reddit account does NOT have 2FA enabled',
              '5. Create a Reddit app at https://www.reddit.com/prefs/apps/ (type: script)'
            ]
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const result = await ensureValidToken();
    
    if (!result.token) {
      console.error('❌ Failed to obtain valid token:', result.error, result.details);
      
      // Provide specific error messages based on the error type
      let userMessage = 'Failed to obtain valid Reddit access token';
      let statusCode = 500;
      
      if (result.error === 'missing_credentials') {
        userMessage = 'Reddit API credentials are not configured';
        statusCode = 400;
      } else if (result.error === 'invalid_grant') {
        userMessage = 'Reddit credentials are invalid. Please check username/password and ensure 2FA is disabled.';
        statusCode = 401;
      } else if (result.error === 'unauthorized_client') {
        userMessage = 'Reddit app credentials are invalid. Please check client ID and secret.';
        statusCode = 401;
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: userMessage,
          error_type: result.error,
          details: result.details,
          troubleshooting: {
            common_issues: [
              'Reddit account has 2FA enabled (not supported)',
              'Incorrect username or password',
              'Invalid Reddit app credentials',
              'Reddit account is suspended or banned',
              'Reddit app is not configured as "script" type'
            ],
            next_steps: [
              'Verify Reddit credentials in Supabase secrets',
              'Ensure Reddit account has 2FA disabled',
              'Check Reddit app configuration at https://www.reddit.com/prefs/apps/',
              'Try creating a new Reddit app if issues persist'
            ]
          }
        }),
        {
          status: statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🎉 Reddit token management completed successfully!');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Reddit token is valid and ready',
        token_preview: `${result.token.substring(0, 20)}...`,
        timestamp: new Date().toISOString(),
        warning: result.error ? `Warning: ${result.error} - ${result.details}` : undefined
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
        details: error.message,
        help: 'This is likely a configuration issue. Please check your Reddit API credentials in Supabase secrets.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});