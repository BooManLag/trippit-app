import { Devvit } from '@devvit/public-api';

Devvit.addMenuItem({
  label: 'Create Trippit Pee Chart Post',
  location: 'subreddit',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({
      title: '🌍 Trippit Pee Chart - Live Travel Tracker',
      subredditName: subreddit.name,
      preview: (
        <vstack height="100%" width="100%" alignment="middle center">
          <text size="large">Loading chart...</text>
        </vstack>
      ),
    });
    ui.showToast({ text: 'Created Trippit chart post!' });
    ui.navigateTo(post);
  },
});
