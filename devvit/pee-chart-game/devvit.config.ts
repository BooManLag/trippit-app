import { Devvit } from '@devvit/public-api'

Devvit.configure({
  redditAPI: true,
  http: true,
  kvStore: true,
  redis: false
})

export default Devvit; // required for Devvit CLI
