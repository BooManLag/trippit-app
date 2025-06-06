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

// Enhanced cache with normalized keys and subreddit existence tracking
const cache = new Map<string, any>();
const subredditExistsCache = new Map<string, boolean>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const SUBREDDIT_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Load countries data from your JSON file
let countriesData: { [country: string]: string[] } = {};

// Initialize countries data
async function loadCountriesData() {
  try {
    // In Deno, we can import JSON directly
    const response = await fetch(new URL('../../../src/data/countries.min.json', import.meta.url));
    countriesData = await response.json();
    console.log(`Loaded ${Object.keys(countriesData).length} countries from JSON`);
  } catch (error) {
    console.error('Failed to load countries.min.json:', error);
    // Fallback to basic country aliases if JSON loading fails
    countriesData = {
      'United States': ['New York', 'Los Angeles', 'Chicago'],
      'United Kingdom': ['London', 'Manchester', 'Edinburgh'],
      'France': ['Paris', 'Lyon', 'Marseille'],
      'Germany': ['Berlin', 'Munich', 'Hamburg'],
      'Italy': ['Rome', 'Milan', 'Naples'],
      'Spain': ['Madrid', 'Barcelona', 'Valencia'],
      'Japan': ['Tokyo', 'Osaka', 'Kyoto'],
      'Australia': ['Sydney', 'Melbourne', 'Brisbane'],
      'Canada': ['Toronto', 'Vancouver', 'Montreal'],
      'Netherlands': ['Amsterdam', 'Rotterdam', 'The Hague']
    };
  }
}

// Common country name variations and abbreviations
const COUNTRY_ALIASES: { [key: string]: string[] } = {
  'united states': ['usa', 'america', 'us', 'unitedstates'],
  'united kingdom': ['uk', 'britain', 'england', 'unitedkingdom', 'greatbritain'],
  'united arab emirates': ['uae', 'emirates'],
  'south korea': ['korea', 'southkorea'],
  'north korea': ['northkorea'],
  'czech republic': ['czechia', 'czechrepublic'],
  'bosnia and herzegovina': ['bosnia', 'herzegovina'],
  'trinidad and tobago': ['trinidad', 'tobago'],
  'new zealand': ['newzealand', 'nz'],
  'south africa': ['southafrica'],
  'saudi arabia': ['saudiarabia'],
  'sri lanka': ['srilanka'],
  'costa rica': ['costarica'],
  'puerto rico': ['puertorico'],
  'el salvador': ['elsalvador']
};

// Throttling utility for controlled concurrency
async function throttledFetch<T>(
  promises: Promise<T>[],
  batchSize: number = 3,
  delayMs: number = 100
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  
  for (let i = 0; i < promises.length; i += batchSize) {
    const batch = promises.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(promise => 
        Promise.race([
          promise,
          new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 6000)
          )
        ])
      )
    );
    
    results.push(...batchResults);
    
    // Small delay between batches to be respectful to Reddit's servers
    if (i + batchSize < promises.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

// Check if subreddit exists (cached for 24 hours)
async function subredditExists(name: string): Promise<boolean> {
  const cached = subredditExistsCache.get(name);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const response = await fetch(`https://www.reddit.com/r/${name}/about.json`, {
      headers: { 'User-Agent': 'Trippit/1.0 (Travel Tips Aggregator)' }
    });
    
    const exists = response.ok;
    subredditExistsCache.set(name, exists);
    return exists;
  } catch {
    subredditExistsCache.set(name, false);
    return false;
  }
}

async function fetchTopPosts(
  subredditName: string,
  searchGroup: number,
  searchQuery: string = '',
  limit: number = 8
): Promise<RedditPost[]> {
  // Normalized cache key to prevent cache bloat
  const cacheKey = `${subredditName}_group${searchGroup}_${limit}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    let path: string;
    
    if (searchQuery) {
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
      return [];
    }

    const json = await res.json();
    
    if (!json.data?.children) {
      return [];
    }

    const posts = json.data.children
      .map((child: any) => ({
        ...child.data,
        subreddit: subredditName
      }) as RedditPost)
      .filter((post: RedditPost) => 
        // Pre-filter for quality and relevance
        post.score > 5 && 
        post.selftext.length >= 50 && 
        post.selftext.length <= 5000 && // Avoid extremely long posts
        !post.selftext.toLowerCase().includes('[deleted]') &&
        !post.selftext.toLowerCase().includes('[removed]')
      );

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

function generateOptimizedSearchTerms(city: string, country: string): string[][] {
  // Group search terms for better cache key normalization
  return [
    [`${city} travel tips`, `${city} travel guide`, `visiting ${city}`], // Group 0: City-focused
    [`${city} advice`, `${country} travel tips`, `${city} food`], // Group 1: Mixed
    [`${city} budget`, `${city} safety`, `${city} transport`] // Group 2: Specific categories
  ];
}

function getCountryVariationsFromJSON(country: string): string[] {
  const countryLower = country.toLowerCase().trim();
  const variations = new Set<string>();
  
  // Add the country itself (cleaned)
  const countryClean = countryLower.replace(/[^a-z\s]/g, '').replace(/\s+/g, '');
  if (countryClean.length >= 2) {
    variations.add(countryClean);
  }
  
  // Check if this country exists in our JSON data
  const matchingCountry = Object.keys(countriesData).find(
    key => key.toLowerCase() === countryLower
  );
  
  if (matchingCountry) {
    console.log(`Found country "${matchingCountry}" in countries.min.json`);
    
    // Add country name variations
    const countryKey = matchingCountry.toLowerCase();
    variations.add(countryKey.replace(/\s+/g, ''));
    
    // Add predefined aliases if they exist
    const aliases = COUNTRY_ALIASES[countryKey] || [];
    aliases.forEach(alias => {
      if (alias.length >= 2) {
        variations.add(alias);
      }
    });
    
    // For major countries, also try to find state/region subreddits
    const cities = countriesData[matchingCountry] || [];
    if (cities.length > 0) {
      // Add major cities as potential subreddits (first few cities are usually major ones)
      cities.slice(0, 3).forEach(city => {
        const cityClean = city.toLowerCase().replace(/[^a-z]/g, '');
        if (cityClean.length >= 3) {
          variations.add(cityClean);
        }
      });
    }
  } else {
    console.log(`Country "${country}" not found in countries.min.json, using fallback`);
    
    // Fallback: use predefined aliases
    const aliases = COUNTRY_ALIASES[countryLower] || [];
    aliases.forEach(alias => {
      if (alias.length >= 2) {
        variations.add(alias);
      }
    });
    
    // Add basic variations
    variations.add(countryLower.replace(/\s+/g, ''));
  }
  
  // Filter out very short names and return as array
  const result = Array.from(variations).filter(name => name && name.length >= 2);
  console.log(`Country variations for "${country}":`, result);
  
  return result;
}

async function generateOptimizedSubreddits(city: string, country: string): Promise<string[]> {
  const baseSubreddits = ['travel', 'solotravel', 'backpacking', 'TravelHacks'];
  
  const cityClean = city.toLowerCase().replace(/[^a-z]/g, '');
  const countryVariations = getCountryVariationsFromJSON(country);
  
  // Check existence of location-specific subreddits in parallel
  const locationCandidates = [cityClean, ...countryVariations];
  const existenceChecks = await Promise.allSettled(
    locationCandidates.map(name => subredditExists(name))
  );

  const validLocationSubreddits = locationCandidates.filter((_, index) => 
    existenceChecks[index].status === 'fulfilled' && 
    (existenceChecks[index] as PromiseFulfilledResult<boolean>).value
  );

  console.log(`Valid location subreddits:`, validLocationSubreddits);

  return [...baseSubreddits, ...validLocationSubreddits.slice(0, 2)];
}

function categorizeTip(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();
  
  // Optimized categorization with most common categories first
  if (text.includes('food') || text.includes('eat') || text.includes('restaurant')) return 'Food';
  if (text.includes('transport') || text.includes('metro') || text.includes('bus') || text.includes('taxi')) return 'Transport';
  if (text.includes('budget') || text.includes('cheap') || text.includes('money')) return 'Budget';
  if (text.includes('safety') || text.includes('safe') || text.includes('scam')) return 'Safety';
  if (text.includes('culture') || text.includes('custom') || text.includes('etiquette')) return 'Culture';
  if (text.includes('attraction') || text.includes('visit') || text.includes('see') || text.includes('do')) return 'Things to Do';
  if (text.includes('hotel') || text.includes('stay') || text.includes('accommodation')) return 'Accommodation';
  if (text.includes('pack') || text.includes('bring') || text.includes('luggage')) return 'Packing';
  if (text.includes('health') || text.includes('medical') || text.includes('vaccine')) return 'Health';
  if (text.includes('phone') || text.includes('wifi') || text.includes('app')) return 'Technology';
  if (text.includes('document') || text.includes('passport') || text.includes('visa')) return 'Documents';
  if (text.includes('plan') || text.includes('itinerary') || text.includes('book')) return 'Planning';
  
  return 'General';
}

function extractTipsFromPost(post: RedditPost): any[] {
  const tips = [];
  const content = `${post.title}\n\n${post.selftext}`;
  
  // Early quality check
  if (post.selftext.length < 50 || post.score < 3) {
    return [];
  }
  
  // Optimized regex patterns - most common first
  const tipPatterns = [
    /(?:^|\n)\s*(\d+[\.\)]\s*.{20,250})(?=\n\s*\d+[\.\)]|\n\s*$|\n\n|$)/gm,
    /(?:^|\n)\s*([-\*•]\s*.{20,250})(?=\n\s*[-\*•]|\n\s*$|\n\n|$)/gm,
    /(?:tip|advice|recommendation):\s*(.{20,250})(?=\n|$)/gim,
  ];

  // Process patterns efficiently
  for (const pattern of tipPatterns) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      for (const match of matches.slice(0, 3)) { // Limit to 3 tips per pattern
        let tipText = match.trim()
          .replace(/^\d+[\.\)]\s*/, '')
          .replace(/^[-\*•]\s*/, '')
          .replace(/^(tip|advice|recommendation):\s*/i, '');
        
        if (tipText.length > 20 && tipText.length < 300 && 
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
          
          if (tips.length >= 3) break; // Limit tips per post
        }
      }
      if (tips.length > 0) break; // If we found tips with one pattern, don't try others
    }
  }

  // Fallback for helpful posts without explicit tip formatting
  if (tips.length === 0 && post.selftext.length > 100 && post.selftext.length < 600 && post.score > 15) {
    const helpfulKeywords = ['tip', 'advice', 'recommend', 'guide', 'experience'];
    const hasHelpfulContent = helpfulKeywords.some(keyword => 
      post.title.toLowerCase().includes(keyword) || post.selftext.toLowerCase().includes(keyword)
    );

    if (hasHelpfulContent) {
      tips.push({
        id: post.id,
        category: categorizeTip(post.title, post.selftext),
        title: post.title,
        content: post.selftext.length > 300 ? post.selftext.substring(0, 300) + '...' : post.selftext,
        source: `r/${post.subreddit}`,
        reddit_url: `https://reddit.com${post.permalink}`,
        score: post.score,
        created_at: new Date(post.created_utc * 1000).toISOString()
      });
    }
  }

  return tips;
}

// Enhanced deduplication with normalized content comparison
function deduplicateTips(tips: any[]): any[] {
  const seen = new Set<string>();
  return tips.filter(tip => {
    // Create normalized fingerprint
    const normalized = tip.content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
    
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

    console.log(`Fetching optimized tips for ${city}, ${country}`);

    // Check cache first with normalized key
    const cacheKey = `tips_${city.toLowerCase()}_${country.toLowerCase()}`;
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

    // Generate subreddits and search terms using JSON data
    const subreddits = await generateOptimizedSubreddits(city, country);
    const searchTermGroups = generateOptimizedSearchTerms(city, country);
    
    console.log(`Using subreddits: ${subreddits.join(', ')}`);

    // Create fetch promises with controlled concurrency
    const fetchPromises: Promise<any[]>[] = [];

    for (const subreddit of subreddits.slice(0, 4)) {
      for (let groupIndex = 0; groupIndex < Math.min(searchTermGroups.length, 2); groupIndex++) {
        const searchTerms = searchTermGroups[groupIndex];
        
        for (const searchTerm of searchTerms.slice(0, 2)) { // Limit to 2 terms per group
          fetchPromises.push(
            fetchTopPosts(subreddit, groupIndex, searchTerm, 6).then(posts => {
              const tips = [];
              // Process only top 3 posts per search for speed
              for (const post of posts.slice(0, 3)) {
                tips.push(...extractTipsFromPost(post));
              }
              return tips;
            })
          );
        }
      }
    }

    console.log(`Created ${fetchPromises.length} fetch promises`);

    // Execute with throttling (3 concurrent requests, 100ms delay between batches)
    const results = await throttledFetch(fetchPromises, 3, 100);

    // Collect successful results
    const allTips = [];
    let successfulFetches = 0;
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allTips.push(...result.value);
        successfulFetches++;
      }
    }

    console.log(`Successful fetches: ${successfulFetches}/${results.length}, Raw tips: ${allTips.length}`);

    // Enhanced processing pipeline
    const processedTips = deduplicateTips(allTips)
      .filter(tip => {
        // Enhanced quality filter
        return tip.content.length > 25 && 
               tip.content.length < 400 &&
               tip.score > 2 && 
               !tip.content.toLowerCase().includes('deleted') &&
               !tip.content.toLowerCase().includes('removed') &&
               !tip.title.toLowerCase().includes('[deleted]');
      })
      .sort((a, b) => {
        // Enhanced relevance scoring
        const cityLower = city.toLowerCase();
        const aRelevant = (a.content.toLowerCase().includes(cityLower) || 
                          a.title.toLowerCase().includes(cityLower)) ? 10 : 0;
        const bRelevant = (b.content.toLowerCase().includes(cityLower) || 
                          b.title.toLowerCase().includes(cityLower)) ? 10 : 0;
        
        // Combine relevance and score
        const aScore = aRelevant + Math.log(a.score + 1);
        const bScore = bRelevant + Math.log(b.score + 1);
        
        return bScore - aScore;
      })
      .slice(0, 20); // Return top 20 tips

    console.log(`Final processed tips: ${processedTips.length} for ${city}, ${country}`);

    // Cache the result
    cache.set(cacheKey, {
      data: processedTips,
      timestamp: Date.now()
    });

    // Enhanced fallback tips if no results
    if (processedTips.length === 0) {
      const fallbackTips = [
        {
          id: 'fallback_1',
          category: 'Culture',
          title: `Essential cultural insights for ${city}`,
          content: `Research local customs, greeting styles, and cultural norms in ${country}. Understanding basic etiquette shows respect and enhances your experience in ${city}.`,
          source: 'r/travel',
          reddit_url: 'https://reddit.com/r/travel',
          score: 100,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_2',
          category: 'Food',
          title: `Authentic dining experiences in ${city}`,
          content: `Explore local markets and neighborhood restaurants in ${city}. Ask locals for their favorite spots and try regional specialties unique to ${country}.`,
          source: 'r/solotravel',
          reddit_url: 'https://reddit.com/r/solotravel',
          score: 95,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_3',
          category: 'Transport',
          title: `Getting around ${city} efficiently`,
          content: `Download local transit apps and research public transport passes for ${city}. Having offline maps and understanding the transport system saves time and money.`,
          source: 'r/TravelHacks',
          reddit_url: 'https://reddit.com/r/TravelHacks',
          score: 90,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_4',
          category: 'Budget',
          title: `Smart spending strategies for ${city}`,
          content: `Research typical costs in ${city} and look for city tourism cards that include attractions and transport. Many cities offer free walking tours and museum days.`,
          source: 'r/Shoestring',
          reddit_url: 'https://reddit.com/r/Shoestring',
          score: 85,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_5',
          category: 'Safety',
          title: `Staying safe and aware in ${city}`,
          content: `Learn about safe neighborhoods in ${city} and common tourist scams in ${country}. Keep emergency contacts accessible and trust your instincts.`,
          source: 'r/travel',
          reddit_url: 'https://reddit.com/r/travel',
          score: 88,
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback_6',
          category: 'Things to Do',
          title: `Hidden gems and local favorites in ${city}`,
          content: `Beyond major attractions, explore local neighborhoods and ask residents for recommendations. Some of the best ${city} experiences are off the typical tourist path.`,
          source: 'r/TravelTips',
          reddit_url: 'https://reddit.com/r/TravelTips',
          score: 82,
          created_at: new Date().toISOString()
        }
      ];
      
      // Cache fallback tips separately
      const fallbackKey = `${cacheKey}_fallback`;
      cache.set(fallbackKey, {
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
      JSON.stringify(processedTips),
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