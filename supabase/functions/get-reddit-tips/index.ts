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
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

async function fetchTopPosts(
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

  // Try multiple URL formats as fallbacks
  const urlVariants = [];
  
  if (searchQuery) {
    // Primary: API endpoint
    urlVariants.push(
      `https://api.reddit.com/r/${encodeURIComponent(subredditName)}/search?` +
      `q=${encodeURIComponent(searchQuery)}` +
      `&restrict_sr=1&limit=${limit}&sort=relevance&t=${timeframe}`
    );
    
    // Fallback: www endpoint
    urlVariants.push(
      `https://www.reddit.com/r/${encodeURIComponent(subredditName)}/search.json?` +
      `q=${encodeURIComponent(searchQuery)}` +
      `&restrict_sr=on&limit=${limit}&sort=relevance&t=${timeframe}`
    );
  } else {
    // Primary: API endpoint
    urlVariants.push(
      `https://api.reddit.com/r/${encodeURIComponent(subredditName)}/top?` +
      `limit=${limit}&t=${timeframe}`
    );
    
    // Fallback: www endpoint
    urlVariants.push(
      `https://www.reddit.com/r/${encodeURIComponent(subredditName)}/top.json?` +
      `limit=${limit}&t=${timeframe}`
    );
  }

  // Try each URL variant until one works
  for (let i = 0; i < urlVariants.length; i++) {
    const url = urlVariants[i];
    console.log(`🔍 Attempt ${i + 1}: Fetching from ${url}`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'web:Trippit:v1.0 (by /u/BooManLaggg)',
          'Accept': 'application/json',
          // Add additional headers that might help
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
      });

      console.log(`📡 Response status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const json = await response.json();
        console.log(`📊 Raw response structure:`, {
          hasData: !!json.data,
          hasChildren: !!json.data?.children,
          childrenCount: json.data?.children?.length || 0
        });

        if (json.data?.children) {
          const rawPosts: RedditPost[] = (json.data.children as any[]).map((child) => ({
            ...child.data,
            subreddit: subredditName,
          }));

          console.log(`📝 Raw posts from r/${subredditName}: ${rawPosts.length}`);

          // Apply quality filter
          const posts = rawPosts.filter((post) => {
            const hasContent = post.selftext && post.selftext.length >= 20;
            const goodScore  = post.score >= 1;
            const notDeleted = !post.selftext.includes('[deleted]') &&
                               !post.selftext.includes('[removed]') &&
                               !post.title.includes('[deleted]') &&
                               !post.title.includes('[removed]');
            const notTooLong = post.selftext.length <= 5000;
            const notBot     = !post.author.toLowerCase().includes('bot');
            return hasContent && goodScore && notDeleted && notTooLong && notBot;
          });

          console.log(`✅ Filtered posts from r/${subredditName}: ${posts.length} (from ${rawPosts.length} raw)`);

          // Cache and return successful result
          cache.set(cacheKey, { data: posts, timestamp: Date.now() });
          return posts;
        }
      } else if (response.status === 403) {
        console.warn(`🚫 403 Forbidden for ${url} - trying next variant...`);
        continue; // Try next URL variant
      } else if (response.status === 429) {
        console.warn(`⏰ Rate limited for ${url} - waiting and trying next variant...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        continue;
      } else {
        console.warn(`❌ HTTP ${response.status} for ${url} - trying next variant...`);
        continue;
      }
    } catch (err) {
      console.error(`❌ Network error for ${url}:`, err);
      continue; // Try next URL variant
    }
  }

  console.warn(`❌ All URL variants failed for r/${subredditName}`);
  return [];
}

async function generateOptimizedSubreddits(city: string, country: string): Promise<string[]> {
  // Start with proven travel subreddits
  const baseSubreddits = ['travel', 'solotravel', 'backpacking'];
  
  const cityClean = city.toLowerCase().replace(/[^a-z]/g, '');
  const countryClean = country.toLowerCase().replace(/[^a-z]/g, '');
  
  console.log(`🔹 Cleaned names: cityClean="${cityClean}", countryClean="${countryClean}"`);
  
  // Add location-specific subreddits
  const locationSubreddits = [];
  
  // Add city subreddit if it's long enough
  if (cityClean.length >= 3) {
    locationSubreddits.push(cityClean);
  }
  
  // Add country variations
  const countryVariations = [countryClean];
  if (countryClean === 'unitedstates') countryVariations.push('usa');
  if (countryClean === 'unitedkingdom') countryVariations.push('uk');
  if (countryClean === 'vietnam') countryVariations.push('vietnam');
  
  locationSubreddits.push(...countryVariations.filter(name => name.length >= 2));
  
  const finalSubreddits = [...baseSubreddits, ...locationSubreddits.slice(0, 2)];
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
    // Numbered lists (1. 2. 3.)
    /(?:^|\n)\s*(\d+[\.\)]\s*[^\n]{15,300})(?=\n\s*\d+[\.\)]|\n\s*$|\n\n|$)/gm,
    // Bullet points (- * •)
    /(?:^|\n)\s*([-\*•]\s*[^\n]{15,300})(?=\n\s*[-\*•]|\n\s*$|\n\n|$)/gm,
    // Explicit tips/advice
    /(?:tip|advice|recommendation|pro tip|lpt):\s*([^\n]{15,300})/gim,
    // Sentences with helpful keywords
    /([^\n.!?]{20,300}(?:should|must|recommend|suggest|avoid|don't|always|never|best|good|great)[^\n.!?]{10,200}[.!?])/gim
  ];

  let foundTips = 0;
  
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`  📝 Found ${matches.length} matches with pattern`);
      
      for (const match of matches.slice(0, 2)) { // Max 2 per pattern
        let tipText = match.trim()
          .replace(/^\d+[\.\)]\s*/, '')
          .replace(/^[-\*•]\s*/, '')
          .replace(/^(?:tip|advice|recommendation|pro tip|lpt):\s*/i, '')
          .trim();
        
        // Quality checks
        if (tipText.length < 15 || tipText.length > 400) continue;
        if (tipText.toLowerCase().includes('edit:')) continue;
        if (tipText.toLowerCase().includes('update:')) continue;
        if (tipText.toLowerCase().includes('deleted')) continue;
        if (tipText.toLowerCase().includes('removed')) continue;
        
        // Clean up the tip text
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
        if (foundTips >= 2) break; // Max 2 tips per post
      }
      
      if (foundTips > 0) break; // If we found tips, don't try other patterns
    }
  }

  // More lenient fallback: if no structured tips found but post seems valuable
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
  
  // Generate based on content keywords
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
  
  // City mentions
  const cityMentions = (text.match(new RegExp(cityLower, 'g')) || []).length;
  score += cityMentions * 15;
  
  // Helpful keywords
  const helpfulWords = ['tip', 'advice', 'recommend', 'must', 'should', 'avoid', 'best', 'good', 'experience'];
  helpfulWords.forEach(word => {
    if (text.includes(word)) score += 3;
  });
  
  // Length bonus (longer content often more valuable)
  if (content.length > 100) score += 5;
  if (content.length > 200) score += 5;
  
  // Specific action words
  const actionWords = ['visit', 'try', 'book', 'download', 'bring', 'pack', 'learn'];
  actionWords.forEach(word => {
    if (text.includes(word)) score += 2;
  });
  
  return score;
}

function categorizeTip(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();
  
  // More specific categorization
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
    // Create a more robust fingerprint
    const normalized = tip.content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100); // Longer fingerprint for better deduplication
    
    if (seen.has(normalized)) {
      console.log(`🔄 Skipping duplicate tip: "${tip.content.substring(0, 50)}..."`);
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

// Fallback function to generate basic tips if Reddit fails completely
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

    console.log(`🚀 Starting tip search for: ${city}, ${country}`);

    // Check cache first
    const cacheKey = `tips_${city.toLowerCase()}_${country.toLowerCase()}`;
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
      `${city} travel`,
      `visiting ${city}`
    ];

    console.log(`🎯 Will search in subreddits: ${subreddits.join(', ')}`);
    console.log(`🔍 Using search queries: ${searchQueries.join(', ')}`);

    // Create fetch promises with better distribution
    const fetchPromises: Promise<RedditPost[]>[] = [];

    // Search in travel subreddits with city-specific queries
    for (const subreddit of ['travel', 'solotravel']) {
      for (const query of searchQueries.slice(0, 2)) {
        fetchPromises.push(fetchTopPosts(subreddit, query, 8, 'year'));
      }
    }

    // Search in location-specific subreddits
    const locationSubreddits = subreddits.filter(s => !['travel', 'solotravel', 'backpacking'].includes(s));
    for (const subreddit of locationSubreddits.slice(0, 2)) {
      fetchPromises.push(fetchTopPosts(subreddit, '', 10, 'year'));
    }

    console.log(`📡 Created ${fetchPromises.length} fetch requests`);

    // Execute all fetches with timeout
    const results = await Promise.allSettled(
      fetchPromises.map(promise => 
        Promise.race([
          promise,
          new Promise<RedditPost[]>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 12000)
          )
        ])
      )
    );

    // Process results
    const allTips = [];
    let successfulFetches = 0;
    let totalPosts = 0;
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        const posts = result.value;
        successfulFetches++;
        totalPosts += posts.length;
        console.log(`✅ Fetch ${i + 1}: Got ${posts.length} posts`);
        
        // Extract tips from each post
        for (const post of posts.slice(0, 3)) { // Top 3 posts per fetch
          const tips = extractTipsFromPost(post, city);
          allTips.push(...tips);
        }
      } else {
        console.log(`❌ Fetch ${i + 1} failed: ${result.reason}`);
      }
    }

    console.log(`📊 SUMMARY: ${successfulFetches}/${results.length} successful fetches, ${totalPosts} total posts, ${allTips.length} raw tips extracted`);

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
      .slice(0, 30);

    // If we got very few tips from Reddit, supplement with fallback tips
    if (processedTips.length < 3) {
      console.log(`⚠️ Only got ${processedTips.length} tips from Reddit, adding fallback tips`);
      const fallbackTips = generateFallbackTips(city, country);
      processedTips = [...processedTips, ...fallbackTips].slice(0, 30);
    }

    console.log(`✅ FINAL RESULT: ${processedTips.length} quality tips for ${city}, ${country}`);

    // Cache the result
    cache.set(cacheKey, {
      data: processedTips,
      timestamp: Date.now()
    });

    return new Response(
      JSON.stringify(processedTips),
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