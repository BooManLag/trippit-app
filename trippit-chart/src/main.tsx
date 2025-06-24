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
  render: (context) => {
    const webView = useWebView<WebViewMessage, DevvitMessage>({
      url: 'page.html',
      async onMessage(message, webView) {
        if (message.type === 'webViewReady') {
          // Use standard fetch per documentation
          const response = await fetch(
            'https://YOUR_PROJECT.supabase.co/rest/v1/city_visits?select=city,country,trip_count',
            {
              method: 'GET',
              headers: {
                apikey: 'YOUR_SUPABASE_ANON_KEY',
                Authorization: 'Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY',
              },
            }
          );
          const cities = await response.json();

          webView.postMessage({
            type: 'initialCityData',
            data: cities,
          });
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
            🌍 Trippit Travel Chart
          </text>
          <spacer />
          <button onPress={() => webView.mount()}>View Chart</button>
        </vstack>
      </vstack>
    );
  },
});

export default Devvit;
