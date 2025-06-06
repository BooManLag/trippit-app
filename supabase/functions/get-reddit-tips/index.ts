import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  permalink: string;
  url: string;
  author: string;
  score: number;
  num_comments: number;
  created_utc: number;
  subreddit: string;
}

interface SubredditInfo {
  display_name: string;
  title: string;
  subscribers: number;
  public_description: string;
  url: string;
}

async function fetchSubredditInfo(subredditName: string): Promise<SubredditInfo | null> {
  try {
    const path = `https://www.reddit.com/r/${encodeURIComponent(
      subredditName.toLowerCase()
    )}/about.json`;

    const res = await fetch(path, {
      headers: {
        'User-Agent': 'Trippit/1.0 (Travel Tips Aggregator)'
      }
    });

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    return json.data as SubredditInfo;
  } catch (error) {
    console.error(`Error fetching subreddit info for ${subredditName}:`, error);
    return null;
  }
}

async function fetchTopPosts(
  subredditName: string,
  searchQuery: string = '',
  limit: number = 10
): Promise<RedditPost[]> {
  try {
    let path: string;
    
    if (searchQuery) {
      // Search within the subreddit
      path = `https://www.reddit.com/r/${encodeURIComponent(
        subredditName.toLowerCase()
      )}/search.json?q=${encodeURIComponent(searchQuery)}&restrict_sr=on&limit=${limit}&sort=top&t=year`;
    } else {
      // Get top posts from the subreddit
      path = `https://www.reddit.com/r/${encodeURIComponent(
        subredditName.toLowerCase()
      )}/top.json?limit=${limit}&t=month`;
    }

    const res = await fetch(path, {
      headers: {
        'User-Agent': 'Trippit/1.0 (Travel Tips Aggregator)'
      }
    });

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    return (json.data.children as any[])
      .map((child) => ({
        ...child.data,
        subreddit: subredditName
      }) as RedditPost)
      .filter(post => 
        !post.title.toLowerCase().includes('[nsfw]') && 
        post.selftext && 
        post.selftext.length > 50
      );
  } catch (error) {
    console.error(`Error fetching posts from ${subredditName}:`, error);
    return [];
  }
}

function generateSearchTerms(city: string, country: string): string[] {
  return [
    `${city} tips`,
    `${city} travel`,
    `${city} guide`,
    `${city} advice`,
    `visiting ${city}`,
    `${country} travel tips`,
    `${country} guide`,
    'travel tips',
    'travel advice'
  ];
}

function generateSubreddits(city: string, country: string): string[] {
  const baseSubreddits = [
    'travel',
    'solotravel',
    'backpacking',
    'TravelHacks',
    'digitalnomad',
    'TravelTips',
    'Shoestring'
  ];

  // Add location-specific subreddits
  const locationSubreddits = [
    city.toLowerCase().replace(/\s+/g, ''),
    country.toLowerCase().replace(/\s+/g, ''),
    `${city.toLowerCase().replace(/\s+/g, '')}travel`,
    `${country.toLowerCase().replace(/\s+/g, '')}travel`
  ];

  return [...baseSubreddits, ...locationSubreddits];
}

function extractTipsFromPost(post: RedditPost): any[] {
  const tips = [];
  
  // Extract tips from title and content
  const content = `${post.title}\n\n${post.selftext}`;
  
  // Look for numbered lists, bullet points, or tip patterns
  const tipPatterns = [
    /(?:^|\n)\s*[\d]+[\.\)]\s*(.+?)(?=\n|$)/gm,
    /(?:^|\n)\s*[-\*•]\s*(.+?)(?=\n|$)/gm,
    /(?:tip|advice|recommendation):\s*(.+?)(?=\n|$)/gim
  ];

  tipPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const tipText = match[1].trim();
      if (tipText.length > 20 && tipText.length < 200) {
        tips.push({
          id: `${post.id}_${tips.length}`,
          category: 'General',
          title: post.title.substring(0, 100),
          content: tipText,
          source: `r/${post.subreddit}`,
          reddit_url: `https://reddit.com${post.permalink}`,
          score: post.score,
          created_at: new Date(post.created_utc * 1000).toISOString()
        });
      }
    }
  });

  // If no specific tips found, use the whole post if it's informative
  if (tips.length === 0 && post.selftext.length > 100 && post.selftext.length < 1000) {
    tips.push({
      id: post.id,
      category: 'General',
      title: post.title,
      content: post.selftext.substring(0, 500) + (post.selftext.length > 500 ? '...' : ''),
      source: `r/${post.subreddit}`,
      reddit_url: `https://reddit.com${post.permalink}`,
      score: post.score,
      created_at: new Date(post.created_utc * 1000).toISOString()
    });
  }

  return tips;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { city, country } = await req.json();
    
    if (!city || !country) {
      return new Response(
        JSON.stringify({ error: 'City and country are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Fetching tips for ${city}, ${country}`);

    const subreddits = generateSubreddits(city, country);
    const searchTerms = generateSearchTerms(city, country);
    const allTips = [];

    // Fetch from multiple subreddits
    for (const subreddit of subreddits.slice(0, 8)) { // Limit to prevent timeout
      console.log(`Checking subreddit: r/${subreddit}`);
      
      // Check if subreddit exists
      const subredditInfo = await fetchSubredditInfo(subreddit);
      if (!subredditInfo) {
        continue;
      }

      // Try different search approaches
      for (const searchTerm of searchTerms.slice(0, 3)) { // Limit search terms
        const posts = await fetchTopPosts(subreddit, searchTerm, 5);
        
        for (const post of posts) {
          const tips = extractTipsFromPost(post);
          allTips.push(...tips);
        }

        // Add small delay to be respectful to Reddit's servers
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Also get general top posts from travel-related subreddits
      if (['travel', 'solotravel', 'backpacking'].includes(subreddit)) {
        const generalPosts = await fetchTopPosts(subreddit, '', 3);
        for (const post of generalPosts) {
          const tips = extractTipsFromPost(post);
          allTips.push(...tips);
        }
      }
    }

    // Remove duplicates and sort by score
    const uniqueTips = allTips
      .filter((tip, index, self) => 
        index === self.findIndex(t => t.content === tip.content)
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // Return top 20 tips

    console.log(`Found ${uniqueTips.length} unique tips`);

    return new Response(
      JSON.stringify(uniqueTips),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('Error in get-reddit-tips function:', error);
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