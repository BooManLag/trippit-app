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
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour for better caching

// Rate limiting tracker
const rateLimitTracker = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 10;

function isRateLimited(): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Clean old entries
  for (const [timestamp] of rateLimitTracker) {
    if (parseInt(timestamp) < windowStart) {
      rateLimitTracker.delete(timestamp);
    }
  }
  
  // Check if we're over the limit
  return rateLimitTracker.size >= MAX_REQUESTS_PER_MINUTE;
}

function recordRequest(): void {
  rateLimitTracker.set(Date.now().toString(), 1);
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

  // Check rate limiting
  if (isRateLimited()) {
    console.warn(`⏰ Rate limited, skipping request to r/${subredditName}`);
    return [];
  }

  // Get bearer token from environment
  const bearerToken = Deno.env.get('REDDIT_BEARER_TOKEN');
  
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
    // Record this request for rate limiting
    recordRequest();

    const headers: Record<string, string> = {
      'User-Agent': 'web:Trippit:v1.0 (by /u/BooManLaggg)',
      'Accept': 'application/json',
    };

    if (bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`;
      console.log('🔑 Using bearer token from environment');
    } else {
      console.log('ℹ️ No bearer token found, using public API with strict rate limiting');
    }

    const response = await fetch(url, { headers });

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      if (response.status === 401 && bearerToken) {
        console.warn(`🔑 Bearer token expired or invalid for r/${subredditName}`);
        return [];
      }
      if (response.status === 429) {
        console.warn(`⏰ Rate limited for r/${subredditName} - backing off`);
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

function extractTipsFromPost(post: RedditPost, city: string): any[] {
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
        
        tips.push({
          id: `${post.id}_tip_${foundTips}`,
          category: categorizeTip(title, tipText),
          title: generateTipTitle(tipText, city, post.subreddit),
          content: tipText,
          source: `r/${post.subreddit}`,
          reddit_url: `https://reddit.com${post.permalink}`,
          score: post.score,
          created_at: new Date(post.created_utc * 1000).toISOString(),
          relevance_score: calculateRelevanceScore(tipText, title, city)
        });
        
        foundTips++;
        if (foundTips >= 2) break;
      }
      
      if (foundTips > 0) break;
    }
  }

  // Fallback for valuable posts
  if (foundTips === 0 && post.score > 3 && content.length > 50 && content.length < 1000) {
    const helpfulKeywords = ['tip', 'advice', 'recommend', 'experience', 'guide', 'helpful', 'must', 'should', 'avoid'];
    const hasHelpfulContent = helpfulKeywords.some(keyword => 
      title.toLowerCase().includes(keyword) || content.toLowerCase().includes(keyword)
    );

    const cityMentioned = title.toLowerCase().includes(city.toLowerCase()) || 
                         content.toLowerCase().includes(city.toLowerCase());

    if (hasHelpfulContent || cityMentioned) {
      console.log(`  💡 Using entire post as tip (score: ${post.score}, helpful: ${hasHelpfulContent}, city mentioned: ${cityMentioned})`);
      
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
        relevance_score: calculateRelevanceScore(content, title, city)
      });
    }
  }

  console.log(`  ✅ Extracted ${tips.length} tips from post`);
  return tips;
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

function calculateRelevanceScore(content: string, title: string, city: string): number {
  let score = 0;
  const text = `${title} ${content}`.toLowerCase();
  const cityLower = city.toLowerCase();
  
  const cityMentions = (text.match(new RegExp(cityLower, 'g')) || []).length;
  score += cityMentions * 15;
  
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

    // Check for Reddit bearer token in environment
    const bearerToken = Deno.env.get('REDDIT_BEARER_TOKEN');
    
    if (bearerToken) {
      console.log(`🔑 Using Reddit bearer token from environment for enhanced access`);
    } else {
      console.log('ℹ️ No Reddit bearer token in environment, using public API with strict rate limiting');
    }

    console.log(`🚀 Starting tip search for: ${city}, ${country} ${bearerToken ? '(authenticated)' : '(public)'}`);

    // Check cache first with longer duration
    const cacheKey = `tips_${city.toLowerCase()}_${country.toLowerCase()}_${bearerToken ? 'auth' : 'public'}`;
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
      if (isRateLimited()) {
        console.log(`⏰ Rate limited, skipping remaining requests`);
        break;
      }

      try {
        console.log(`🔍 Searching r/${subreddit} for "${city} tips"`);
        const posts = await fetchTopPostsWithAuth(subreddit, `${city} tips`, 5, 'year');
        
        if (posts.length > 0) {
          successfulFetches++;
          totalPosts += posts.length;
          console.log(`✅ Got ${posts.length} posts from r/${subreddit}`);
          
          // Extract tips from each post
          for (const post of posts.slice(0, 2)) {
            const tips = extractTipsFromPost(post, city);
            allTips.push(...tips);
          }
        }

        // Add delay between requests to avoid rate limiting
        if (!bearerToken) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay for public API
        }
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
        const aTotal = (a.relevance_score || 0) + Math.log(a.score + 1) * 3;
        const bTotal = (b.relevance_score || 0) + Math.log(b.score + 1) * 3;
        return bTotal - aTotal;
      })
      .slice(0, 15); // Reduced to focus on quality

    // Always supplement with fallback tips for reliability
    console.log(`💡 Adding fallback tips to ensure good user experience`);
    const fallbackTips = generateFallbackTips(city, country);
    
    // Merge tips, prioritizing Reddit tips but ensuring we have good coverage
    const finalTips = [...processedTips, ...fallbackTips]
      .slice(0, 20)
      .sort((a, b) => {
        // Prioritize Reddit tips but mix in fallbacks
        if (a.source === 'Trippit' && b.source !== 'Trippit') return 1;
        if (a.source !== 'Trippit' && b.source === 'Trippit') return -1;
        return b.score - a.score;
      });

    console.log(`✅ FINAL RESULT: ${finalTips.length} quality tips for ${city}, ${country} (${processedTips.length} from Reddit, ${fallbackTips.length} fallback)`);

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