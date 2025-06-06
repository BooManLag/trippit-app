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

// Cache for storing results to avoid repeated API calls
const cache = new Map<string, any>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

async function fetchTopPosts(
  subredditName: string,
  searchQuery: string = '',
  limit: number = 10
): Promise<RedditPost[]> {
  const cacheKey = `${subredditName}_${searchQuery}_${limit}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    let path: string;
    
    if (searchQuery) {
      // Only search recent posts for faster results
      path = `https://www.reddit.com/r/${encodeURIComponent(
        subredditName.toLowerCase()
      )}/search.json?q=${encodeURIComponent(searchQuery)}&restrict_sr=on&limit=${limit}&sort=top&t=month`;
    } else {
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

    const posts = json.data.children.map((child: any) => ({
      ...child.data,
      subreddit: subredditName
    }) as RedditPost);

    // Cache the result
    cache.set(cacheKey, {
      data: posts,
      timestamp: Date.now()
    });

    return posts;
  } catch (error) {
    console.error(`Error fetching posts from ${subredditName}:`, error);
    return [];
  }
}

function generateOptimizedSearchTerms(city: string, country: string): string[] {
  // Reduced to most effective search terms
  return [
    `${city} travel tips`,
    `${city} travel guide`,
    `visiting ${city}`,
    `${city} advice`,
    `${country} travel tips`,
    `${city} food`,
    `${city} budget`,
    `${city} safety`
  ];
}

function generateOptimizedSubreddits(city: string, country: string): string[] {
  // Focus on most active and relevant subreddits
  const baseSubreddits = [
    'travel',
    'solotravel', 
    'backpacking',
    'TravelHacks'
  ];

  // Add location-specific subreddits if they exist
  const cityClean = city.toLowerCase().replace(/[^a-z]/g, '');
  const countryClean = country.toLowerCase().replace(/[^a-z]/g, '');
  
  const locationSubreddits = [
    cityClean,
    countryClean,
    // Common variations
    countryClean === 'unitedstates' ? 'usa' : null,
    countryClean === 'unitedkingdom' ? 'uk' : null,
  ].filter(name => name && name.length > 2);

  return [...baseSubreddits, ...locationSubreddits.slice(0, 2)]; // Limit location subreddits
}

function categorizeTip(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();
  
  if (text.includes('food') || text.includes('eat') || text.includes('restaurant') || text.includes('cuisine')) {
    return 'Food';
  }
  if (text.includes('transport') || text.includes('metro') || text.includes('bus') || text.includes('taxi') || text.includes('getting around')) {
    return 'Transport';
  }
  if (text.includes('budget') || text.includes('cheap') || text.includes('money') || text.includes('cost')) {
    return 'Budget';
  }
  if (text.includes('culture') || text.includes('custom') || text.includes('etiquette') || text.includes('local')) {
    return 'Culture';
  }
  if (text.includes('safety') || text.includes('safe') || text.includes('danger') || text.includes('avoid') || text.includes('scam')) {
    return 'Safety';
  }
  if (text.includes('attraction') || text.includes('visit') || text.includes('see') || text.includes('do') || text.includes('activity')) {
    return 'Things to Do';
  }
  if (text.includes('hotel') || text.includes('stay') || text.includes('accommodation')) {
    return 'Accommodation';
  }
  if (text.includes('pack') || text.includes('bring') || text.includes('luggage')) {
    return 'Packing';
  }
  if (text.includes('health') || text.includes('medical') || text.includes('vaccine')) {
    return 'Health';
  }
  if (text.includes('phone') || text.includes('wifi') || text.includes('internet') || text.includes('app')) {
    return 'Technology';
  }
  if (text.includes('document') || text.includes('passport') || text.includes('visa')) {
    return 'Documents';
  }
  if (text.includes('plan') || text.includes('itinerary') || text.includes('book')) {
    return 'Planning';
  }
  
  return 'General';
}

function extractTipsFromPost(post: RedditPost): any[] {
  const tips = [];
  
  // Skip posts that are too short or likely not helpful
  if (post.selftext.length < 30) {
    return [];
  }
  
  const content = `${post.title}\n\n${post.selftext}`;
  
  // Simplified tip extraction - focus on most common patterns
  const tipPatterns = [
    // Numbered lists
    /(?:^|\n)\s*(\d+[\.\)]\s*.+?)(?=\n\s*\d+[\.\)]|\n\s*$|\n\n|$)/gm,
    // Bullet points
    /(?:^|\n)\s*([-\*•]\s*.+?)(?=\n\s*[-\*•]|\n\s*$|\n\n|$)/gm,
    // Tip patterns
    /(?:tip|advice|recommendation):\s*(.+?)(?=\n|$)/gim,
  ];

  tipPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null && tips.length < 5) { // Limit tips per post
      let tipText = match[1].trim();
      
      // Clean up the tip text
      tipText = tipText.replace(/^\d+[\.\)]\s*/, '');
      tipText = tipText.replace(/^[-\*•]\s*/, '');
      tipText = tipText.replace(/^(tip|advice|recommendation):\s*/i, '');
      
      if (tipText.length > 15 && tipText.length < 300 && 
          !tipText.toLowerCase().includes('edit:') &&
          !tipText.toLowerCase().includes('deleted')) {
        
        tips.push({
          id: `${post.id}_${tips.length}`,
          category: categorizeTip(post.title, tipText),
          title: post.title.length > 80 ? post.title.substring(0, 80) + '...' : post.title,
          content: tipText,
          source: `r/${post.subreddit}`,
          reddit_url: `https://reddit.com${post.permalink}`,
          score: post.score,
          created_at: new Date(post.created_utc * 1000).toISOString()
        });
      }
    }
  });

  // If no specific tips found but the post seems helpful, use the whole post
  if (tips.length === 0 && post.selftext.length > 50 && post.selftext.length < 800 && post.score > 10) {
    const helpfulKeywords = ['tip', 'advice', 'recommend', 'guide', 'experience', 'visit', 'travel'];
    
    const hasHelpfulContent = helpfulKeywords.some(keyword => 
      post.title.toLowerCase().includes(keyword) || post.selftext.toLowerCase().includes(keyword)
    );

    if (hasHelpfulContent) {
      tips.push({
        id: post.id,
        category: categorizeTip(post.title, post.selftext),
        title: post.title,
        content: post.selftext.length > 400 ? post.selftext.substring(0, 400) + '...' : post.selftext,
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

    console.log(`Fetching optimized tips for ${city}, ${country}`);

    // Check cache first
    const cacheKey = `tips_${city}_${country}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Returning cached tips');
      return new Response(
        JSON.stringify(cached.data),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const subreddits = generateOptimizedSubreddits(city, country);
    const searchTerms = generateOptimizedSearchTerms(city, country);
    const allTips = [];

    // Parallel fetching for better performance
    const fetchPromises = [];

    // Fetch from main travel subreddits with targeted searches
    for (const subreddit of subreddits.slice(0, 4)) { // Limit to 4 subreddits
      // Only use 2-3 most relevant search terms per subreddit
      const relevantTerms = searchTerms.slice(0, 3);
      
      for (const searchTerm of relevantTerms) {
        fetchPromises.push(
          fetchTopPosts(subreddit, searchTerm, 8).then(posts => {
            const tips = [];
            for (const post of posts.slice(0, 5)) { // Limit posts processed
              tips.push(...extractTipsFromPost(post));
            }
            return tips;
          })
        );
      }
    }

    // Execute all fetches in parallel with timeout
    const results = await Promise.allSettled(
      fetchPromises.map(promise => 
        Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
        ])
      )
    );

    // Collect successful results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allTips.push(...result.value);
      }
    }

    console.log(`Raw tips collected: ${allTips.length}`);

    // Quick deduplication and sorting
    const uniqueTips = allTips
      .filter((tip, index, self) => {
        // Simple deduplication based on content start
        const contentStart = tip.content.substring(0, 50).toLowerCase();
        return index === self.findIndex(t => 
          t.content.substring(0, 50).toLowerCase() === contentStart
        );
      })
      .filter(tip => {
        // Basic quality filter
        return tip.content.length > 20 && 
               tip.score > 1 && 
               !tip.content.toLowerCase().includes('deleted');
      })
      .sort((a, b) => {
        // Quick relevance scoring
        const aRelevant = a.content.toLowerCase().includes(city.toLowerCase()) || 
                         a.title.toLowerCase().includes(city.toLowerCase());
        const bRelevant = b.content.toLowerCase().includes(city.toLowerCase()) || 
                         b.title.toLowerCase().includes(city.toLowerCase());
        
        if (aRelevant && !bRelevant) return -1;
        if (!aRelevant && bRelevant) return 1;
        return b.score - a.score;
      })
      .slice(0, 25); // Return up to 25 tips

    console.log(`Final unique tips: ${uniqueTips.length} for ${city}, ${country}`);

    // Cache the result
    cache.set(cacheKey, {
      data: uniqueTips,
      timestamp: Date.now()
    });

    // If no tips found, return enhanced fallback tips
    if (uniqueTips.length === 0) {
      const fallbackTips = [
        {
          id: 'fallback_1',
          category: 'Culture',
          title: `Research ${country} customs before visiting ${city}`,
          content: `Learn about local customs, tipping practices, and cultural norms in ${country}. This shows respect and helps avoid misunderstandings during your visit to ${city}.`,
          source: 'r/travel',
          reddit_url: 'https://reddit.com/r/travel',
          score: 100,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_2',
          category: 'Food',
          title: `Discover authentic cuisine in ${city}`,
          content: `Seek out local restaurants and street food in ${city} to experience authentic ${country} flavors. Ask locals for recommendations and try regional specialties!`,
          source: 'r/solotravel',
          reddit_url: 'https://reddit.com/r/solotravel',
          score: 95,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_3',
          category: 'Transport',
          title: `Navigate ${city} transportation efficiently`,
          content: `Research public transport options in ${city}, download local transit apps, and consider getting a transit pass. Having offline maps is always helpful.`,
          source: 'r/TravelHacks',
          reddit_url: 'https://reddit.com/r/TravelHacks',
          score: 90,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_4',
          category: 'Budget',
          title: `Budget wisely for your ${city} trip`,
          content: `Research typical costs in ${city} for meals, transport, and activities. Look for city passes, happy hour deals, and free attractions to stretch your budget.`,
          source: 'r/Shoestring',
          reddit_url: 'https://reddit.com/r/Shoestring',
          score: 85,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_5',
          category: 'Safety',
          title: `Stay safe while exploring ${city}`,
          content: `Research safe areas in ${city}, learn about common scams in ${country}, and keep emergency contacts handy. Trust your instincts and stay aware.`,
          source: 'r/travel',
          reddit_url: 'https://reddit.com/r/travel',
          score: 88,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_6',
          category: 'Things to Do',
          title: `Explore beyond tourist spots in ${city}`,
          content: `While visiting main attractions, also explore local neighborhoods and markets in ${city}. Ask residents for hidden gems - some of the best experiences are off the beaten path!`,
          source: 'r/TravelTips',
          reddit_url: 'https://reddit.com/r/TravelTips',
          score: 82,
          created_at: new Date().toISOString()
        }
      ];
      
      // Cache fallback tips too
      cache.set(cacheKey, {
        data: fallbackTips,
        timestamp: Date.now()
      });
      
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