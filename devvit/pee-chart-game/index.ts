import Devvit from './devvit.config'
import { PeeChart } from './PeeChart'
import { fetchCityCounts } from './helpers/supabase'

Devvit.addCustomPostType({
  name: 'TrippitPeeChart',
  render: async (ctx) => {
    const rows = await fetchCityCounts(ctx)
    return <PeeChart rows={rows} />
  }
})

Devvit.addMenuItem({
  label: 'Create / Update Pee Chart',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_evt, ctx) => {
    const id = await ctx.kvStore.get<string>('peePost')
    const rows = await fetchCityCounts(ctx)
    if (id) {
      await ctx.utils.updateCustomPost(ctx, id, () => <PeeChart rows={rows} />)
      ctx.ui.showToast({ text: 'Chart updated!', appearance: 'success' })
    } else {
      const sub = await ctx.reddit.getCurrentSubreddit()
      const post = await ctx.reddit.submitPost({
        title: '🌍 Trippit Live Pee-Chart',
        subredditName: sub.name,
        preview: <text>Loading…</text>
      })
      await ctx.kvStore.put('peePost', post.id)
      await ctx.utils.updateCustomPost(ctx, post.id, () => <PeeChart rows={rows} />)
      ctx.ui.showToast({ text: 'Chart created!', appearance: 'success' })
    }
  }
})

Devvit.addSchedulerJob({
  name: 'refresh_peechart',
  cron: '*/5 * * * *',
  onRun: async (_d, ctx) => {
    const id = await ctx.kvStore.get<string>('peePost')
    if (!id) return
    const rows = await fetchCityCounts(ctx)
    await ctx.utils.updateCustomPost(ctx, id, () => <PeeChart rows={rows} />)
  }
})

Devvit.addTrigger({
  event: 'AppInstall',
  onEvent: async (_e, ctx) => {
    await ctx.scheduler.runJob({ name: 'refresh_peechart', cron: '*/5 * * * *', data: {} })
  }
})

export default Devvit
