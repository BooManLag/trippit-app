import './createPost.js';
import { Devvit, useWebView } from '@devvit/public-api';
import type { DevvitMessage, WebViewMessage } from './message.js';

Devvit.configure({
  redditAPI: true,
  http: {
    domains: ['your-project-id.supabase.co'], // replace with your actual Supabase domain
  },
});

// Register the pee chart custom post type
Devvit.addCustomPostType({
  name: 'TrippitPeeChart',
  height: 'tall',
  render: async (context) => {
    const webView = useWebView<WebViewMessage, DevvitMessage>({
      url: 'page.html',

      async onMessage(message, webView) {
        if (message.type === 'webViewReady') {
          try {
            const response = await fetch(
              'https://your-project-id.supabase.co/rest/v1/city_visits?select=city,country,trip_count&order=trip_count.desc',
              {
                headers: {
                  apikey: 'your-anon-key-here',
                  Authorization: 'Bearer your-anon-key-here',
                },
              }
            );

            if (!response.ok) {
              throw new Error(`Fetch failed: ${response.statusText}`);
            }

            const cities = await response.json();

            webView.postMessage({
              type: 'initialCityData',
              data: cities,
            });
          } catch (err) {
            console.error('Failed to fetch data, sending fallback:', err);
            webView.postMessage({
              type: 'initialCityData',
              data: [
                { city: 'Paris', country: 'France', trip_count: 12 },
                { city: 'Tokyo', country: 'Japan', trip_count: 8 },
                { city: 'New York', country: 'USA', trip_count: 15 },
                { city: 'London', country: 'UK', trip_count: 10 },
                { city: 'Rome', country: 'Italy', trip_count: 7 },
              ],
            });
          }
        } else {
          throw new Error(`Unknown message type: ${message.type}`);
        }
      },

      onUnmount() {
        context.ui.showToast('Chart closed');
      },
    });

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
          <button onPress={() => webView.mount()}>View Chart</button>
        </vstack>
      </vstack>
    );
  },
});

// Schedule auto-posts every 5 minutes
Devvit.addSchedulerJob({
  name: 'refresh_peechart',
  onRun: async (_data, ctx) => {
    try {
      const subreddit = await ctx.reddit.getCurrentSubreddit();

      const response = await fetch(
        'https://your-project-id.supabase.co/rest/v1/city_visits?select=city,country,trip_count&order=trip_count.desc',
        {
          headers: {
            apikey: 'your-anon-key-here',
            Authorization: 'Bearer your-anon-key-here',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const cities = await response.json();

      await ctx.reddit.submitPost({
        title: `🌍 Trippit Pee Chart Update`,
        subredditName: subreddit.name,
        preview: (
          <vstack padding="medium" alignment="start">
            <text size="large" weight="bold">
              🌍 Trippit Pee Chart
            </text>
            <text size="medium">Tracking {cities.length} active cities</text>
            <spacer />
            {cities.slice(0, 5).map((c: { city: Devvit.StringChild | Devvit.StringChild[] | undefined; country: Devvit.StringChild | Devvit.StringChild[] | undefined; trip_count: Devvit.StringChild | Devvit.StringChild[] | undefined; }) => (
              <text key={`${c.city ?? ''}-${c.country ?? ''}`}>
                🚻 {c.city ?? ''}, {c.country ?? ''}: {c.trip_count ?? ''} trips
              </text>
            ))}
          </vstack>
        ),
      });

      console.log('Posted pee chart update to subreddit');
    } catch (err) {
      console.error('Error during scheduled update:', err);
    }
  },
});

// Register initial trigger for scheduler
Devvit.addTrigger({
  event: 'AppInstall',
  onEvent: async (_event, ctx) => {
    await ctx.scheduler.runJob({
      name: 'refresh_peechart',
      cron: '*/5 * * * *',
      data: {},
    });
  },
});

export default Devvit;
