import './createPost.js';
import { Devvit, useWebView } from '@devvit/public-api';
import type { DevvitMessage, WebViewMessage } from './message.js';

Devvit.configure({
  redditAPI: true,
  http: true, // enables all HTTPS requests; no domain-specific restriction
});

Devvit.addCustomPostType({
  name: 'TrippitPeeChart',
  height: 'tall',
  render: async (context) => {
    const webView = useWebView<WebViewMessage, DevvitMessage>({
      url: 'page.html',
      async onMessage(message, webView) {
        if (message.type === 'webViewReady') {
          try {
            // Fetch city visit data from Supabase
            const response = await context.http.request({
              url: 'https://your-project-id.supabase.co/rest/v1/city_visits?select=city,country,trip_count&order=trip_count.desc',
              method: 'GET',
              headers: { 
                apikey: 'your-anon-key-here',
                Authorization: 'Bearer your-anon-key-here'
              }
            });
            
            if (!response.ok) {
              throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
            }
            
            const cities = await response.json();
            
            webView.postMessage({
              type: 'initialCityData',
              data: cities
            });
          } catch (error) {
            console.error('Error fetching city data:', error);
            // Send mock data as fallback
            webView.postMessage({
              type: 'initialCityData',
              data: [
                { city: 'Paris', country: 'France', trip_count: 12 },
                { city: 'Tokyo', country: 'Japan', trip_count: 8 },
                { city: 'New York', country: 'USA', trip_count: 15 },
                { city: 'London', country: 'UK', trip_count: 10 },
                { city: 'Rome', country: 'Italy', trip_count: 7 }
              ]
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

// Add scheduler to refresh the chart periodically
Devvit.addSchedulerJob({
  name: 'refresh_peechart',
  cron: '*/5 * * * *', // Every 5 minutes
  onRun: async (_data, ctx) => {
    try {
      const postId = await ctx.kvStore.get<string>('peePost');
      if (!postId) return;
      
      // Fetch the latest data
      const response = await ctx.http.request({
        url: 'https://your-project-id.supabase.co/rest/v1/city_visits?select=city,country,trip_count&order=trip_count.desc',
        method: 'GET',
        headers: { 
          apikey: 'your-anon-key-here',
          Authorization: 'Bearer your-anon-key-here'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }
      
      const cities = await response.json();
      
      // Update the post with the latest data
      await ctx.reddit.updateCustomPost(postId, () => {
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
              <text>
                {cities.length > 0 
                  ? `Tracking ${cities.length} destinations` 
                  : 'No travel data available yet'}
              </text>
              <button onPress={() => webView.mount()}>View Chart</button>
            </vstack>
          </vstack>
        );
      });
      
      console.log('Pee Chart refreshed successfully');
    } catch (error) {
      console.error('Error refreshing Pee Chart:', error);
    }
  }
});

// Set up the scheduler when the app is installed
Devvit.addTrigger({
  event: 'AppInstall',
  onEvent: async (_event, ctx) => {
    await ctx.scheduler.runJob({ 
      name: 'refresh_peechart', 
      cron: '*/5 * * * *', 
      data: {} 
    });
  }
});

export default Devvit;