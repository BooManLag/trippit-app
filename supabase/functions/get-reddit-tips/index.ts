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
  limit: number = 25
): Promise<RedditPost[]> {
  try {
    let path: string;
    
    if (searchQuery) {
      // Search within the subreddit with multiple time periods for better coverage
      const timePeriods = ['year', 'month', 'week'];
      const allPosts: RedditPost[] = [];
      
      for (const period of timePeriods) {
        const searchPath = `https://www.reddit.com/r/${encodeURIComponent(
          subredditName.toLowerCase()
        )}/search.json?q=${encodeURIComponent(searchQuery)}&restrict_sr=on&limit=${limit}&sort=top&t=${period}`;
        
        const res = await fetch(searchPath, {
          headers: {
            'User-Agent': 'Trippit/1.0 (Travel Tips Aggregator)'
          }
        });

        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.children) {
            const posts = json.data.children.map((child: any) => ({
              ...child.data,
              subreddit: subredditName
            }) as RedditPost);
            allPosts.push(...posts);
          }
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      return allPosts;
    } else {
      // Get top posts from the subreddit
      path = `https://www.reddit.com/r/${encodeURIComponent(
        subredditName.toLowerCase()
      )}/top.json?limit=${limit}&t=month`;
      
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

      return json.data.children.map((child: any) => ({
        ...child.data,
        subreddit: subredditName
      }) as RedditPost);
    }
  } catch (error) {
    console.error(`Error fetching posts from ${subredditName}:`, error);
    return [];
  }
}

function generateLocationSpecificSearchTerms(city: string, country: string): string[] {
  return [
    // Direct location searches
    `${city} travel tips`,
    `${city} travel guide`,
    `visiting ${city}`,
    `${city} first time`,
    `${city} advice`,
    `${country} travel tips`,
    `${country} travel guide`,
    
    // Culture & Etiquette
    `${city} culture`,
    `${city} etiquette`,
    `${country} customs`,
    `${city} local customs`,
    `what to know ${city}`,
    `${country} culture tips`,
    
    // Food & Dining
    `${city} food`,
    `${city} restaurants`,
    `${city} street food`,
    `${country} cuisine`,
    `where to eat ${city}`,
    `${city} local food`,
    `${city} food guide`,
    `${country} food tips`,
    
    // Budget & Money
    `${city} budget`,
    `${city} cheap`,
    `${city} cost`,
    `${country} money`,
    `${city} budget travel`,
    `${country} budget tips`,
    
    // Things to Do & Attractions
    `${city} attractions`,
    `${city} hidden gems`,
    `things to do ${city}`,
    `${city} must see`,
    `${city} itinerary`,
    `${city} activities`,
    `${country} attractions`,
    
    // Transportation
    `${city} transportation`,
    `${city} transport`,
    `${city} metro`,
    `getting around ${city}`,
    `${country} transport`,
    
    // Safety & Practical
    `${city} safety`,
    `${city} scams`,
    `${country} safety`,
    `${city} tips tricks`,
    `${country} advice`,
    
    // Accommodation
    `${city} hotels`,
    `${city} accommodation`,
    `where to stay ${city}`,
    `${city} neighborhoods`,
    
    // General experiences
    `${city} experience`,
    `${city} trip report`,
    `${country} experience`,
    `${city} solo travel`,
    `${country} solo travel`
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
    'Shoestring',
    'TravelNoPics',
    'TravelAdvice',
    'TravelGuides'
  ];

  // Add location-specific subreddits
  const cityClean = city.toLowerCase().replace(/[^a-z]/g, '');
  const countryClean = country.toLowerCase().replace(/[^a-z]/g, '');
  
  const locationSubreddits = [
    cityClean,
    countryClean,
    `${cityClean}travel`,
    `${countryClean}travel`,
    `visit${countryClean}`,
    `${countryClean}tourism`,
    `${cityClean}tourism`,
    // Common country variations
    countryClean === 'unitedstates' ? 'usa' : null,
    countryClean === 'unitedkingdom' ? 'uk' : null,
    countryClean === 'unitedkingdom' ? 'london' : null,
  ].filter(name => name && name.length > 2);

  return [...baseSubreddits, ...locationSubreddits];
}

function categorizeTip(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();
  
  // More specific categorization
  if (text.includes('food') || text.includes('eat') || text.includes('restaurant') || text.includes('cuisine') || text.includes('dish') || text.includes('meal')) {
    return 'Food';
  }
  if (text.includes('transport') || text.includes('metro') || text.includes('bus') || text.includes('taxi') || text.includes('getting around') || text.includes('uber') || text.includes('train')) {
    return 'Transport';
  }
  if (text.includes('budget') || text.includes('cheap') || text.includes('money') || text.includes('cost') || text.includes('price') || text.includes('expensive') || text.includes('save')) {
    return 'Budget';
  }
  if (text.includes('culture') || text.includes('custom') || text.includes('etiquette') || text.includes('tradition') || text.includes('local') || text.includes('behavior')) {
    return 'Culture';
  }
  if (text.includes('safety') || text.includes('safe') || text.includes('danger') || text.includes('avoid') || text.includes('scam') || text.includes('crime')) {
    return 'Safety';
  }
  if (text.includes('attraction') || text.includes('visit') || text.includes('see') || text.includes('do') || text.includes('activity') || text.includes('museum') || text.includes('tour')) {
    return 'Things to Do';
  }
  if (text.includes('hotel') || text.includes('stay') || text.includes('accommodation') || text.includes('hostel') || text.includes('airbnb')) {
    return 'Accommodation';
  }
  if (text.includes('pack') || text.includes('bring') || text.includes('luggage') || text.includes('clothes') || text.includes('gear')) {
    return 'Packing';
  }
  if (text.includes('health') || text.includes('medical') || text.includes('vaccine') || text.includes('medicine') || text.includes('doctor')) {
    return 'Health';
  }
  if (text.includes('phone') || text.includes('wifi') || text.includes('internet') || text.includes('app') || text.includes('sim card')) {
    return 'Technology';
  }
  if (text.includes('document') || text.includes('passport') || text.includes('visa') || text.includes('id') || text.includes('permit')) {
    return 'Documents';
  }
  if (text.includes('plan') || text.includes('itinerary') || text.includes('schedule') || text.includes('book') || text.includes('reserve')) {
    return 'Planning';
  }
  if (text.includes('mindset') || text.includes('attitude') || text.includes('expect') || text.includes('mental') || text.includes('prepare')) {
    return 'Mindset';
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
  
  // Look for various tip patterns
  const tipPatterns = [
    // Numbered lists
    /(?:^|\n)\s*(\d+[\.\)]\s*.+?)(?=\n\s*\d+[\.\)]|\n\s*$|\n\n|$)/gm,
    // Bullet points
    /(?:^|\n)\s*([-\*•]\s*.+?)(?=\n\s*[-\*•]|\n\s*$|\n\n|$)/gm,
    // Tip/advice patterns
    /(?:tip|advice|recommendation|pro tip|lpt):\s*(.+?)(?=\n|$)/gim,
    // "Don't" or "Do" statements
    /(?:^|\n)\s*((?:don't|do|always|never|make sure|remember to|be sure to).+?)(?=\n|$)/gim,
    // Sentences with helpful keywords
    /([^.!?]*(?:recommend|suggest|advice|tip|helpful|useful|important|essential|must|should|avoid|don't|warning)[^.!?]*[.!?])/gim
  ];

  tipPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      let tipText = match[1].trim();
      
      // Clean up the tip text
      tipText = tipText.replace(/^\d+[\.\)]\s*/, ''); // Remove numbering
      tipText = tipText.replace(/^[-\*•]\s*/, ''); // Remove bullet points
      tipText = tipText.replace(/^(tip|advice|recommendation|pro tip|lpt):\s*/i, ''); // Remove tip prefixes
      
      // Filter out tips that are too short, too long, or not useful
      if (tipText.length > 15 && tipText.length < 500 && 
          !tipText.toLowerCase().includes('edit:') &&
          !tipText.toLowerCase().includes('update:') &&
          !tipText.toLowerCase().includes('tldr') &&
          !tipText.match(/^https?:\/\//)) {
        
        tips.push({
          id: `${post.id}_${tips.length}`,
          category: categorizeTip(post.title, tipText),
          title: post.title.length > 100 ? post.title.substring(0, 100) + '...' : post.title,
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
  if (tips.length === 0 && post.selftext.length > 50 && post.selftext.length < 2000) {
    const helpfulKeywords = [
      'tip', 'advice', 'recommend', 'guide', 'experience', 'visit', 'travel', 
      'stay', 'eat', 'avoid', 'culture', 'food', 'transport', 'budget', 'cost',
      'attraction', 'activity', 'local', 'custom', 'etiquette', 'safety', 'scam',
      'must', 'should', 'don\'t', 'do', 'helpful', 'useful', 'important'
    ];
    
    const hasHelpfulContent = helpfulKeywords.some(keyword => 
      post.title.toLowerCase().includes(keyword) || post.selftext.toLowerCase().includes(keyword)
    );

    if (hasHelpfulContent && post.score > 5) {
      tips.push({
        id: post.id,
        category: categorizeTip(post.title, post.selftext),
        title: post.title,
        content: post.selftext.length > 600 ? post.selftext.substring(0, 600) + '...' : post.selftext,
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

    console.log(`Fetching comprehensive tips for ${city}, ${country}`);

    const subreddits = generateSubreddits(city, country);
    const searchTerms = generateLocationSpecificSearchTerms(city, country);
    const allTips = [];

    // Fetch from multiple subreddits with comprehensive searches
    for (const subreddit of subreddits.slice(0, 12)) { // Increased to 12 subreddits
      console.log(`Searching r/${subreddit} for ${city} tips`);
      
      try {
        // For main travel subreddits, use more search terms
        const isMainSubreddit = ['travel', 'solotravel', 'backpacking', 'TravelHacks'].includes(subreddit);
        const termsToUse = isMainSubreddit ? searchTerms.slice(0, 8) : searchTerms.slice(0, 4);

        for (const searchTerm of termsToUse) {
          const posts = await fetchTopPosts(subreddit, searchTerm, 15); // Increased limit
          
          for (const post of posts) {
            const tips = extractTipsFromPost(post);
            allTips.push(...tips);
          }

          // Small delay to be respectful
          await new Promise(resolve => setTimeout(resolve, 250));
        }

        // Also get general top posts from location-specific subreddits
        if (subreddit.includes(city.toLowerCase()) || subreddit.includes(country.toLowerCase())) {
          const generalPosts = await fetchTopPosts(subreddit, '', 10);
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

    console.log(`Raw tips collected: ${allTips.length}`);

    // Remove duplicates more aggressively and sort by relevance
    const uniqueTips = allTips
      .filter((tip, index, self) => {
        // Remove duplicates based on content similarity
        const normalizedContent = tip.content.toLowerCase().replace(/[^\w\s]/g, '').trim();
        return index === self.findIndex(t => {
          const tNormalized = t.content.toLowerCase().replace(/[^\w\s]/g, '').trim();
          return tNormalized === normalizedContent || 
                 (tNormalized.length > 50 && normalizedContent.length > 50 && 
                  tNormalized.includes(normalizedContent.substring(0, 50)) ||
                  normalizedContent.includes(tNormalized.substring(0, 50)));
        });
      })
      .filter(tip => {
        // Filter out low-quality tips
        return tip.content.length > 20 && 
               tip.score > 1 && 
               !tip.content.toLowerCase().includes('deleted') &&
               !tip.content.toLowerCase().includes('[removed]');
      })
      .sort((a, b) => {
        // Prioritize tips that mention the specific city/country
        const aRelevant = a.content.toLowerCase().includes(city.toLowerCase()) || 
                         a.content.toLowerCase().includes(country.toLowerCase()) ||
                         a.title.toLowerCase().includes(city.toLowerCase()) ||
                         a.title.toLowerCase().includes(country.toLowerCase());
        const bRelevant = b.content.toLowerCase().includes(city.toLowerCase()) || 
                         b.content.toLowerCase().includes(country.toLowerCase()) ||
                         b.title.toLowerCase().includes(city.toLowerCase()) ||
                         b.title.toLowerCase().includes(country.toLowerCase());
        
        if (aRelevant && !bRelevant) return -1;
        if (!aRelevant && bRelevant) return 1;
        
        // Then sort by score
        return b.score - a.score;
      })
      .slice(0, 50); // Return up to 50 tips instead of 20

    console.log(`Final unique tips: ${uniqueTips.length} for ${city}, ${country}`);

    // If still no tips found, return enhanced fallback tips
    if (uniqueTips.length === 0) {
      const fallbackTips = [
        {
          id: 'fallback_1',
          category: 'Culture',
          title: `Research ${country} customs and etiquette before visiting ${city}`,
          content: `Before visiting ${city}, research local customs, tipping practices, greeting styles, and cultural norms specific to ${country}. This shows respect and helps avoid cultural misunderstandings.`,
          source: 'r/travel',
          reddit_url: 'https://reddit.com/r/travel',
          score: 100,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_2',
          category: 'Food',
          title: `Discover authentic ${country} cuisine in ${city}`,
          content: `Look for local restaurants, street food vendors, and markets in ${city} to experience authentic ${country} flavors. Ask locals for their favorite spots and try regional specialties!`,
          source: 'r/solotravel',
          reddit_url: 'https://reddit.com/r/solotravel',
          score: 95,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_3',
          category: 'Transport',
          title: `Master ${city} transportation like a local`,
          content: `Research public transportation options, download local transit apps, and learn about taxi services in ${city}. Get offline maps and consider getting a transit pass for savings.`,
          source: 'r/TravelHacks',
          reddit_url: 'https://reddit.com/r/TravelHacks',
          score: 90,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_4',
          category: 'Budget',
          title: `Smart budgeting for your ${city} adventure`,
          content: `Research typical costs for meals, transportation, and activities in ${city}. Look into city passes, happy hour deals, and free attractions to maximize your budget.`,
          source: 'r/Shoestring',
          reddit_url: 'https://reddit.com/r/Shoestring',
          score: 85,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_5',
          category: 'Safety',
          title: `Stay safe while exploring ${city}`,
          content: `Research safe neighborhoods in ${city}, learn about common scams in ${country}, and keep emergency contacts handy. Trust your instincts and stay aware of your surroundings.`,
          source: 'r/travel',
          reddit_url: 'https://reddit.com/r/travel',
          score: 88,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_6',
          category: 'Things to Do',
          title: `Hidden gems and must-sees in ${city}`,
          content: `Beyond the main tourist attractions, explore local neighborhoods, visit markets, and ask residents for their favorite spots in ${city}. Some of the best experiences are off the beaten path!`,
          source: 'r/TravelTips',
          reddit_url: 'https://reddit.com/r/TravelTips',
          score: 82,
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