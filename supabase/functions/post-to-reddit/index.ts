import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Reddit API credentials from environment variables
const REDDIT_USERNAME = Deno.env.get('REDDIT_USERNAME');
const REDDIT_PASSWORD = Deno.env.get('REDDIT_PASSWORD');
const REDDIT_CLIENT_ID = Deno.env.get('REDDIT_CLIENT_ID');
const REDDIT_CLIENT_SECRET = Deno.env.get('REDDIT_CLIENT_SECRET');
const SUBREDDIT = 'trippitMemories'; // The target subreddit

// Validate environment variables and initialize Supabase client
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || (() => { 
  throw new Error('SUPABASE_URL environment variable is not set'); 
})();

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || (() => { 
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set'); 
})();

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getRedditAccessToken(): Promise<string | null> {
  try {
    // Check if we have all required credentials
    if (!REDDIT_USERNAME || !REDDIT_PASSWORD || !REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
      console.error('❌ Missing Reddit credentials in environment variables');
      return null;
    }
    
    // Get token from database first
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .select('access_token, expires_at')
      .eq('service', 'reddit')
      .single();
    
    // If token exists and is still valid, use it
    if (!tokenError && tokenData) {
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      
      if (expiresAt > now) {
        console.log('✅ Using existing Reddit token');
        return tokenData.access_token;
      }
    }
    
    // Otherwise, get a new token
    console.log('🔑 Getting new Reddit token with password grant...');
    
    const auth = btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`);
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('username', REDDIT_USERNAME);
    params.append('password', REDDIT_PASSWORD);
    params.append('scope', 'submit');

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

    const data = await response.json();
    
    if (data.error) {
      console.error(`❌ Reddit API error: ${data.error} - ${data.error_description}`);
      return null;
    }

    if (!data.access_token) {
      console.error('❌ No access_token in response');
      return null;
    }

    // Store the token
    const expiresAt = new Date(Date.now() + (data.expires_in * 1000));
    
    await supabase
      .from('tokens')
      .upsert({
        service: 'reddit',
        access_token: data.access_token,
        refresh_token: null, // Password grant doesn't provide refresh tokens
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      });

    console.log(`✅ New Reddit token obtained and stored`);
    return data.access_token;
  } catch (error) {
    console.error('💥 Error getting Reddit token:', error);
    return null;
  }
}

async function postToReddit(
  accessToken: string, 
  title: string, 
  text: string, 
  subreddit: string = SUBREDDIT
): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  try {
    console.log(`📝 Posting to r/${subreddit} with title: ${title}`);
    
    const formData = new FormData();
    formData.append('api_type', 'json');
    formData.append('kind', 'self');
    formData.append('sr', subreddit);
    formData.append('title', title);
    formData.append('text', text);
    
    const response = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'web:Trippit:v1.0 (by /u/BooManLagg)',
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Reddit post failed: ${response.status} - ${errorText}`);
      return { 
        success: false, 
        error: `Reddit API error: ${response.status} ${response.statusText}` 
      };
    }
    
    const data = await response.json();
    
    if (data.json?.errors && data.json.errors.length > 0) {
      console.error('❌ Reddit API returned errors:', data.json.errors);
      return { 
        success: false, 
        error: `Reddit API error: ${data.json.errors[0][0]}` 
      };
    }
    
    // Extract post URL from response
    const postUrl = data.json?.data?.url;
    if (!postUrl) {
      console.error('❌ No post URL in response:', data);
      return { 
        success: true, 
        postUrl: `https://www.reddit.com/r/${subreddit}/` 
      };
    }
    
    console.log(`✅ Successfully posted to Reddit: ${postUrl}`);
    return { 
      success: true, 
      postUrl: postUrl.startsWith('http') ? postUrl : `https://www.reddit.com${postUrl}` 
    };
  } catch (error) {
    console.error('💥 Error posting to Reddit:', error);
    return { 
      success: false, 
      error: `Error posting to Reddit: ${error.message}` 
    };
  }
}

function formatItineraryForReddit(itinerary: any): string {
  try {
    let markdown = `# ${itinerary.destination} Travel Itinerary\n\n`;
    markdown += `**Trip Duration:** ${itinerary.totalDays} days (${itinerary.startDate} to ${itinerary.endDate})\n\n`;
    markdown += `**Budget:** ${itinerary.estimatedBudget}\n\n`;
    
    // Add days
    itinerary.days.forEach((day: any) => {
      markdown += `## Day ${day.day} - ${new Date(day.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}\n\n`;
      
      day.activities.forEach((activity: any) => {
        markdown += `### ${activity.time} - ${activity.name}\n`;
        markdown += `**Location:** ${activity.location}\n`;
        markdown += `**Duration:** ${activity.duration}\n`;
        markdown += `**Cost:** ${activity.estimatedCost}\n\n`;
        markdown += `${activity.description}\n\n`;
        
        if (activity.tips) {
          markdown += `> **Tip:** ${activity.tips}\n\n`;
        }
      });
    });
    
    // Add travel tips
    if (itinerary.travelTips && itinerary.travelTips.length > 0) {
      markdown += `## Travel Tips\n\n`;
      itinerary.travelTips.forEach((tip: string) => {
        markdown += `* ${tip}\n`;
      });
      markdown += '\n';
    }
    
    // Add footer
    markdown += `---\n\n`;
    markdown += `*This itinerary was created with [Trippit](https://trippit.me) - a travel planning app for adventurers.*\n\n`;
    markdown += `*Join us at [r/trippitMemories](https://www.reddit.com/r/trippitMemories/) to share your travel experiences!*`;
    
    return markdown;
  } catch (error) {
    console.error('Error formatting itinerary:', error);
    return `# ${itinerary.destination} Travel Itinerary\n\nError formatting full itinerary. Please check the app for details.`;
  }
}

Deno.serve(async (req) => {
  console.log('🔥 INCOMING REQUEST to /post-to-reddit');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { itinerary, title } = body;
    
    if (!itinerary) {
      return new Response(
        JSON.stringify({ error: 'Itinerary is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Get Reddit access token
    const accessToken = await getRedditAccessToken();
    if (!accessToken) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to authenticate with Reddit',
          details: 'Could not obtain access token. Please check Reddit API credentials.'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Format the itinerary for Reddit
    const formattedTitle = title || `${itinerary.destination} Travel Itinerary - ${itinerary.totalDays} days`;
    const formattedText = formatItineraryForReddit(itinerary);
    
    // Post to Reddit
    const result = await postToReddit(accessToken, formattedTitle, formattedText);
    
    if (!result.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to post to Reddit',
          details: result.error
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        postUrl: result.postUrl,
        message: 'Successfully posted to Reddit!'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 Error in post-to-reddit function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to post to Reddit',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});