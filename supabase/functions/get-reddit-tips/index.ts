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
      console.log(`Failed to fetch from ${path}: ${res.status}`);
      return [];
    }

    const json = await res.json();
    
    if (!json.data || !json.data.children) {
      console.log(`No data found for ${subredditName}`);
      return [];
    }

    return (json.data.children as any[])
      .map((child) => ({
        ...child.data,
        subreddit: subredditName
      }) as RedditPost)
      .filter(post => 
        post.selftext && 
        post.selftext.length > 50 &&
        !post.title.toLowerCase().includes('[nsfw]') &&
        !post.title.toLowerCase().includes('nsfw')
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
    `visiting ${city}`,
    `${country} travel tips`,
    `${country} guide`
  ];
}

function generateSubreddits(city: string, country: string): string[] {
  const baseSubreddits = [
    'travel',
    'solotravel',
    'backpacking',
    'TravelHacks',
    'digitalnomad'
  ];

  // Add location-specific subreddits (clean names)
  const cityClean = city.toLowerCase().replace(/[^a-z]/g, '');
  const countryClean = country.toLowerCase().replace(/[^a-z]/g, '');
  
  const locationSubreddits = [
    cityClean,
    countryClean,
    `${cityClean}travel`,
    `${countryClean}travel`
  ].filter(name => name.length > 2); // Only include meaningful names

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
      if (tipText.length > 20 && tipText.length < 300) {
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
  if (tips.length === 0 && post.selftext.length > 100 && post.selftext.length < 1500) {
    // Check if it looks like a helpful post
    const helpfulKeywords = ['tip', 'advice', 'recommend', 'guide', 'experience', 'visit', 'travel', 'stay', 'eat', 'avoid'];
    const hasHelpfulContent = helpfulKeywords.some(keyword => 
      post.title.toLowerCase().includes(keyword) || post.selftext.toLowerCase().includes(keyword)
    );

    if (hasHelpfulContent) {
      tips.push({
        id: post.id,
        category: 'General',
        title: post.title,
        content: post.selftext.substring(0, 400) + (post.selftext.length > 400 ? '...' : ''),
        source: `r/${post.subreddit}`,
        reddit_url: `https://reddit.com${post.permalink}`,
        score: post.score,
        created_at: new Date(post.created_utc * 1000).toISOString()
      });
    }
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
    for (const subreddit of subreddits.slice(0, 6)) { // Limit to prevent timeout
      console.log(`Checking subreddit: r/${subreddit}`);
      
      try {
        // Try different search approaches
        for (const searchTerm of searchTerms.slice(0, 2)) { // Limit search terms
          const posts = await fetchTopPosts(subreddit, searchTerm, 3);
          
          for (const post of posts) {
            const tips = extractTipsFromPost(post);
            allTips.push(...tips);
          }

          // Add small delay to be respectful to Reddit's servers
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Also get general top posts from main travel subreddits
        if (['travel', 'solotravel', 'backpacking'].includes(subreddit)) {
          const generalPosts = await fetchTopPosts(subreddit, '', 2);
          for (const post of generalPosts) {
            const tips = extractTipsFromPost(post);
            allTips.push(...tips);
          }
        }
      } catch (error) {
        console.error(`Error processing subreddit ${subreddit}:`, error);
        continue;
      }
    }

    // Remove duplicates and sort by score
    const uniqueTips = allTips
      .filter((tip, index, self) => 
        index === self.findIndex(t => 
          t.content.toLowerCase().trim() === tip.content.toLowerCase().trim()
        )
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 15); // Return top 15 tips

    console.log(`Found ${uniqueTips.length} unique tips for ${city}, ${country}`);

    // If no tips found, return some fallback tips
    if (uniqueTips.length === 0) {
      const fallbackTips = [
        {
          id: 'fallback_1',
          category: 'General',
          title: 'Research local customs and etiquette',
          content: 'Before traveling, research the local customs, tipping practices, and cultural norms to show respect and avoid misunderstandings.',
          source: 'r/travel',
          reddit_url: 'https://reddit.com/r/travel',
          score: 100,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_2',
          category: 'Safety',
          title: 'Keep copies of important documents',
          content: 'Make digital and physical copies of your passport, visa, and other important documents. Store them separately from the originals.',
          source: 'r/solotravel',
          reddit_url: 'https://reddit.com/r/solotravel',
          score: 95,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_3',
          category: 'Budget',
          title: 'Notify your bank of travel plans',
          content: 'Contact your bank before traveling to inform them of your destination and dates to prevent your cards from being blocked.',
          source: 'r/TravelHacks',
          reddit_url: 'https://reddit.com/r/TravelHacks',
          score: 90,
          created_at: new Date().toISOString()
        }
      ];
      
      return new Response(
        JSON.stringify(fallbackTips),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

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
      JSON.stringify({ 
        error: 'Failed to fetch tips',
        details: error.message 
      }),
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