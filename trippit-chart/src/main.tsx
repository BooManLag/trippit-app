import './createPost.js';
import { Devvit } from '@devvit/public-api';
import type { DevvitMessage, WebViewMessage } from './message.js';

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
    // Use context.ui.showWebView method
    const handleViewChart = () => {
      context.ui.showWebView({
        url: 'page.html',
        onMessage: (message: WebViewMessage) => {
          if (message.type === 'webViewReady') {
            // Fetch data from Supabase
            const fetchData = () => {
              // Get Supabase URL and key from environment
              const supabaseUrl = Deno.env.get('SUPABASE_URL');
              const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
              
              if (!supabaseUrl || !supabaseKey) {
                console.error('Supabase credentials not found in environment');
                // Send fallback data if credentials are missing
                context.ui.postMessage({
                  type: 'initialCityData',
                  data: [
                    { city: 'Paris', country: 'France', trip_count: 12 },
                    { city: 'Tokyo', country: 'Japan', trip_count: 8 },
                    { city: 'New York', country: 'USA', trip_count: 15 },
                    { city: 'London', country: 'UK', trip_count: 10 },
                    { city: 'Rome', country: 'Italy', trip_count: 7 },
                  ],
                });
                return;
              }

              fetch(
                `${supabaseUrl}/rest/v1/city_visits?select=city,country,trip_count&order=trip_count.desc`,
                {
                  headers: {
                    apikey: supabaseKey,
                    Authorization: `Bearer ${supabaseKey}`,
                  },
                }
              )
                .then(response => {
                  if (!response.ok) {
                    throw new Error(`Fetch failed: ${response.statusText}`);
                  }
                  return response.json();
                })
                .then(cities => {
                  context.ui.postMessage({
                    type: 'initialCityData',
                    data: cities,
                  });
                })
                .catch(err => {
                  console.error('Failed to fetch data, sending fallback:', err);
                  context.ui.postMessage({
                    type: 'initialCityData',
                    data: [
                      { city: 'Paris', country: 'France', trip_count: 12 },
                      { city: 'Tokyo', country: 'Japan', trip_count: 8 },
                      { city: 'New York', country: 'USA', trip_count: 15 },
                      { city: 'London', country: 'UK', trip_count: 10 },
                      { city: 'Rome', country: 'Italy', trip_count: 7 },
                    ],
                  });
                });
            };

            fetchData();
          } else {
            console.error(`Unknown message type: ${message.type}`);
          }
        },
        onClose: () => {
          context.ui.showToast('Chart closed');
        },
      });
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
  onRun: (data, ctx) => {
    try {
      // Get Supabase URL and key from environment
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase credentials not found in environment');
        return;
      }
      
      ctx.reddit.getCurrentSubreddit()
        .then(subreddit => {
          return fetch(
            `${supabaseUrl}/rest/v1/city_visits?select=city,country,trip_count&order=trip_count.desc`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
            }
          )
            .then(response => {
              if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.statusText}`);
              }
              return response.json();
            })
            .then(cities => {
              return ctx.reddit.submitPost({
                title: `🌍 Trippit Pee Chart Update`,
                subredditName: subreddit.name,
                preview: (
                  <vstack padding="medium" alignment="start">
                    <text size="large" weight="bold">
                      🌍 Trippit Pee Chart
                    </text>
                    <text size="medium">Tracking {cities.length} active cities</text>
                    <spacer />
                    {cities.slice(0, 5).map((c: { city: string; country: string; trip_count: number }) => (
                      <text key={`${c.city}-${c.country}`}>
                        🚻 {c.city}, {c.country}: {c.trip_count} trips
                      </text>
                    ))}
                  </vstack>
                ),
              });
            });
        })
        .then(() => {
          console.log('Posted pee chart update to subreddit');
        })
        .catch(err => {
          console.error('Error during scheduled update:', err);
        });
    } catch (err) {
      console.error('Error during scheduled update:', err);
    }
  },
});

// Register initial trigger for scheduler
Devvit.addTrigger({
  event: 'AppInstall',
  onEvent: (event, ctx) => {
    ctx.scheduler.runJob({
      name: 'refresh_peechart',
      cron: '*/5 * * * *',
      data: {},
    })
      .catch(err => {
        console.error('Failed to schedule job:', err);
      });
  },
});

export default Devvit;