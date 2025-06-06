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

function generateLocationSpecificSearchTerms(city: string, country: string): string[] {
  return [
    // Culture & Etiquette
    `${city} culture tips`,
    `${city} etiquette`,
    `${country} customs`,
    `${city} local customs`,
    `what to know before visiting ${city}`,
    
    // Food & Dining
    `${city} food guide`,
    `${city} restaurants`,
    `${city} street food`,
    `${country} cuisine`,
    `where to eat in ${city}`,
    `${city} local food`,
    
    // Budget & Money
    `${city} budget travel`,
    `${city} cheap eats`,
    `${city} cost of living`,
    `${country} money tips`,
    `${city} budget guide`,
    
    // Things to Do
    `${city} attractions`,
    `${city} hidden gems`,
    `things to do ${city}`,
    `${city} must see`,
    `${city} itinerary`,
    
    // Transportation & Commute
    `${city} transportation`,
    `${city} public transport`,
    `getting around ${city}`,
    `${city} metro guide`,
    `${country} transport tips`,
    
    // General Travel Tips
    `${city} travel tips`,
    `${city} travel guide`,
    `visiting ${city}`,
    `${city} first time`,
    `${country} travel advice`
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

  // Add location-specific subreddits (clean names)
  const cityClean = city.toLowerCase().replace(/[^a-z]/g, '');
  const countryClean = country.toLowerCase().replace(/[^a-z]/g, '');
  
  const locationSubreddits = [
    cityClean,
    countryClean,
    `${cityClean}travel`,
    `${countryClean}travel`,
    `visit${countryClean}`,
    `${countryClean}tourism`
  ].filter(name => name.length > 2); // Only include meaningful names

  return [...baseSubreddits, ...locationSubreddits];
}

function categorizeTip(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();
  
  if (text.includes('food') || text.includes('eat') || text.includes('restaurant') || text.includes('cuisine') || text.includes('dish')) {
    return 'Food';
  }
  if (text.includes('transport') || text.includes('metro') || text.includes('bus') || text.includes('taxi') || text.includes('getting around')) {
    return 'Transport';
  }
  if (text.includes('budget') || text.includes('cheap') || text.includes('money') || text.includes('cost') || text.includes('price')) {
    return 'Budget';
  }
  if (text.includes('culture') || text.includes('custom') || text.includes('etiquette') || text.includes('tradition') || text.includes('local')) {
    return 'Culture';
  }
  if (text.includes('safety') || text.includes('safe') || text.includes('danger') || text.includes('avoid') || text.includes('scam')) {
    return 'Safety';
  }
  if (text.includes('attraction') || text.includes('visit') || text.includes('see') || text.includes('do') || text.includes('activity')) {
    return 'Things to Do';
  }
  
  return 'General';
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
          category: categorizeTip(post.title, tipText),
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
    const helpfulKeywords = [
      'tip', 'advice', 'recommend', 'guide', 'experience', 'visit', 'travel', 
      'stay', 'eat', 'avoid', 'culture', 'food', 'transport', 'budget', 'cost',
      'attraction', 'activity', 'local', 'custom', 'etiquette'
    ];
    
    const hasHelpfulContent = helpfulKeywords.some(keyword => 
      post.title.toLowerCase().includes(keyword) || post.selftext.toLowerCase().includes(keyword)
    );

    if (hasHelpfulContent) {
      tips.push({
        id: post.id,
        category: categorizeTip(post.title, post.selftext),
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

    console.log(`Fetching location-specific tips for ${city}, ${country}`);

    const subreddits = generateSubreddits(city, country);
    const searchTerms = generateLocationSpecificSearchTerms(city, country);
    const allTips = [];

    // Fetch from multiple subreddits with location-specific searches
    for (const subreddit of subreddits.slice(0, 8)) { // Increased limit for better coverage
      console.log(`Searching r/${subreddit} for ${city} tips`);
      
      try {
        // Use targeted search terms for this destination
        const relevantSearchTerms = searchTerms.filter(term => 
          term.includes(city.toLowerCase()) || term.includes(country.toLowerCase())
        ).slice(0, 3); // Top 3 most relevant terms per subreddit

        for (const searchTerm of relevantSearchTerms) {
          const posts = await fetchTopPosts(subreddit, searchTerm, 5);
          
          for (const post of posts) {
            const tips = extractTipsFromPost(post);
            allTips.push(...tips);
          }

          // Add small delay to be respectful to Reddit's servers
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // For main travel subreddits, also search for general destination info
        if (['travel', 'solotravel', 'backpacking'].includes(subreddit)) {
          const generalPosts = await fetchTopPosts(subreddit, `${city} ${country}`, 3);
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

    // Remove duplicates and sort by relevance and score
    const uniqueTips = allTips
      .filter((tip, index, self) => 
        index === self.findIndex(t => 
          t.content.toLowerCase().trim() === tip.content.toLowerCase().trim()
        )
      )
      .sort((a, b) => {
        // Prioritize tips that mention the specific city/country
        const aRelevant = a.content.toLowerCase().includes(city.toLowerCase()) || 
                         a.content.toLowerCase().includes(country.toLowerCase());
        const bRelevant = b.content.toLowerCase().includes(city.toLowerCase()) || 
                         b.content.toLowerCase().includes(country.toLowerCase());
        
        if (aRelevant && !bRelevant) return -1;
        if (!aRelevant && bRelevant) return 1;
        
        // Then sort by score
        return b.score - a.score;
      })
      .slice(0, 20); // Return top 20 tips

    console.log(`Found ${uniqueTips.length} location-specific tips for ${city}, ${country}`);

    // If no tips found, return destination-specific fallback tips
    if (uniqueTips.length === 0) {
      const fallbackTips = [
        {
          id: 'fallback_1',
          category: 'Culture',
          title: `Research ${country} customs and etiquette`,
          content: `Before visiting ${city}, research local customs, tipping practices, and cultural norms specific to ${country} to show respect and avoid misunderstandings.`,
          source: 'r/travel',
          reddit_url: 'https://reddit.com/r/travel',
          score: 100,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_2',
          category: 'Food',
          title: `Try authentic ${country} cuisine in ${city}`,
          content: `Look for local restaurants and street food in ${city} to experience authentic ${country} flavors. Ask locals for recommendations!`,
          source: 'r/solotravel',
          reddit_url: 'https://reddit.com/r/solotravel',
          score: 95,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_3',
          category: 'Transport',
          title: `Learn about ${city} transportation options`,
          content: `Research public transportation, taxi apps, and walking routes in ${city}. Download offline maps and transportation apps before you arrive.`,
          source: 'r/TravelHacks',
          reddit_url: 'https://reddit.com/r/TravelHacks',
          score: 90,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_4',
          category: 'Budget',
          title: `Budget planning for ${city}`,
          content: `Research typical costs for meals, transportation, and activities in ${city}. Consider getting a local SIM card or travel pass for savings.`,
          source: 'r/Shoestring',
          reddit_url: 'https://reddit.com/r/Shoestring',
          score: 85,
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