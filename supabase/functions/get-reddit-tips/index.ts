import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { city, country } = await req.json();
    
    // Construct search terms
    const searchTerms = [
      `${city} ${country} tips`,
      `${city} travel`,
      `${country} travel tips`,
      'travel tips'
    ];

    // Subreddits to search
    const subreddits = [
      'travel',
      'solotravel',
      'backpacking',
      'TravelHacks',
      `${country.toLowerCase()}`,
      `${city.toLowerCase()}`
    ];

    const redditPosts = [];
    
    // Fetch posts from Reddit
    for (const subreddit of subreddits) {
      try {
        const response = await fetch(
          `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(city)}&restrict_sr=on&limit=5`,
          {
            headers: {
              'User-Agent': 'Trippit/1.0'
            }
          }
        );

        if (!response.ok) continue;

        const data = await response.json();
        const posts = data.data.children
          .filter(post => !post.data.over_18) // Filter out NSFW content
          .map(post => ({
            id: post.data.id,
            title: post.data.title,
            content: post.data.selftext,
            url: `https://reddit.com${post.data.permalink}`,
            subreddit: post.data.subreddit_name_prefixed,
            score: post.data.score,
            created: post.data.created_utc
          }));

        redditPosts.push(...posts);
      } catch (error) {
        console.error(`Error fetching from r/${subreddit}:`, error);
      }
    }

    // Sort by score and take top 10
    const topPosts = redditPosts
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return new Response(
      JSON.stringify(topPosts),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});