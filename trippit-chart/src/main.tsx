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
              url: 'https://your-project-id.supabase.co/rest/v1/city_visits?select=city,country,trip_count',
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

export default Devvit;