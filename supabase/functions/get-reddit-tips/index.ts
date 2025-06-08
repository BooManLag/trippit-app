const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

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

// Initialize Supabase client with service role key for token access
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Enhanced cache with better key management
const cache = new Map<string, any>();
const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 hours for better caching

// Rate limiting with Reddit header respect
let lastRequestTime = 0;
let remainingRequests = 60;
let resetTime = 0;

// Reddit API credentials from environment variables
const REDDIT_USERNAME = Deno.env.get('REDDIT_USERNAME');
const REDDIT_PASSWORD = Deno.env.get('REDDIT_PASSWORD');
const REDDIT_CLIENT_ID = Deno.env.get('REDDIT_CLIENT_ID');
const REDDIT_CLIENT_SECRET = Deno.env.get('REDDIT_CLIENT_SECRET');

async function ensureValidTokenDirect(): Promise<string | null> {
  try {
    // Check database for valid token
    const { data, error } = await supabase
      .from('tokens')
      .select('access_token, expires_at')
      .eq('service', 'reddit')
      .single();

    if (error) {
      console.log('📭 No stored Reddit token, creating new one...');
      return await createNewRedditToken();
    }

    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    
    // If token is still valid (with 5 minute buffer), use it
    if (expiresAt.getTime() > now.getTime() + (5 * 60 * 1000)) {
      console.log('✅ Using valid stored token');
      return data.access_token;
    }
    
    // Token is expired, create new one (password grant doesn't provide refresh tokens)
    console.log('🔄 Token expired, creating new one...');
    return await createNewRedditToken();
  } catch (error) {
    console.error('❌ Error ensuring valid token:', error);
    return null;
  }
}

async function createNewRedditToken(): Promise<string | null> {
  try {
    console.log('🆕 Creating new Reddit token with password grant...');
    
    // Validate that we have all required credentials
    if (!REDDIT_USERNAME || !REDDIT_PASSWORD || !REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
      console.error('❌ Missing Reddit credentials in environment variables');
      return null;
    }
    
    const auth = btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`);
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('username', REDDIT_USERNAME);
    params.append('password', REDDIT_PASSWORD);
    params.append('scope', 'read');
    // Note: Removed 'duration=permanent' as it's not valid for password grant

    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'web:Trippit:v1.0 (by /u/BooManLagg)',
      },
      body: params.toString(),
    });

    console.log(`📡 Reddit API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Password grant failed: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`📋 Reddit API response:`, {
      hasAccessToken: !!data.access_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
      error: data.error,
      errorDescription: data.error_description
    });

    // Check for API errors
    if (data.error) {
      console.error(`❌ Reddit API error: ${data.error} - ${data.error_description}`);
      return null;
    }

    // Validate that we actually got an access token
    if (!data.access_token) {
      console.error('❌ No access_token in Reddit API response:', data);
      return null;
    }
    
    // Validate expires_in and provide fallback
    let expiresIn = data.expires_in;
    if (!expiresIn || typeof expiresIn !== 'number' || expiresIn <= 0) {
      console.warn('⚠️ Invalid expires_in value, using default 1 hour');
      expiresIn = 3600; // Default to 1 hour
    }
    
    // Calculate expiration time with validation
    const expirationTime = Date.now() + (expiresIn * 1000);
    const expiresAt = new Date(expirationTime);
    
    // Validate the date before converting to ISO string
    if (isNaN(expiresAt.getTime())) {
      console.error('❌ Invalid expiration date calculated');
      return null;
    }
    
    const expiresAtISO = expiresAt.toISOString();
    console.log(`📅 Token will expire at: ${expiresAtISO}`);
    
    // Store the token (no refresh_token for password grant)
    const tokenData = {
      service: 'reddit',
      access_token: data.access_token,
      refresh_token: null, // Password grant doesn't provide refresh tokens
      expires_at: expiresAtISO,
      updated_at: new Date().toISOString()
    };

    console.log('💾 Storing token data:', {
      service: tokenData.service,
      hasAccessToken: !!tokenData.access_token,
      expiresAt: tokenData.expires_at
    });

    const { error } = await supabase
      .from('tokens')
      .upsert(tokenData);

    if (error) {
      console.error('❌ Error storing token:', error);
      return data.access_token; // Still return the token even if storage failed
    }

    console.log(`✅ Token stored successfully`);
    return data.access_token;
  } catch (error) {
    console.error('💥 Error creating new token:', error);
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
  const minDelay = 2000; // 2 seconds minimum between requests
  
  if (timeSinceLastRequest < minDelay) {
    const waitTime = minDelay - timeSinceLastRequest;
    console.log(`⏰ Waiting ${waitTime}ms for rate limit...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // If we're low on requests, wait for reset
  if (remainingRequests < 5 && resetTime > now) {
    const waitTime = Math.min(resetTime - now, 60000); // Max 1 minute wait
    console.log(`⏰ Low on requests (${remainingRequests}), waiting ${waitTime}ms for reset...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

async function fetchTopPostsWithAuth(
  subredditName: string,
  searchQuery: string = '',
  limit: number = 10,
  timeframe: string = 'month'
): Promise<RedditPost[]> {
  const cacheKey = `${subredditName}_${searchQuery}_${limit}_${timeframe}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`📦 Cache hit for ${cacheKey} - returning ${cached.data.length} posts`);
    return cached.data;
  }

  // Wait for rate limit before making request
  await waitForRateLimit();

  // Get valid bearer token
  const bearerToken = await ensureValidTokenDirect();
  
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

  console.log(`🔍 Fetching from ${bearerToken ? 'OAuth' : 'public'} API: r/${subredditName}`);
  
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'web:Trippit:v1.0 (by /u/BooManLagg)',
      'Accept': 'application/json',
    };

    if (bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`;
      console.log('🔑 Using stored bearer token');
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
        const retryAfter = parseInt(response.headers.get('retry-after') || '60', 10);
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
      const hasContent = post.selftext && post.selftext.length >= 20;
      const goodScore = post.score >= 1;
      const notDeleted = !post.selftext.includes('[deleted]') &&
                         !post.selftext.includes('[removed]') &&
                         !post.title.includes('[deleted]') &&
                         !post.title.includes('[removed]');
      const notTooLong = post.selftext.length <= 5000;
      const notBot = !post.author.toLowerCase().includes('bot');
      return hasContent && goodScore && notDeleted && notTooLong && notBot;
    });

    console.log(`✅ Filtered posts from r/${subredditName}: ${posts.length} (from ${rawPosts.length} raw)`);

    // Cache the result for longer
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
  if (countryClean === 'unitedstates') countryVariations.push('usa');
  if (countryClean === 'unitedkingdom') countryVariations.push('uk');
  if (countryClean === 'vietnam') countryVariations.push('vietnam');
  
  locationSubreddits.push(...countryVariations.filter(name => name.length >= 2));
  
  const finalSubreddits = [...baseSubreddits, ...locationSubreddits.slice(0, 1)]; // Reduced to avoid rate limits
  console.log(`🎯 Target subreddits: ${finalSubreddits.join(', ')}`);
  
  return finalSubreddits;
}

function extractTipsFromPost(post: RedditPost, city: string, country: string): any[] {
  const tips = [];
  const content = post.selftext;
  const title = post.title;
  
  console.log(`🔍 Processing post: "${title.substring(0, 60)}..." (${content.length} chars, score: ${post.score})`);
  
  if (!content || content.length < 20) {
    console.log(`  ⚠️ Skipping post - content too short (${content.length} chars)`);
    return [];
  }
  
  // Enhanced tip extraction patterns
  const patterns = [
    /(?:^|\n)\s*(\d+[\.\)]\s*[^\n]{15,300})(?=\n\s*\d+[\.\)]|\n\s*$|\n\n|$)/gm,
    /(?:^|\n)\s*([-\*•]\s*[^\n]{15,300})(?=\n\s*[-\*•]|\n\s*$|\n\n|$)/gm,
    /(?:tip|advice|recommendation|pro tip|lpt):\s*([^\n]{15,300})/gim,
    /([^\n.!?]{20,300}(?:should|must|recommend|suggest|avoid|don't|always|never|best|good|great)[^\n.!?]{10,200}[.!?])/gim
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
          .replace(/^(?:tip|advice|recommendation|pro tip|lpt):\s*/i, '')
          .trim();
        
        if (tipText.length < 15 || tipText.length > 400) continue;
        if (tipText.toLowerCase().includes('edit:')) continue;
        if (tipText.toLowerCase().includes('update:')) continue;
        if (tipText.toLowerCase().includes('deleted')) continue;
        if (tipText.toLowerCase().includes('removed')) continue;
        
        tipText = tipText.replace(/\s+/g, ' ').trim();
        
        // Check if tip mentions the specific location
        const mentionsLocation = checkLocationRelevance(tipText, title, city, country);
        if (!mentionsLocation) {
          console.log(`  ⚠️ Skipping tip - doesn't mention ${city} or ${country}`);
          continue;
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
        if (foundTips >= 2) break;
      }
      
      if (foundTips > 0) break;
    }
  }

  // Fallback for valuable posts - but only if they mention the location
  if (foundTips === 0 && post.score > 3 && content.length > 50 && content.length < 1000) {
    const helpfulKeywords = ['tip', 'advice', 'recommend', 'experience', 'guide', 'helpful', 'must', 'should', 'avoid'];
    const hasHelpfulContent = helpfulKeywords.some(keyword => 
      title.toLowerCase().includes(keyword) || content.toLowerCase().includes(keyword)
    );

    const mentionsLocation = checkLocationRelevance(content, title, city, country);

    if (hasHelpfulContent && mentionsLocation) {
      console.log(`  💡 Using entire post as tip (score: ${post.score}, helpful: ${hasHelpfulContent}, mentions location: ${mentionsLocation})`);
      
      let cleanContent = content.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanContent.length > 250) {
        cleanContent = cleanContent.substring(0, 250) + '...';
      }
      
      tips.push({
        id: post.id,
        category: categorizeTip(title, content),
        title: title.length > 80 ? title.substring(0, 80) + '...' : title,
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
  
  // Check for exact city or country mentions
  const mentionsCity = text.includes(cityLower);
  const mentionsCountry = text.includes(countryLower);
  
  // Also check for common variations
  const cityVariations = [cityLower];
  const countryVariations = [countryLower];
  
  // Add common country variations
  if (countryLower === 'united states') countryVariations.push('usa', 'america', 'us');
  if (countryLower === 'united kingdom') countryVariations.push('uk', 'britain', 'england');
  if (countryLower === 'south korea') countryVariations.push('korea');
  
  const mentionsAnyVariation = [...cityVariations, ...countryVariations].some(variation => 
    text.includes(variation)
  );
  
  return mentionsCity || mentionsCountry || mentionsAnyVariation;
}

function generateTipTitle(content: string, city: string, subreddit: string): string {
  const firstSentence = content.split(/[.!?]/)[0].trim();
  
  if (firstSentence.length > 10 && firstSentence.length < 80) {
    return firstSentence;
  }
  
  const text = content.toLowerCase();
  if (text.includes('food') || text.includes('eat')) return `Food advice for ${city}`;
  if (text.includes('transport') || text.includes('metro')) return `Getting around ${city}`;
  if (text.includes('money') || text.includes('budget')) return `Budget tips for ${city}`;
  if (text.includes('safe') || text.includes('avoid')) return `Safety advice for ${city}`;
  if (text.includes('culture') || text.includes('custom')) return `Cultural tips for ${city}`;
  if (text.includes('hotel') || text.includes('stay')) return `Accommodation advice for ${city}`;
  
  return `Travel tip for ${city}`;
}

function calculateRelevanceScore(content: string, title: string, city: string, country: string): number {
  let score = 0;
  const text = `${title} ${content}`.toLowerCase();
  const cityLower = city.toLowerCase();
  const countryLower = country.toLowerCase();
  
  // Higher score for location mentions
  const cityMentions = (text.match(new RegExp(cityLower, 'g')) || []).length;
  const countryMentions = (text.match(new RegExp(countryLower, 'g')) || []).length;
  score += cityMentions * 20; // City mentions are more valuable
  score += countryMentions * 10;
  
  const helpfulWords = ['tip', 'advice', 'recommend', 'must', 'should', 'avoid', 'best', 'good', 'experience'];
  helpfulWords.forEach(word => {
    if (text.includes(word)) score += 3;
  });
  
  if (content.length > 100) score += 5;
  if (content.length > 200) score += 5;
  
  const actionWords = ['visit', 'try', 'book', 'download', 'bring', 'pack', 'learn'];
  actionWords.forEach(word => {
    if (text.includes(word)) score += 2;
  });
  
  return score;
}

function categorizeTip(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();
  
  if (text.includes('food') || text.includes('eat') || text.includes('restaurant') || text.includes('cuisine') || text.includes('meal')) return 'Food';
  if (text.includes('transport') || text.includes('metro') || text.includes('bus') || text.includes('taxi') || text.includes('uber') || text.includes('train')) return 'Transport';
  if (text.includes('budget') || text.includes('cheap') || text.includes('money') || text.includes('cost') || text.includes('price') || text.includes('expensive')) return 'Budget';
  if (text.includes('safety') || text.includes('safe') || text.includes('scam') || text.includes('dangerous') || text.includes('avoid') || text.includes('careful')) return 'Safety';
  if (text.includes('culture') || text.includes('custom') || text.includes('etiquette') || text.includes('tradition') || text.includes('local')) return 'Culture';
  if (text.includes('attraction') || text.includes('visit') || text.includes('see') || text.includes('museum') || text.includes('temple') || text.includes('tour')) return 'Things to Do';
  if (text.includes('hotel') || text.includes('stay') || text.includes('accommodation') || text.includes('hostel') || text.includes('airbnb')) return 'Accommodation';
  if (text.includes('pack') || text.includes('bring') || text.includes('luggage') || text.includes('clothes') || text.includes('gear')) return 'Packing';
  if (text.includes('health') || text.includes('medical') || text.includes('vaccine') || text.includes('medicine') || text.includes('doctor')) return 'Health';
  if (text.includes('phone') || text.includes('wifi') || text.includes('app') || text.includes('internet') || text.includes('sim')) return 'Technology';
  if (text.includes('document') || text.includes('passport') || text.includes('visa') || text.includes('permit') || text.includes('id')) return 'Documents';
  if (text.includes('plan') || text.includes('itinerary') || text.includes('book') || text.includes('reserve') || text.includes('schedule')) return 'Planning';
  if (text.includes('weather') || text.includes('climate') || text.includes('season') || text.includes('rain') || text.includes('temperature')) return 'Weather';
  
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
      .substring(0, 100);
    
    if (seen.has(normalized)) {
      console.log(`🔄 Skipping duplicate tip: "${tip.content.substring(0, 50)}..."`);
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

function generateFallbackTips(city: string, country: string): any[] {
  const fallbackTips = [
    {
      id: `fallback_${city}_1`,
      category: 'Planning',
      title: `Research ${city} before you go`,
      content: `Learn about local customs, weather patterns, and must-see attractions in ${city}. Check visa requirements and book accommodations in advance.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 10,
      created_at: new Date().toISOString(),
      relevance_score: 50
    },
    {
      id: `fallback_${city}_2`,
      category: 'Budget',
      title: `Money tips for ${city}`,
      content: `Research typical costs in ${city} and notify your bank of travel plans. Consider getting local currency and understanding tipping customs.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 8,
      created_at: new Date().toISOString(),
      relevance_score: 45
    },
    {
      id: `fallback_${city}_3`,
      category: 'Safety',
      title: `Stay safe in ${city}`,
      content: `Keep copies of important documents, stay aware of your surroundings, and research common scams in ${country}. Trust your instincts.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 12,
      created_at: new Date().toISOString(),
      relevance_score: 40
    },
    {
      id: `fallback_${city}_4`,
      category: 'Culture',
      title: `Cultural etiquette in ${city}`,
      content: `Learn basic greetings and cultural norms for ${city}. Understanding local customs will enhance your travel experience and help you connect with locals.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 9,
      created_at: new Date().toISOString(),
      relevance_score: 42
    },
    {
      id: `fallback_${city}_5`,
      category: 'Transport',
      title: `Getting around ${city}`,
      content: `Research public transportation options in ${city}. Download local transport apps and consider getting a transit card for convenience.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 7,
      created_at: new Date().toISOString(),
      relevance_score: 38
    },
    {
      id: `fallback_${city}_6`,
      category: 'Food',
      title: `Local cuisine in ${city}`,
      content: `Try authentic local dishes and visit traditional markets in ${city}. Ask locals for restaurant recommendations to discover hidden gems.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 8,
      created_at: new Date().toISOString(),
      relevance_score: 36
    },
    {
      id: `fallback_${city}_7`,
      category: 'Things to Do',
      title: `Must-see attractions in ${city}`,
      content: `Visit the top landmarks and attractions in ${city}. Consider booking tickets in advance for popular sites to avoid long queues.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 6,
      created_at: new Date().toISOString(),
      relevance_score: 34
    },
    {
      id: `fallback_${city}_8`,
      category: 'Accommodation',
      title: `Where to stay in ${city}`,
      content: `Choose accommodation in ${city} based on your budget and preferred location. Read reviews and check proximity to public transport.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 5,
      created_at: new Date().toISOString(),
      relevance_score: 32
    },
    {
      id: `fallback_${city}_9`,
      category: 'Technology',
      title: `Stay connected in ${city}`,
      content: `Get a local SIM card or international roaming plan for ${city}. Download useful apps like maps, translation, and local transport apps.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 4,
      created_at: new Date().toISOString(),
      relevance_score: 30
    },
    {
      id: `fallback_${city}_10`,
      category: 'Weather',
      title: `Weather and packing for ${city}`,
      content: `Check the weather forecast for ${city} and pack accordingly. Consider the season and any special weather conditions in ${country}.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 3,
      created_at: new Date().toISOString(),
      relevance_score: 28
    }
  ];

  console.log(`🆘 Generated ${fallbackTips.length} fallback tips for ${city}, ${country}`);
  return fallbackTips;
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

    console.log(`🚀 Starting tip search for: ${city}, ${country} with environment-based credentials`);

    // Check cache first with longer duration
    const cacheKey = `tips_${city.toLowerCase()}_${country.toLowerCase()}_v5`;
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

    // Generate search strategy
    const subreddits = await generateOptimizedSubreddits(city, country);
    const searchQueries = [
      `${city} tips`,
      `${city} travel advice`
    ];

    console.log(`🎯 Will search in subreddits: ${subreddits.join(', ')}`);
    console.log(`🔍 Using search queries: ${searchQueries.join(', ')}`);

    // Create sequential fetch strategy to avoid rate limiting
    const allTips = [];
    let successfulFetches = 0;
    let totalPosts = 0;

    // Fetch from travel subreddits first (most reliable)
    for (const subreddit of ['travel', 'solotravel']) {
      try {
        console.log(`🔍 Searching r/${subreddit} for "${city} tips"`);
        const posts = await fetchTopPostsWithAuth(subreddit, `${city} tips`, 5, 'year');
        
        if (posts.length > 0) {
          successfulFetches++;
          totalPosts += posts.length;
          console.log(`✅ Got ${posts.length} posts from r/${subreddit}`);
          
          // Extract tips from each post
          for (const post of posts.slice(0, 2)) {
            const tips = extractTipsFromPost(post, city, country);
            allTips.push(...tips);
          }
        }

        // Add delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
      } catch (error) {
        console.error(`❌ Error fetching from r/${subreddit}:`, error);
      }
    }

    console.log(`📊 SUMMARY: ${successfulFetches} successful fetches, ${totalPosts} total posts, ${allTips.length} raw tips extracted`);

    // Process and filter tips
    let processedTips = deduplicateTips(allTips)
      .filter(tip => {
        const hasGoodLength = tip.content.length >= 20 && tip.content.length <= 500;
        const hasGoodScore = tip.score >= 1;
        const notDeleted = !tip.content.toLowerCase().includes('deleted') &&
                          !tip.content.toLowerCase().includes('removed') &&
                          !tip.title.toLowerCase().includes('[deleted]');
        
        return hasGoodLength && hasGoodScore && notDeleted;
      })
      .sort((a, b) => {
        // Sort by relevance score first, then by recency, then by score
        const aTotal = (a.relevance_score || 0) + Math.log(a.score + 1) * 3;
        const bTotal = (b.relevance_score || 0) + Math.log(b.score + 1) * 3;
        
        if (Math.abs(aTotal - bTotal) < 5) {
          // If relevance scores are close, prefer more recent posts
          const aDate = new Date(a.created_at).getTime();
          const bDate = new Date(b.created_at).getTime();
          return bDate - aDate;
        }
        
        return bTotal - aTotal;
      });

    console.log(`✅ Processed ${processedTips.length} quality Reddit tips for ${city}, ${country}`);

    // Only use fallback tips if we have insufficient Reddit tips
    const MIN_REDDIT_TIPS = 8; // Minimum number of Reddit tips before using fallbacks
    let finalTips = processedTips;

    if (processedTips.length < MIN_REDDIT_TIPS) {
      console.log(`💡 Only ${processedTips.length} Reddit tips found (minimum ${MIN_REDDIT_TIPS}), supplementing with fallbacks`);
      const fallbackTips = generateFallbackTips(city, country);
      
      // Add only enough fallbacks to reach our target
      const neededFallbacks = Math.min(
        MIN_REDDIT_TIPS - processedTips.length,
        fallbackTips.length
      );
      
      finalTips = [
        ...processedTips,
        ...fallbackTips.slice(0, neededFallbacks)
      ];
      
      console.log(`📝 Added ${neededFallbacks} fallback tips to reach ${finalTips.length} total tips`);
    } else {
      console.log(`🎉 Found sufficient Reddit tips (${processedTips.length}), no fallbacks needed`);
      finalTips = processedTips.slice(0, 20); // Limit to top 20 Reddit tips
    }

    // Final sort to ensure best tips are first
    finalTips = finalTips.sort((a, b) => {
      // Prioritize Reddit tips over fallbacks
      if (a.source === 'Trippit' && b.source !== 'Trippit') return 1;
      if (a.source !== 'Trippit' && b.source === 'Trippit') return -1;
      
      // Then sort by relevance and score
      const aTotal = (a.relevance_score || 0) + Math.log(a.score + 1) * 3;
      const bTotal = (b.relevance_score || 0) + Math.log(b.score + 1) * 3;
      return bTotal - aTotal;
    });

    console.log(`✅ FINAL RESULT: ${finalTips.length} quality tips for ${city}, ${country}`);
    console.log(`📊 Breakdown: ${finalTips.filter(t => t.source !== 'Trippit').length} Reddit tips, ${finalTips.filter(t => t.source === 'Trippit').length} fallback tips`);

    // Cache the result with longer duration
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
    let fallbackTips = [];
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