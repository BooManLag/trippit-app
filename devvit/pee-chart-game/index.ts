import { Devvit } from '@devvit/public-api'
import { PeeChart } from './PeeChart'
import { fetchCityCounts } from './helpers/supabase'

Devvit.configure({
  redditAPI: true,
  http: true,
  kvStore: true
})

Devvit.addCustomPostType({
  name: 'TrippitPeeChart',
  render: async (ctx) => {
    try {
      const rows = await fetchCityCounts(ctx)
      return <PeeChart rows={rows} />
    } catch (error) {
      console.error('Error rendering PeeChart:', error)
      return (
        <vstack padding="medium" gap="medium">
          <text size="large" weight="bold">🌍 Trippit Pee Chart</text>
          <text>Failed to load travel data. Please try again later.</text>
        </vstack>
      )
    }
  }
})

Devvit.addMenuItem({
  label: 'Create / Update Pee Chart',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_evt, ctx) => {
    try {
      // Check if we already have a post ID stored
      const existingPostId = await ctx.kvStore.get<string>('peePost')
      
      // Fetch the latest data
      const rows = await fetchCityCounts(ctx)
      
      if (existingPostId) {
        // Update existing post
        await ctx.reddit.updateCustomPost(existingPostId, () => <PeeChart rows={rows} />)
        ctx.ui.showToast({ text: 'Pee Chart updated!', appearance: 'success' })
      } else {
        // Create new post
        const sub = await ctx.reddit.getCurrentSubreddit()
        const post = await ctx.reddit.submitPost({
          title: '🌍 Trippit Live Pee-Chart',
          subredditName: sub.name,
          preview: <text>Loading…</text>
        })
        
        // Store the post ID for future updates
        await ctx.kvStore.put('peePost', post.id)
        
        // Update the post with the chart
        await ctx.reddit.updateCustomPost(post.id, () => <PeeChart rows={rows} />)
        ctx.ui.showToast({ text: 'Pee Chart created!', appearance: 'success' })
      }
    } catch (error) {
      console.error('Error creating/updating Pee Chart:', error)
      ctx.ui.showToast({ text: 'Failed to create/update Pee Chart', appearance: 'error' })
    }
  }
})

// Add scheduler to refresh the chart periodically
Devvit.addSchedulerJob({
  name: 'refresh_peechart',
  cron: '*/5 * * * *', // Every 5 minutes
  onRun: async (_data, ctx) => {
    try {
      const postId = await ctx.kvStore.get<string>('peePost')
      if (!postId) return
      
      const rows = await fetchCityCounts(ctx)
      await ctx.reddit.updateCustomPost(postId, () => <PeeChart rows={rows} />)
      console.log('Pee Chart refreshed successfully')
    } catch (error) {
      console.error('Error refreshing Pee Chart:', error)
    }
  }
})

// Set up the scheduler when the app is installed
Devvit.addTrigger({
  event: 'AppInstall',
  onEvent: async (_event, ctx) => {
    await ctx.scheduler.runJob({ 
      name: 'refresh_peechart', 
      cron: '*/5 * * * *', 
      data: {} 
    })
  }
})

export default Devvit