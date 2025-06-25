import { Devvit } from '@devvit/public-api';

Devvit.addMenuItem({
  label: 'Create Trippit Pee Chart Post',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    try {
      // Check if we already have a post ID stored
      const existingPostId = await context.kvStore.get<string>('peePost');
      
      if (existingPostId) {
        // Check if the post still exists
        try {
          await context.reddit.getPostById(existingPostId);
          context.ui.showToast({ 
            text: 'Pee Chart post already exists! Updating it now...', 
            appearance: 'success' 
          });
          
          // Trigger a refresh
          await context.scheduler.runJob({ 
            name: 'refresh_peechart', 
            cron: '*/5 * * * *', 
            data: {} 
          });
          
          return;
        } catch (error) {
          console.log('Existing post not found, creating a new one');
          // Post doesn't exist anymore, continue to create a new one
        }
      }
      
      // Create new post
      const subreddit = await context.reddit.getCurrentSubreddit();
      const post = await context.reddit.submitPost({
        title: '🌍 Trippit Live Pee-Chart - Who\'s Peeing Where?',
        subredditName: subreddit.name,
        preview: (
          <vstack height="100%" width="100%" alignment="middle center">
            <text size="large">Loading Trippit Pee Chart...</text>
          </vstack>
        ),
      });
      
      // Store the post ID for future updates
      await context.kvStore.put('peePost', post.id);
      
      context.ui.showToast({ 
        text: 'Pee Chart created! It will update every 5 minutes.', 
        appearance: 'success' 
      });
      
      // Trigger an immediate refresh
      await context.scheduler.runJob({ 
        name: 'refresh_peechart', 
        cron: '*/5 * * * *', 
        data: {} 
      });
    } catch (error) {
      console.error('Error creating Pee Chart post:', error);
      context.ui.showToast({ 
        text: 'Failed to create Pee Chart post', 
        appearance: 'neutral' 
      });
    }
  }
});