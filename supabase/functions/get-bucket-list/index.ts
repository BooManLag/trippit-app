const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  permalink: string;
  score: number;
  created_utc: number;
  subreddit: string;
}

interface BucketListItem {
  id: string;
  destination: string;
  city: string;
  country: string;
  title: string;
  description: string;
  category: string;
  difficulty_level: string;
  estimated_cost: string;
  source: string;
  reddit_url: string;
  score: number;
  created_at: string;
}

// Enhanced cache with better key management
const cache = new Map<string, any>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

async function fetchRedditRecommendations(city: string, country: string): Promise<BucketListItem[]> {
  const cacheKey = `bucket_${city.toLowerCase()}_${country.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`📦 Cache hit for bucket list: ${city}, ${country}`);
    return cached.data;
  }

  console.log(`🔍 Fetching bucket list recommendations for: ${city}, ${country}`);

  const bearerToken = Deno.env.get('REDDIT_BEARER_TOKEN');
  const baseUrl = bearerToken ? 'https://oauth.reddit.com' : 'https://api.reddit.com';
  
  const searchQueries = [
    `${city} must do`,
    `${city} bucket list`,
    `things to do ${city}`,
    `${city} recommendations`,
    `visiting ${city}`
  ];

  const subreddits = ['travel', 'solotravel', city.toLowerCase().replace(/[^a-z]/g, '')];
  
  const bucketItems: BucketListItem[] = [];
  
  try {
    // Search for bucket list recommendations
    for (const subreddit of subreddits.slice(0, 2)) {
      for (const query of searchQueries.slice(0, 2)) {
        try {
          const url = `${baseUrl}/r/${subreddit}/search?q=${encodeURIComponent(query)}&restrict_sr=1&limit=5&sort=relevance&t=year`;
          
          const headers: Record<string, string> = {
            'User-Agent': 'web:Trippit:v1.0 (by /u/BooManLaggg)',
            'Accept': 'application/json',
          };

          if (bearerToken) {
            headers['Authorization'] = `Bearer ${bearerToken}`;
          }

          const response = await fetch(url, { headers });
          
          if (!response.ok) continue;
          
          const json = await response.json();
          const posts = json.data?.children || [];
          
          for (const postData of posts.slice(0, 3)) {
            const post: RedditPost = postData.data;
            const extractedItems = extractBucketListItems(post, city, country);
            bucketItems.push(...extractedItems);
          }
        } catch (error) {
          console.error(`Error fetching from r/${subreddit}:`, error);
        }
      }
    }

    // Deduplicate and sort
    const uniqueItems = deduplicateBucketItems(bucketItems);
    const sortedItems = uniqueItems
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // If we got very few items, supplement with defaults
    if (sortedItems.length < 3) {
      const defaultItems = generateDefaultBucketList(city, country);
      sortedItems.push(...defaultItems);
    }

    // Cache the result
    cache.set(cacheKey, {
      data: sortedItems.slice(0, 10),
      timestamp: Date.now()
    });

    console.log(`✅ Generated ${sortedItems.length} bucket list items for ${city}, ${country}`);
    return sortedItems.slice(0, 10);

  } catch (error) {
    console.error('Error fetching bucket list recommendations:', error);
    return generateDefaultBucketList(city, country);
  }
}

function extractBucketListItems(post: RedditPost, city: string, country: string): BucketListItem[] {
  const items: BucketListItem[] = [];
  const content = `${post.title} ${post.selftext}`.toLowerCase();
  
  // Look for bucket list patterns
  const patterns = [
    /(?:must|should|need to|have to|don't miss)\s+([^.!?\n]{10,100})/gi,
    /(?:visit|see|try|experience|go to)\s+([^.!?\n]{10,100})/gi,
    /(?:\d+[\.\)]\s*)([^.!?\n]{15,100})/gi,
    /(?:[-\*•]\s*)([^.!?\n]{15,100})/gi
  ];

  let itemCount = 0;
  for (const pattern of patterns) {
    const matches = post.selftext.match(pattern);
    if (matches && itemCount < 3) {
      for (const match of matches.slice(0, 2)) {
        let cleanText = match.trim()
          .replace(/^\d+[\.\)]\s*/, '')
          .replace(/^[-\*•]\s*/, '')
          .replace(/^(?:must|should|need to|have to|don't miss|visit|see|try|experience|go to)\s*/i, '')
          .trim();

        if (cleanText.length < 10 || cleanText.length > 150) continue;
        if (cleanText.toLowerCase().includes('edit:')) continue;
        if (cleanText.toLowerCase().includes('deleted')) continue;

        const category = categorizeBucketItem(cleanText);
        const difficulty = assessDifficulty(cleanText);
        const cost = estimateCost(cleanText);

        items.push({
          id: `reddit_${post.id}_${itemCount}`,
          destination: `${city}, ${country}`,
          city,
          country,
          title: generateBucketTitle(cleanText, city),
          description: cleanText,
          category,
          difficulty_level: difficulty,
          estimated_cost: cost,
          source: `r/${post.subreddit}`,
          reddit_url: `https://reddit.com${post.permalink}`,
          score: post.score,
          created_at: new Date(post.created_utc * 1000).toISOString()
        });

        itemCount++;
        if (itemCount >= 3) break;
      }
    }
    if (itemCount >= 3) break;
  }

  return items;
}

function categorizeBucketItem(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('food') || lowerText.includes('eat') || lowerText.includes('restaurant') || lowerText.includes('drink') || lowerText.includes('coffee') || lowerText.includes('bar')) return 'Food & Drink';
  if (lowerText.includes('museum') || lowerText.includes('art') || lowerText.includes('culture') || lowerText.includes('temple') || lowerText.includes('church') || lowerText.includes('history')) return 'Culture';
  if (lowerText.includes('view') || lowerText.includes('tower') || lowerText.includes('bridge') || lowerText.includes('park') || lowerText.includes('garden') || lowerText.includes('monument')) return 'Sightseeing';
  if (lowerText.includes('hike') || lowerText.includes('climb') || lowerText.includes('walk') || lowerText.includes('bike') || lowerText.includes('sport') || lowerText.includes('adventure')) return 'Adventure';
  if (lowerText.includes('shop') || lowerText.includes('market') || lowerText.includes('buy') || lowerText.includes('souvenir')) return 'Shopping';
  if (lowerText.includes('night') || lowerText.includes('club') || lowerText.includes('party') || lowerText.includes('music') || lowerText.includes('show')) return 'Nightlife';
  if (lowerText.includes('beach') || lowerText.includes('water') || lowerText.includes('swim') || lowerText.includes('boat') || lowerText.includes('cruise')) return 'Nature';
  if (lowerText.includes('hotel') || lowerText.includes('stay') || lowerText.includes('sleep') || lowerText.includes('accommodation')) return 'Accommodation';
  
  return 'Experience';
}

function assessDifficulty(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('climb') || lowerText.includes('hike') || lowerText.includes('difficult') || lowerText.includes('challenging') || lowerText.includes('extreme')) return 'Hard';
  if (lowerText.includes('book') || lowerText.includes('reserve') || lowerText.includes('plan') || lowerText.includes('organize') || lowerText.includes('tour')) return 'Medium';
  
  return 'Easy';
}

function estimateCost(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('expensive') || lowerText.includes('luxury') || lowerText.includes('premium') || lowerText.includes('fine dining') || lowerText.includes('michelin')) return 'Expensive';
  if (lowerText.includes('cheap') || lowerText.includes('budget') || lowerText.includes('affordable') || lowerText.includes('free') || lowerText.includes('no cost')) return 'Free';
  
  return 'Budget';
}

function generateBucketTitle(text: string, city: string): string {
  // Try to extract a concise title from the text
  const firstPart = text.split(/[,;]/)[0].trim();
  if (firstPart.length > 5 && firstPart.length < 60) {
    return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
  }
  
  // Generate based on content
  const lowerText = text.toLowerCase();
  if (lowerText.includes('food') || lowerText.includes('eat')) return `Try local cuisine in ${city}`;
  if (lowerText.includes('view') || lowerText.includes('tower')) return `Get the best views in ${city}`;
  if (lowerText.includes('walk') || lowerText.includes('explore')) return `Explore ${city} on foot`;
  if (lowerText.includes('museum') || lowerText.includes('art')) return `Visit cultural sites in ${city}`;
  
  return `Experience ${city} like a local`;
}

function deduplicateBucketItems(items: BucketListItem[]): BucketListItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const normalized = item.title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function generateDefaultBucketList(city: string, country: string): BucketListItem[] {
  const defaults = [
    {
      title: `Explore ${city}'s historic center`,
      description: `Walk through the historic heart of ${city} and discover its architectural gems`,
      category: 'Sightseeing',
      difficulty_level: 'Easy',
      estimated_cost: 'Free'
    },
    {
      title: `Try authentic local cuisine`,
      description: `Sample traditional dishes that ${city} is famous for`,
      category: 'Food & Drink',
      difficulty_level: 'Easy',
      estimated_cost: 'Budget'
    },
    {
      title: `Visit a local market`,
      description: `Experience the vibrant atmosphere of ${city}'s local markets`,
      category: 'Culture',
      difficulty_level: 'Easy',
      estimated_cost: 'Free'
    },
    {
      title: `Take photos at iconic landmarks`,
      description: `Capture memories at ${city}'s most recognizable spots`,
      category: 'Sightseeing',
      difficulty_level: 'Easy',
      estimated_cost: 'Free'
    },
    {
      title: `Learn basic local phrases`,
      description: `Connect with locals by learning key phrases in the local language`,
      category: 'Culture',
      difficulty_level: 'Medium',
      estimated_cost: 'Free'
    }
  ];

  return defaults.map((item, index) => ({
    id: `default_${city}_${index}`,
    destination: `${city}, ${country}`,
    city,
    country,
    title: item.title,
    description: item.description,
    category: item.category,
    difficulty_level: item.difficulty_level,
    estimated_cost: item.estimated_cost,
    source: 'Trippit',
    reddit_url: '#',
    score: 5,
    created_at: new Date().toISOString()
  }));
}

Deno.serve(async (req) => {
  console.log('🎯 INCOMING REQUEST to /get-bucket-list');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { city, country } = body;
    
    if (!city || !country) {
      return new Response(
        JSON.stringify({ error: 'City and country are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🎯 Generating bucket list for: ${city}, ${country}`);
    
    const bucketItems = await fetchRedditRecommendations(city, country);
    
    return new Response(
      JSON.stringify(bucketItems),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 Error in get-bucket-list function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch bucket list',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});