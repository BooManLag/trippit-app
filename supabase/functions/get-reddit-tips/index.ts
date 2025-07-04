const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { generateFallbackTips, generateRegionalFallbackTips, type FallbackTip } from './fallback-tips.ts';

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

// Validate environment variables and initialize Supabase client
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || (() => { 
  throw new Error('SUPABASE_URL environment variable is not set'); 
})();

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || (() => { 
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set'); 
})();

// Initialize Supabase client with service role key for token access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Enhanced cache with better key management
const cache = new Map<string, any>();
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours for better performance

// Rate limiting with Reddit header respect
let lastRequestTime = 0;
let remainingRequests = 60;
let resetTime = 0;

// Reddit API credentials from environment variables
const REDDIT_USERNAME = Deno.env.get('REDDIT_USERNAME');
const REDDIT_PASSWORD = Deno.env.get('REDDIT_PASSWORD');
const REDDIT_CLIENT_ID = Deno.env.get('REDDIT_CLIENT_ID');
const REDDIT_CLIENT_SECRET = Deno.env.get('REDDIT_CLIENT_SECRET');

async function getValidToken(): Promise<string | null> {
  try {
    // Check database for valid token
    const { data, error } = await supabase
      .from('tokens')
      .select('access_token, expires_at')
      .eq('service', 'reddit')
      .single();

    if (error) {
      console.log('📭 No stored Reddit token found');
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    
    // If token is still valid (with 5 minute buffer), use it
    if (expiresAt.getTime() > now.getTime() + (5 * 60 * 1000)) {
      console.log('✅ Using valid stored token');
      return data.access_token;
    }
    
    console.log('🔄 Token expired, need to refresh');
    return null;
  } catch (error) {
    console.error('❌ Error checking token validity:', error);
    return null;
  }
}

function respectRateLimit(headers: Headers): void {
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');
  const used = headers.get('x-ratelimit-used');

  if (remaining) remainingRequests = parseInt(remaining, 10);
  if (reset) resetTime = Date.now() + (parseInt(reset, 10) * 1000);
  
  console.log(`📊 Rate limit: ${remainingRequests} remaining, resets in ${reset}s, used: ${used}`);
}

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  
  // Respect minimum delay between requests
  const timeSinceLastRequest = now - lastRequestTime;
  const minDelay = 500; // Reduced to 500ms minimum between requests
  
  if (timeSinceLastRequest < minDelay) {
    const waitTime = minDelay - timeSinceLastRequest;
    console.log(`⏰ Waiting ${waitTime}ms for rate limit...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // If we're low on requests, wait for reset but cap at 8 seconds
  if (remainingRequests < 3 && resetTime > now) {
    const waitTime = Math.min(resetTime - now, 8000); // Cap at 8 seconds max
    console.log(`⏰ Low on requests (${remainingRequests}), waiting ${waitTime}ms for reset...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

async function fetchTopPostsWithAuth(
  subredditName: string,
  searchQuery: string = '',
  limit: number = 10,
  timeframe: string = 'year'
): Promise<RedditPost[]> {
  const cacheKey = `${subredditName}_${searchQuery}_${limit}_${timeframe}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`📦 Cache hit for ${cacheKey} - returning ${cached.data.length} posts`);
    return cached.data;
  }

  // Wait for rate limit before making request
  await waitForRateLimit();
  
  // Get a valid token from the database
  const bearerToken = await getValidToken();
  
  // Use OAuth endpoints if we have a token, otherwise fall back to public API
  const baseUrl = bearerToken ? 'https://oauth.reddit.com' : 'https://api.reddit.com';
  
  let url: string;
  if (searchQuery) {
    url = `${baseUrl}/r/${encodeURIComponent(subredditName)}/search?` +
      `q=${encodeURIComponent(searchQuery)}` +
      `&restrict_sr=1&limit=${limit}&sort=relevance&t=${timeframe}`;
  } else {
    url = `${baseUrl}/r/${encodeURIComponent(subredditName)}/top?` +
      `limit=${limit}&t=${timeframe}`;
  }

  console.log(`🔍 Fetching from ${bearerToken ? 'OAuth' : 'public'} API: r/${subredditName} (${searchQuery || 'top posts'})`);
  
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'web:Trippit:v1.0 (by /u/BooManLagg)',
      'Accept': 'application/json',
    };

    if (bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`;
      console.log('🔑 Using bearer token for authenticated request');
    } else {
      console.log('ℹ️ No bearer token available, using public API');
    }

    const response = await fetch(url, { headers });

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);

    // Respect Reddit's rate limit headers
    respectRateLimit(response.headers);

    if (!response.ok) {
      if (response.status === 401 && bearerToken) {
        console.warn(`🔑 Bearer token invalid for r/${subredditName}, will refresh on next request`);
        // Clear the invalid token from database
        await supabase.from('tokens').delete().eq('service', 'reddit');
        return [];
      }
      if (response.status === 429) {
        const retryAfter = Math.min(parseInt(response.headers.get('retry-after') || '8', 10), 8); // Cap at 8 seconds
        console.warn(`⏰ Rate limited for r/${subredditName} - backing off ${retryAfter}s`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return [];
      }
      if (response.status === 403) {
        console.warn(`🚫 Access forbidden for r/${subredditName} - may be private or banned`);
        return [];
      }
      console.warn(`❌ Failed to fetch from r/${subredditName}: ${response.status}`);
      return [];
    }

    const json = await response.json();
    
    if (!json.data?.children) {
      console.warn(`❌ No data from r/${subredditName}`);
      return [];
    }

    const rawPosts: RedditPost[] = (json.data.children as any[]).map((child) => ({
      ...child.data,
      subreddit: subredditName,
    }));

    console.log(`📝 Raw posts from r/${subredditName}: ${rawPosts.length}`);

    // Apply quality filter
    const posts = rawPosts.filter((post) => {
      const hasContent = post.selftext && post.selftext.length >= 15;
      const goodScore = post.score >= 1;
      const notDeleted = !post.selftext.includes('[deleted]') &&
                         !post.selftext.includes('[removed]') &&
                         !post.title.includes('[deleted]') &&
                         !post.title.includes('[removed]');
      const notTooLong = post.selftext.length <= 8000;
      const notBot = !post.author.toLowerCase().includes('bot');
      return hasContent && goodScore && notDeleted && notTooLong && notBot;
    });

    console.log(`✅ Filtered posts from r/${subredditName}: ${posts.length} (from ${rawPosts.length} raw)`);

    // Cache the result
    cache.set(cacheKey, { data: posts, timestamp: Date.now() });
    return posts;
  } catch (err) {
    console.error(`❌ Error fetching from r/${subredditName}:`, err);
    return [];
  }
}

async function generateOptimizedSubreddits(city: string, country: string): Promise<string[]> {
  const baseSubreddits = ['travel', 'solotravel'];
  
  const cityClean = city.toLowerCase().replace(/[^a-z]/g, '');
  const countryClean = country.toLowerCase().replace(/[^a-z]/g, '');
  
  console.log(`🔹 Cleaned names: cityClean="${cityClean}", countryClean="${countryClean}"`);
  
  const locationSubreddits = [];
  
  if (cityClean.length >= 3) {
    locationSubreddits.push(cityClean);
  }
  
  const countryVariations = [countryClean];
  if (countryClean === 'unitedstates') countryVariations.push('usa', 'america');
  if (countryClean === 'unitedkingdom') countryVariations.push('uk', 'britain');
  if (countryClean === 'vietnam') countryVariations.push('vietnam');
  if (countryClean === 'southkorea') countryVariations.push('korea');
  
  locationSubreddits.push(...countryVariations.filter(name => name.length >= 2));
  
  const finalSubreddits = [...baseSubreddits, ...locationSubreddits.slice(0, 1)];
  console.log(`🎯 Target subreddits: ${finalSubreddits.join(', ')}`);
  
  return finalSubreddits;
}

function extractTipsFromPost(post: RedditPost, city: string, country: string): any[] {
  const tips = [];
  const content = post.selftext;
  const title = post.title;
  
  console.log(`🔍 Processing post: "${title.substring(0, 60)}..." (${content.length} chars, score: ${post.score})`);
  
  if (!content || content.length < 15) {
    console.log(`  ⚠️ Skipping post - content too short (${content.length} chars)`);
    return [];
  }
  
  // Enhanced tip extraction patterns with more flexibility
  const patterns = [
    /(?:^|\n)\s*(\d+[\.\)]\s*[^\n]{10,400})(?=\n\s*\d+[\.\)]|\n\s*$|\n\n|$)/gm,
    /(?:^|\n)\s*([-\*•]\s*[^\n]{10,400})(?=\n\s*[-\*•]|\n\s*$|\n\n|$)/gm,
    /(?:tip|advice|recommendation|pro tip|lpt|suggestion):\s*([^\n]{10,400})/gim,
    /([^\n.!?]{15,400}(?:should|must|recommend|suggest|avoid|don't|always|never|best|good|great|try|visit|go)[^\n.!?]{5,200}[.!?])/gim,
    /(?:^|\n)\s*([A-Z][^\n]{20,400}[.!?])/gm,
    /(?:when|if|before|after|during)\s+(?:you|visiting|in|at)\s+[^.!?\n]{10,300}[.!?]/gim
  ];

  let foundTips = 0;
  
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`  📝 Found ${matches.length} matches with pattern`);
      
      for (const match of matches.slice(0, 2)) {
        let tipText = match.trim()
          .replace(/^\d+[\.\)]\s*/, '')
          .replace(/^[-\*•]\s*/, '')
          .replace(/^(?:tip|advice|recommendation|pro tip|lpt|suggestion):\s*/i, '')
          .trim();
        
        if (tipText.length < 10 || tipText.length > 500) continue;
        if (tipText.toLowerCase().includes('edit:')) continue;
        if (tipText.toLowerCase().includes('update:')) continue;
        if (tipText.toLowerCase().includes('deleted')) continue;
        if (tipText.toLowerCase().includes('removed')) continue;
        
        tipText = tipText.replace(/\s+/g, ' ').trim();
        
        const mentionsLocation = checkLocationRelevance(tipText, title, city, country);
        if (!mentionsLocation) {
          if (post.score < 10) {
            console.log(`  ⚠️ Skipping tip - doesn't mention ${city} or ${country} (score: ${post.score})`);
            continue;
          }
        }
        
        tips.push({
          id: `${post.id}_tip_${foundTips}`,
          category: categorizeTip(title, tipText),
          title: generateTipTitle(tipText, city, post.subreddit),
          content: tipText,
          source: `r/${post.subreddit}`,
          reddit_url: `https://reddit.com${post.permalink}`,
          score: post.score,
          created_at: new Date(post.created_utc * 1000).toISOString(),
          relevance_score: calculateRelevanceScore(tipText, title, city, country)
        });
        
        foundTips++;
        if (foundTips >= 3) break;
      }
      
      if (foundTips >= 3) break;
    }
  }

  // Fallback for valuable posts
  if (foundTips === 0 && post.score > 2 && content.length > 30 && content.length < 2000) {
    const helpfulKeywords = ['tip', 'advice', 'recommend', 'experience', 'guide', 'helpful', 'must', 'should', 'avoid', 'best', 'good'];
    const hasHelpfulContent = helpfulKeywords.some(keyword => 
      title.toLowerCase().includes(keyword) || content.toLowerCase().includes(keyword)
    );

    const mentionsLocation = checkLocationRelevance(content, title, city, country);

    if (hasHelpfulContent && (mentionsLocation || post.score > 5)) {
      console.log(`  💡 Using entire post as tip (score: ${post.score}, helpful: ${hasHelpfulContent}, mentions location: ${mentionsLocation})`);
      
      let cleanContent = content.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanContent.length > 300) {
        cleanContent = cleanContent.substring(0, 300) + '...';
      }
      
      tips.push({
        id: post.id,
        category: categorizeTip(title, content),
        title: title.length > 100 ? title.substring(0, 100) + '...' : title,
        content: cleanContent,
        source: `r/${post.subreddit}`,
        reddit_url: `https://reddit.com${post.permalink}`,
        score: post.score,
        created_at: new Date(post.created_utc * 1000).toISOString(),
        relevance_score: calculateRelevanceScore(content, title, city, country)
      });
    }
  }

  console.log(`  ✅ Extracted ${tips.length} tips from post`);
  return tips;
}

function checkLocationRelevance(content: string, title: string, city: string, country: string): boolean {
  const text = `${title} ${content}`.toLowerCase();
  const cityLower = city.toLowerCase();
  const countryLower = country.toLowerCase();
  
  const mentionsCity = text.includes(cityLower);
  const mentionsCountry = text.includes(countryLower);
  
  const cityVariations = [cityLower];
  const countryVariations = [countryLower];
  
  if (countryLower === 'united states') countryVariations.push('usa', 'america', 'us');
  if (countryLower === 'united kingdom') countryVariations.push('uk', 'britain', 'england');
  if (countryLower === 'south korea') countryVariations.push('korea');
  if (countryLower === 'vietnam') countryVariations.push('vietnam', 'viet nam');
  
  if (cityLower === 'new york') cityVariations.push('nyc', 'ny');
  if (cityLower === 'los angeles') cityVariations.push('la');
  if (cityLower === 'san francisco') cityVariations.push('sf');
  
  const mentionsAnyVariation = [...cityVariations, ...countryVariations].some(variation => 
    text.includes(variation)
  );
  
  return mentionsCity || mentionsCountry || mentionsAnyVariation;
}

function generateTipTitle(content: string, city: string, subreddit: string): string {
  const firstSentence = content.split(/[.!?]/)[0].trim();
  
  if (firstSentence.length > 10 && firstSentence.length < 100) {
    return firstSentence;
  }
  
  const text = content.toLowerCase();
  if (text.includes('food') || text.includes('eat')) return `Food advice for ${city}`;
  if (text.includes('transport') || text.includes('metro')) return `Getting around ${city}`;
  if (text.includes('money') || text.includes('budget')) return `Budget tips for ${city}`;
  if (text.includes('safe') || text.includes('avoid')) return `Safety advice for ${city}`;
  if (text.includes('culture') || text.includes('custom')) return `Cultural tips for ${city}`;
  if (text.includes('hotel') || text.includes('stay')) return `Accommodation advice for ${city}`;
  if (text.includes('attraction') || text.includes('visit')) return `Things to do in ${city}`;
  
  return `Travel tip for ${city}`;
}

function calculateRelevanceScore(content: string, title: string, city: string, country: string): number {
  let score = 0;
  const text = `${title} ${content}`.toLowerCase();
  const cityLower = city.toLowerCase();
  const countryLower = country.toLowerCase();
  
  const cityMentions = (text.match(new RegExp(cityLower, 'g')) || []).length;
  const countryMentions = (text.match(new RegExp(countryLower, 'g')) || []).length;
  score += cityMentions * 25;
  score += countryMentions * 15;
  
  const helpfulWords = ['tip', 'advice', 'recommend', 'must', 'should', 'avoid', 'best', 'good', 'experience', 'helpful'];
  helpfulWords.forEach(word => {
    if (text.includes(word)) score += 4;
  });
  
  if (content.length > 50) score += 5;
  if (content.length > 150) score += 8;
  if (content.length > 300) score += 5;
  
  const actionWords = ['visit', 'try', 'book', 'download', 'bring', 'pack', 'learn', 'check', 'ask', 'use'];
  actionWords.forEach(word => {
    if (text.includes(word)) score += 3;
  });
  
  return score;
}

function categorizeTip(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();
  
  if (text.includes('food') || text.includes('eat') || text.includes('restaurant') || text.includes('cuisine') || text.includes('meal') || text.includes('drink')) return 'Food';
  if (text.includes('transport') || text.includes('metro') || text.includes('bus') || text.includes('taxi') || text.includes('uber') || text.includes('train') || text.includes('flight')) return 'Transport';
  if (text.includes('budget') || text.includes('cheap') || text.includes('money') || text.includes('cost') || text.includes('price') || text.includes('expensive') || text.includes('tip')) return 'Budget';
  if (text.includes('safety') || text.includes('safe') || text.includes('scam') || text.includes('dangerous') || text.includes('avoid') || text.includes('careful') || text.includes('crime')) return 'Safety';
  if (text.includes('culture') || text.includes('custom') || text.includes('etiquette') || text.includes('tradition') || text.includes('local') || text.includes('language')) return 'Culture';
  if (text.includes('attraction') || text.includes('visit') || text.includes('see') || text.includes('museum') || text.includes('temple') || text.includes('tour') || text.includes('landmark')) return 'Things to Do';
  if (text.includes('hotel') || text.includes('stay') || text.includes('accommodation') || text.includes('hostel') || text.includes('airbnb') || text.includes('booking')) return 'Accommodation';
  if (text.includes('pack') || text.includes('bring') || text.includes('luggage') || text.includes('clothes') || text.includes('gear') || text.includes('bag')) return 'Packing';
  if (text.includes('health') || text.includes('medical') || text.includes('vaccine') || text.includes('medicine') || text.includes('doctor') || text.includes('hospital')) return 'Health';
  if (text.includes('phone') || text.includes('wifi') || text.includes('app') || text.includes('internet') || text.includes('sim') || text.includes('data')) return 'Technology';
  if (text.includes('document') || text.includes('passport') || text.includes('visa') || text.includes('permit') || text.includes('id') || text.includes('immigration')) return 'Documents';
  if (text.includes('plan') || text.includes('itinerary') || text.includes('book') || text.includes('reserve') || text.includes('schedule') || text.includes('prepare')) return 'Planning';
  if (text.includes('weather') || text.includes('climate') || text.includes('season') || text.includes('rain') || text.includes('temperature') || text.includes('cold') || text.includes('hot')) return 'Weather';
  
  return 'General';
}

function deduplicateTips(tips: any[]): any[] {
  const seen = new Set<string>();
  return tips.filter(tip => {
    const normalized = tip.content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 150);
    
    if (seen.has(normalized)) {
      console.log(`🔄 Skipping duplicate tip: "${tip.content.substring(0, 50)}..."`);
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

Deno.serve(async (req) => {
  console.log('🔥 INCOMING REQUEST to /get-reddit-tips');
  console.log(`📡 Method: ${req.method}, URL: ${req.url}`);
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📥 Attempting to parse request body...');
    const body = await req.json();
    console.log('📋 Parsed request body:', JSON.stringify(body, null, 2));
    
    const { city, country } = body;
    
    if (!city || !country) {
      console.log('❌ Missing required fields:', { city, country });
      return new Response(
        JSON.stringify({ error: 'City and country are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🚀 Starting enhanced tip search for: ${city}, ${country}`);

    // Check cache first
    const cacheKey = `tips_${city.toLowerCase()}_${country.toLowerCase()}_v7`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📦 Returning cached tips: ${cached.data.length} items`);
      return new Response(
        JSON.stringify(cached.data),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get a valid token from the database
    console.log('🔑 Getting valid Reddit token from database...');
    const bearerToken = await getValidToken();
    console.log(`🔑 Token retrieved: ${bearerToken ? 'Yes' : 'No'}`);

    // Generate enhanced search strategy
    const subreddits = await generateOptimizedSubreddits(city, country);
    const searchQueries = [
      `${city} tips`,
      `${city} travel advice`
    ];

    console.log(`🎯 Will search in subreddits: ${subreddits.join(', ')}`);
    console.log(`🔍 Using search queries: ${searchQueries.join(', ')}`);

    // Enhanced fetch strategy with reduced API calls to prevent timeout
    const allTips = [];
    let successfulFetches = 0;
    let totalPosts = 0;

    // Reduced number of subreddits and queries to prevent timeout
    for (const subreddit of subreddits.slice(0, 2)) {
      for (const query of searchQueries.slice(0, 1)) {
        try {
          console.log(`🔍 Searching r/${subreddit} for "${query}"`);
          const posts = await fetchTopPostsWithAuth(subreddit, query, 6, 'year');
          
          if (posts.length > 0) {
            successfulFetches++;
            totalPosts += posts.length;
            console.log(`✅ Got ${posts.length} posts from r/${subreddit}`);
            
            // Extract tips from each post
            for (const post of posts.slice(0, 3)) {
              const tips = extractTipsFromPost(post, city, country);
              allTips.push(...tips);
            }
          }
        } catch (error) {
          console.error(`❌ Error fetching from r/${subreddit}:`, error);
        }
      }
    }

    console.log(`📊 SUMMARY: ${successfulFetches} successful fetches, ${totalPosts} total posts, ${allTips.length} raw tips extracted`);

    // Process and filter tips with enhanced logic
    let processedTips = deduplicateTips(allTips)
      .filter(tip => {
        const hasGoodLength = tip.content.length >= 15 && tip.content.length <= 600;
        const hasGoodScore = tip.score >= 1;
        const notDeleted = !tip.content.toLowerCase().includes('deleted') &&
                          !tip.content.toLowerCase().includes('removed') &&
                          !tip.title.toLowerCase().includes('[deleted]');
        
        return hasGoodLength && hasGoodScore && notDeleted;
      })
      .sort((a, b) => {
        const aTotal = (a.relevance_score || 0) + Math.log(a.score + 1) * 4;
        const bTotal = (b.relevance_score || 0) + Math.log(b.score + 1) * 4;
        
        if (Math.abs(aTotal - bTotal) < 8) {
          const aDate = new Date(a.created_at).getTime();
          const bDate = new Date(b.created_at).getTime();
          return bDate - aDate;
        }
        
        return bTotal - aTotal;
      });

    console.log(`✅ Processed ${processedTips.length} quality Reddit tips for ${city}, ${country}`);

    // Smart fallback logic
    const MIN_REDDIT_TIPS = 3;
    let finalTips = processedTips;

    if (processedTips.length < MIN_REDDIT_TIPS) {
      console.log(`💡 Only ${processedTips.length} Reddit tips found (minimum ${MIN_REDDIT_TIPS}), adding strategic fallbacks`);
      
      const generalFallbacks = generateFallbackTips(city, country);
      const regionalFallbacks = generateRegionalFallbackTips(city, country);
      const allFallbacks = [...generalFallbacks, ...regionalFallbacks];
      
      const neededFallbacks = Math.min(
        MIN_REDDIT_TIPS - processedTips.length,
        allFallbacks.length
      );
      
      finalTips = [
        ...processedTips,
        ...allFallbacks.slice(0, neededFallbacks)
      ];
      
      console.log(`📝 Added ${neededFallbacks} strategic fallback tips to reach ${finalTips.length} total tips`);
    } else {
      console.log(`🎉 Found sufficient Reddit tips (${processedTips.length}), no fallbacks needed`);
      finalTips = processedTips.slice(0, 15);
    }

    // Final sort to ensure best tips are first
    finalTips = finalTips.sort((a, b) => {
      if (a.source === 'Trippit' && b.source !== 'Trippit') return 1;
      if (a.source !== 'Trippit' && b.source === 'Trippit') return -1;
      
      const aTotal = (a.relevance_score || 0) + Math.log(a.score + 1) * 4;
      const bTotal = (b.relevance_score || 0) + Math.log(b.score + 1) * 4;
      return bTotal - aTotal;
    });

    console.log(`✅ FINAL RESULT: ${finalTips.length} quality tips for ${city}, ${country}`);
    console.log(`📊 Breakdown: ${finalTips.filter(t => t.source !== 'Trippit').length} Reddit tips, ${finalTips.filter(t => t.source === 'Trippit').length} fallback tips`);

    // Cache the result
    cache.set(cacheKey, {
      data: finalTips,
      timestamp: Date.now()
    });

    return new Response(
      JSON.stringify(finalTips),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 CRITICAL ERROR in get-reddit-tips function:', error);
    
    // Try to extract city/country from error context for fallback
    let fallbackTips: FallbackTip[] = [];
    try {
      const body = await req.json();
      if (body.city && body.country) {
        fallbackTips = generateFallbackTips(body.city, body.country);
      }
    } catch (e) {
      // If we can't even parse the request, return generic error
    }

    if (fallbackTips.length > 0) {
      console.log(`🆘 Returning fallback tips due to error`);
      return new Response(
        JSON.stringify(fallbackTips),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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