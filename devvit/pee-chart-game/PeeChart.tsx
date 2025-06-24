import { blocks } from '@devvit/blocks'

export const PeeChart = ({ rows }: { rows: any[] }) => (
  <vstack gap="small" alignment="start">
    <text size="large">🌍 Trippit – Who’s Peeing Where?</text>
    {rows.map(r => {
      const h = Math.min(r.trip_count * 8, 220)
      return (
        <hstack gap="small" alignment="center">
          <text grow>{r.city}, {r.country}</text>
          <vstack height="240" width="24" alignment="bottom">
            <box height={h} width="20" backgroundColor="#FFD700" />
          </vstack>
          <text>{r.trip_count}</text>
        </hstack>
      )
    })}
  </vstack>
)
