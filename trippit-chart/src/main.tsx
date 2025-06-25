import './createPost.js';
import { Devvit } from '@devvit/public-api';

Devvit.configure({
  redditAPI: true,
  http: {
    domains: ['your-project-id.supabase.co'], // Replace with your Supabase domain
  },
});

// Register the pee chart custom post type
Devvit.addCustomPostType({
  name: 'TrippitPeeChart',
  height: 'tall',
  render: (context) => {
    // Use a simple button that opens a URL instead of a WebView
    const handleViewChart = () => {
      context.ui.showToast('Opening chart view...');
      context.reddit.openUrl('https://trippit.me/chart');
    };

    return (
      <vstack grow padding="small">
        <vstack grow alignment="middle center">
          <text size="xlarge" weight="bold">
            🌍 Trippit Pee Chart
          </text>
          <text size="medium" color="secondary">
            Who's peeing where? Live travel tracker
          </text>
          <spacer size="medium" />
          <button onPress={handleViewChart}>View Chart</button>
        </vstack>
      </vstack>
    );
  },
});

// Schedule auto-posts every 5 minutes
Devvit.addSchedulerJob({
  name: 'refresh_peechart',
  onRun: async (data, ctx) => {
    try {
      // Get Supabase URL and key from environment
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase credentials not found in environment');
        return;
      }
      
      const subreddit = await ctx.reddit.getCurrentSubreddit();
      
      // Fetch city data
      const response = await fetch(
        `${supabaseUrl}/rest/v1/city_visits?select=city,country,trip_count&order=trip_count.desc`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      
      const cities = await response.json();
      
      // Get existing post ID
      const existingPostId = await ctx.kvStore.get('peePost');
      
      if (existingPostId) {
        try {
          // Try to update existing post
          await ctx.reddit.editPost({
            id: existingPostId,
            content: (
              <vstack padding="medium" alignment="start">
                <text size="large" weight="bold">
                  🌍 Trippit Pee Chart
                </text>
                <text size="medium">Tracking {cities.length} active cities</text>
                <spacer />
                {cities.slice(0, 5).map((c) => (
                  <text key={`${c.city}-${c.country}`}>
                    🚻 {c.city}, {c.country}: {c.trip_count} trips
                  </text>
                ))}
                <spacer />
                <text size="small" color="secondary">
                  Last updated: {new Date().toLocaleString()}
                </text>
              </vstack>
            ),
          });
          console.log('Updated existing pee chart post');
          return;
        } catch (error) {
          console.error('Failed to update existing post, creating new one:', error);
        }
      }
      
      // Create new post if update failed or no existing post
      const post = await ctx.reddit.submitPost({
        title: `🌍 Trippit Pee Chart Update`,
        subredditName: subreddit.name,
        preview: (
          <vstack padding="medium" alignment="start">
            <text size="large" weight="bold">
              🌍 Trippit Pee Chart
            </text>
            <text size="medium">Tracking {cities.length} active cities</text>
            <spacer />
            {cities.slice(0, 5).map((c) => (
              <text key={`${c.city}-${c.country}`}>
                🚻 {c.city}, {c.country}: {c.trip_count} trips
              </text>
            ))}
            <spacer />
            <text size="small" color="secondary">
              Created: {new Date().toLocaleString()}
            </text>
          </vstack>
        ),
      });
      
      // Store the new post ID
      await ctx.kvStore.put('peePost', post.id);
      console.log('Created new pee chart post');
      
    } catch (err) {
      console.error('Error during scheduled update:', err);
    }
  },
});

// Register initial trigger for scheduler
Devvit.addTrigger({
  event: 'AppInstall',
  onEvent: async (event, ctx) => {
    try {
      await ctx.scheduler.scheduleJob({
        name: 'refresh_peechart',
        cron: '*/5 * * * *',
        data: {},
      });
      console.log('Scheduled pee chart refresh job');
    } catch (err) {
      console.error('Failed to schedule job:', err);
    }
  },
});

export default Devvit;