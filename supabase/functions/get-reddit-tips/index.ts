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

// Enhanced cache with better key management
const cache = new Map<string, any>();
const subredditExistsCache = new Map<string, boolean>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const SUBREDDIT_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Load countries data from your JSON file
let countriesData: { [country: string]: string[] } = {};

async function loadCountriesData() {
  try {
    const response = await fetch(new URL('../../../src/data/countries.min.json', import.meta.url));
    countriesData = await response.json();
    console.log(`✅ Loaded ${Object.keys(countriesData).length} countries from JSON`);
  } catch (error) {
    console.error('❌ Failed to load countries.min.json:', error);
    // Minimal fallback
    countriesData = {
      'Vietnam': ['Ho Chi Minh City', 'Hanoi', 'Da Nang'],
      'Thailand': ['Bangkok', 'Chiang Mai', 'Phuket'],
      'Japan': ['Tokyo', 'Osaka', 'Kyoto'],
      'United States': ['New York', 'Los Angeles', 'Chicago'],
      'United Kingdom': ['London', 'Manchester', 'Edinburgh']
    };
  }
}

// Enhanced country aliases with better coverage
const COUNTRY_ALIASES: { [key: string]: string[] } = {
  'vietnam': ['vietnam', 'vn'],
  'thailand': ['thailand', 'thai'],
  'united states': ['usa', 'america', 'us', 'unitedstates'],
  'united kingdom': ['uk', 'britain', 'england', 'unitedkingdom'],
  'japan': ['japan', 'nippon'],
  'south korea': ['korea', 'southkorea'],
  'france': ['france', 'french'],
  'germany': ['germany', 'deutschland'],
  'italy': ['italy', 'italia'],
  'spain': ['spain', 'espana'],
  'australia': ['australia', 'aussie', 'oz'],
  'canada': ['canada', 'canadian'],
  'netherlands': ['netherlands', 'holland', 'dutch'],
  'china': ['china', 'chinese'],
  'india': ['india', 'indian']
};

async function fetchTopPosts(
  subredditName: string,
  searchQuery: string = '',
  limit: number = 10,
  timeframe: string = 'month'
): Promise<RedditPost[]> {
  const cacheKey = `${subredditName}_${searchQuery}_${limit}_${timeframe}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    let url: string;
    
    if (searchQuery) {
      // Search within subreddit
      url = `https://www.reddit.com/r/${encodeURIComponent(subredditName)}/search.json?q=${encodeURIComponent(searchQuery)}&restrict_sr=on&limit=${limit}&sort=top&t=${timeframe}`;
    } else {
      // Get top posts from subreddit
      url = `https://www.reddit.com/r/${encodeURIComponent(subredditName)}/top.json?limit=${limit}&t=${timeframe}`;
    }
    
    console.log(`🔍 Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Trippit/1.0 (Travel Tips Aggregator)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.log(`❌ Failed to fetch from r/${subredditName}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    if (!data.data?.children) {
      console.log(`❌ No data from r/${subredditName}`);
      return [];
    }

    const posts = data.data.children
      .map((child: any) => ({
        ...child.data,
        subreddit: subredditName
      }) as RedditPost)
      .filter((post: RedditPost) => {
        // Better filtering for quality content
        const hasContent = post.selftext && post.selftext.length >= 100;
        const goodScore = post.score >= 10;
        const notDeleted = !post.selftext.includes('[deleted]') && !post.selftext.includes('[removed]');
        const notTooLong = post.selftext.length <= 8000;
        
        return hasContent && goodScore && notDeleted && notTooLong;
      });

    console.log(`✅ Found ${posts.length} quality posts from r/${subredditName}`);

    // Cache the result
    cache.set(cacheKey, {
      data: posts,
      timestamp: Date.now()
    });

    return posts;
  } catch (error) {
    console.error(`❌ Error fetching from r/${subredditName}:`, error);
    return [];
  }
}

function getCountryVariationsFromJSON(country: string): string[] {
  const countryLower = country.toLowerCase().trim();
  const variations = new Set<string>();
  
  // Find exact match in JSON
  const matchingCountry = Object.keys(countriesData).find(
    key => key.toLowerCase() === countryLower
  );
  
  if (matchingCountry) {
    console.log(`✅ Found "${matchingCountry}" in countries.min.json`);
    
    // Add country variations
    const countryKey = matchingCountry.toLowerCase();
    variations.add(countryKey.replace(/\s+/g, ''));
    
    // Add aliases
    const aliases = COUNTRY_ALIASES[countryKey] || [];
    aliases.forEach(alias => variations.add(alias));
    
    // Add major cities as potential subreddits
    const cities = countriesData[matchingCountry] || [];
    cities.slice(0, 2).forEach(city => {
      const cityClean = city.toLowerCase().replace(/[^a-z]/g, '');
      if (cityClean.length >= 3) {
        variations.add(cityClean);
      }
    });
  } else {
    console.log(`⚠️ "${country}" not found in JSON, using fallback`);
    const aliases = COUNTRY_ALIASES[countryLower] || [];
    aliases.forEach(alias => variations.add(alias));
    variations.add(countryLower.replace(/[^a-z]/g, ''));
  }
  
  const result = Array.from(variations).filter(name => name && name.length >= 2);
  console.log(`🌍 Country variations for "${country}":`, result);
  return result;
}

async function generateOptimizedSubreddits(city: string, country: string): Promise<string[]> {
  // Start with proven travel subreddits
  const baseSubreddits = ['travel', 'solotravel', 'backpacking'];
  
  const cityClean = city.toLowerCase().replace(/[^a-z]/g, '');
  const countryVariations = getCountryVariationsFromJSON(country);
  
  // Add location-specific subreddits
  const locationSubreddits = [cityClean, ...countryVariations].filter(name => name.length >= 3);
  
  console.log(`🎯 Target subreddits: ${[...baseSubreddits, ...locationSubreddits].join(', ')}`);
  
  return [...baseSubreddits, ...locationSubreddits.slice(0, 3)];
}

function extractTipsFromPost(post: RedditPost, city: string): any[] {
  const tips = [];
  const content = post.selftext;
  const title = post.title;
  
  console.log(`🔍 Processing post: "${title}" (${content.length} chars, score: ${post.score})`);
  
  // Enhanced tip extraction patterns
  const patterns = [
    // Numbered lists (1. 2. 3.)
    /(?:^|\n)\s*(\d+[\.\)]\s*[^\n]{30,400})(?=\n\s*\d+[\.\)]|\n\s*$|\n\n|$)/gm,
    // Bullet points (- * •)
    /(?:^|\n)\s*([-\*•]\s*[^\n]{30,400})(?=\n\s*[-\*•]|\n\s*$|\n\n|$)/gm,
    // Explicit tips/advice
    /(?:tip|advice|recommendation|pro tip|lpt):\s*([^\n]{30,400})/gim,
    // Sentences with helpful keywords
    /([^\n.!?]{30,400}(?:should|must|recommend|suggest|avoid|don't|always|never)[^\n.!?]{10,200}[.!?])/gim
  ];

  let foundTips = 0;
  
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`  📝 Found ${matches.length} matches with pattern`);
      
      for (const match of matches.slice(0, 5)) { // Max 5 per pattern
        let tipText = match.trim()
          .replace(/^\d+[\.\)]\s*/, '')
          .replace(/^[-\*•]\s*/, '')
          .replace(/^(?:tip|advice|recommendation|pro tip|lpt):\s*/i, '')
          .trim();
        
        // Quality checks
        if (tipText.length < 30 || tipText.length > 500) continue;
        if (tipText.toLowerCase().includes('edit:')) continue;
        if (tipText.toLowerCase().includes('update:')) continue;
        if (tipText.toLowerCase().includes('deleted')) continue;
        
        // Check for city relevance
        const cityLower = city.toLowerCase();
        const isRelevant = tipText.toLowerCase().includes(cityLower) || 
                          title.toLowerCase().includes(cityLower) ||
                          tipText.length > 100; // Longer tips are often more valuable
        
        if (isRelevant) {
          tips.push({
            id: `${post.id}_tip_${foundTips}`,
            category: categorizeTip(title, tipText),
            title: title.length > 100 ? title.substring(0, 100) + '...' : title,
            content: tipText,
            source: `r/${post.subreddit}`,
            reddit_url: `https://reddit.com${post.permalink}`,
            score: post.score,
            created_at: new Date(post.created_utc * 1000).toISOString(),
            relevance_score: calculateRelevanceScore(tipText, title, city)
          });
          
          foundTips++;
          if (foundTips >= 3) break; // Max 3 tips per post
        }
      }
      
      if (foundTips > 0) break; // If we found tips, don't try other patterns
    }
  }

  // Fallback: if no structured tips found but post seems valuable
  if (foundTips === 0 && post.score > 50 && content.length > 200 && content.length < 1000) {
    const helpfulKeywords = ['tip', 'advice', 'recommend', 'experience', 'guide', 'helpful'];
    const hasHelpfulContent = helpfulKeywords.some(keyword => 
      title.toLowerCase().includes(keyword) || content.toLowerCase().includes(keyword)
    );

    if (hasHelpfulContent) {
      console.log(`  💡 Using entire post as tip (high score: ${post.score})`);
      tips.push({
        id: post.id,
        category: categorizeTip(title, content),
        title: title,
        content: content.length > 400 ? content.substring(0, 400) + '...' : content,
        source: `r/${post.subreddit}`,
        reddit_url: `https://reddit.com${post.permalink}`,
        score: post.score,
        created_at: new Date(post.created_utc * 1000).toISOString(),
        relevance_score: calculateRelevanceScore(content, title, city)
      });
    }
  }

  console.log(`  ✅ Extracted ${tips.length} tips from post`);
  return tips;
}

function calculateRelevanceScore(content: string, title: string, city: string): number {
  let score = 0;
  const text = `${title} ${content}`.toLowerCase();
  const cityLower = city.toLowerCase();
  
  // City mentions
  if (text.includes(cityLower)) score += 20;
  
  // Helpful keywords
  const helpfulWords = ['tip', 'advice', 'recommend', 'must', 'should', 'avoid', 'best', 'good'];
  helpfulWords.forEach(word => {
    if (text.includes(word)) score += 2;
  });
  
  // Length bonus (longer content often more valuable)
  if (content.length > 200) score += 5;
  if (content.length > 500) score += 5;
  
  return score;
}

function categorizeTip(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();
  
  // More specific categorization
  if (text.includes('food') || text.includes('eat') || text.includes('restaurant') || text.includes('cuisine')) return 'Food';
  if (text.includes('transport') || text.includes('metro') || text.includes('bus') || text.includes('taxi') || text.includes('uber')) return 'Transport';
  if (text.includes('budget') || text.includes('cheap') || text.includes('money') || text.includes('cost') || text.includes('price')) return 'Budget';
  if (text.includes('safety') || text.includes('safe') || text.includes('scam') || text.includes('dangerous') || text.includes('avoid')) return 'Safety';
  if (text.includes('culture') || text.includes('custom') || text.includes('etiquette') || text.includes('tradition')) return 'Culture';
  if (text.includes('attraction') || text.includes('visit') || text.includes('see') || text.includes('museum') || text.includes('temple')) return 'Things to Do';
  if (text.includes('hotel') || text.includes('stay') || text.includes('accommodation') || text.includes('hostel')) return 'Accommodation';
  if (text.includes('pack') || text.includes('bring') || text.includes('luggage') || text.includes('clothes')) return 'Packing';
  if (text.includes('health') || text.includes('medical') || text.includes('vaccine') || text.includes('medicine')) return 'Health';
  if (text.includes('phone') || text.includes('wifi') || text.includes('app') || text.includes('internet')) return 'Technology';
  if (text.includes('document') || text.includes('passport') || text.includes('visa') || text.includes('permit')) return 'Documents';
  if (text.includes('plan') || text.includes('itinerary') || text.includes('book') || text.includes('reserve')) return 'Planning';
  if (text.includes('weather') || text.includes('climate') || text.includes('season') || text.includes('rain')) return 'Weather';
  
  return 'General';
}

function deduplicateTips(tips: any[]): any[] {
  const seen = new Set<string>();
  return tips.filter(tip => {
    // Create a more robust fingerprint
    const normalized = tip.content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 150); // Longer fingerprint for better deduplication
    
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Load countries data on first request
    if (Object.keys(countriesData).length === 0) {
      await loadCountriesData();
    }

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

    console.log(`🚀 Fetching tips for ${city}, ${country}`);

    // Check cache first
    const cacheKey = `tips_${city.toLowerCase()}_${country.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('📦 Returning cached tips');
      return new Response(
        JSON.stringify(cached.data),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate search strategy
    const subreddits = await generateOptimizedSubreddits(city, country);
    const searchQueries = [
      `${city} tips`,
      `${city} travel guide`,
      `${city} advice`,
      `visiting ${city}`,
      `${country} travel tips`
    ];

    console.log(`🎯 Searching in: ${subreddits.join(', ')}`);
    console.log(`🔍 Using queries: ${searchQueries.join(', ')}`);

    // Create fetch promises
    const fetchPromises: Promise<RedditPost[]>[] = [];

    // Search in each subreddit with different queries
    for (const subreddit of subreddits.slice(0, 4)) {
      // Try specific searches first
      for (const query of searchQueries.slice(0, 3)) {
        fetchPromises.push(fetchTopPosts(subreddit, query, 8, 'month'));
      }
      
      // Also get general top posts from travel subreddits
      if (['travel', 'solotravel', 'backpacking'].includes(subreddit)) {
        fetchPromises.push(fetchTopPosts(subreddit, '', 5, 'week'));
      }
    }

    console.log(`📡 Created ${fetchPromises.length} fetch requests`);

    // Execute all fetches with timeout
    const results = await Promise.allSettled(
      fetchPromises.map(promise => 
        Promise.race([
          promise,
          new Promise<RedditPost[]>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 8000)
          )
        ])
      )
    );

    // Process results
    const allTips = [];
    let successfulFetches = 0;
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const posts = result.value;
        successfulFetches++;
        
        // Extract tips from each post
        for (const post of posts.slice(0, 3)) { // Top 3 posts per fetch
          const tips = extractTipsFromPost(post, city);
          allTips.push(...tips);
        }
      }
    }

    console.log(`📊 Results: ${successfulFetches}/${results.length} successful fetches, ${allTips.length} raw tips`);

    // Process and filter tips
    const processedTips = deduplicateTips(allTips)
      .filter(tip => {
        // Enhanced quality filtering
        return tip.content.length >= 50 && 
               tip.content.length <= 600 &&
               tip.score >= 5 && 
               !tip.content.toLowerCase().includes('deleted') &&
               !tip.content.toLowerCase().includes('removed') &&
               !tip.title.toLowerCase().includes('[deleted]');
      })
      .sort((a, b) => {
        // Sort by relevance score and Reddit score
        const aTotal = (a.relevance_score || 0) + Math.log(a.score + 1) * 2;
        const bTotal = (b.relevance_score || 0) + Math.log(b.score + 1) * 2;
        return bTotal - aTotal;
      })
      .slice(0, 25); // Top 25 tips

    console.log(`✅ Final result: ${processedTips.length} quality tips for ${city}, ${country}`);

    // Cache the result
    cache.set(cacheKey, {
      data: processedTips,
      timestamp: Date.now()
    });

    // Return results or fallback
    if (processedTips.length > 0) {
      return new Response(
        JSON.stringify(processedTips),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      console.log('⚠️ No tips found, returning enhanced fallback');
      
      // Enhanced fallback tips with more specific content
      const fallbackTips = [
        {
          id: 'fallback_1',
          category: 'Culture',
          title: `Cultural etiquette for ${city}`,
          content: `Research local customs and greeting styles in ${city}. Understanding basic etiquette like appropriate dress codes, tipping practices, and social norms will help you connect better with locals and show respect for ${country}'s culture.`,
          source: 'r/travel',
          reddit_url: 'https://reddit.com/r/travel',
          score: 100,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_2',
          category: 'Food',
          title: `Local cuisine experiences in ${city}`,
          content: `Explore local markets and neighborhood restaurants in ${city} rather than tourist areas. Ask locals for their favorite spots and try regional specialties unique to ${country}. Street food can offer authentic flavors at great prices.`,
          source: 'r/solotravel',
          reddit_url: 'https://reddit.com/r/solotravel',
          score: 95,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_3',
          category: 'Transport',
          title: `Getting around ${city} efficiently`,
          content: `Download local transit apps and research public transport passes for ${city}. Having offline maps and understanding the transport system saves time and money. Consider walking or cycling for short distances to experience the city like a local.`,
          source: 'r/TravelHacks',
          reddit_url: 'https://reddit.com/r/TravelHacks',
          score: 90,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_4',
          category: 'Budget',
          title: `Smart spending in ${city}`,
          content: `Research typical costs in ${city} beforehand and look for city tourism cards that include attractions and transport. Many cities offer free walking tours, museum days, and public events that provide great value for budget travelers.`,
          source: 'r/Shoestring',
          reddit_url: 'https://reddit.com/r/Shoestring',
          score: 85,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_5',
          category: 'Safety',
          title: `Staying safe in ${city}`,
          content: `Learn about safe neighborhoods in ${city} and common tourist scams in ${country}. Keep emergency contacts accessible, trust your instincts, and have backup plans for transportation and accommodation.`,
          source: 'r/travel',
          reddit_url: 'https://reddit.com/r/travel',
          score: 88,
          created_at: new Date().toISOString()
        }
      ];
      
      return new Response(
        JSON.stringify(fallbackTips),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('💥 Error in get-reddit-tips function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch tips',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});