import { blocks } from '@devvit/blocks'

interface PeeChartProps {
  rows: Array<{city: string, country: string, trip_count: number}>
}

export const PeeChart = ({ rows }: PeeChartProps) => {
  // Sort rows by trip count (descending)
  const sortedRows = [...rows].sort((a, b) => b.trip_count - a.trip_count)
  
  // Find maximum trip count for scaling
  const maxCount = Math.max(...sortedRows.map(row => row.trip_count), 1)
  
  return (
    <vstack gap="medium" padding="medium">
      <text size="xlarge" weight="bold">🌍 Trippit – Who's Peeing Where?</text>
      <text size="medium" color="secondary">Live travel tracker showing where users are starting their adventures</text>
      
      {sortedRows.length === 0 ? (
        <text>No travel data available yet</text>
      ) : (
        <vstack gap="medium">
          {sortedRows.map((row, index) => {
            // Calculate height based on trip count (max height 220px)
            const heightPercentage = (row.trip_count / maxCount) * 100
            const barHeight = Math.min(Math.max(heightPercentage * 2, 20), 220)
            
            // Generate a consistent color based on city name
            const hue = (index * 30) % 360
            
            return (
              <hstack key={`${row.city}-${row.country}`} gap="medium" alignment="center">
                <text grow>{row.city}, {row.country}</text>
                <vstack height="240" width="40" alignment="bottom">
                  {/* Person icon */}
                  <vstack height="20" width="20" position="absolute" top={240 - barHeight - 20}>
                    <box height="8" width="8" cornerRadius="4" backgroundColor="#6b7280" />
                    <box height="12" width="4" backgroundColor="#6b7280" />
                  </vstack>
                  
                  {/* Pee stream */}
                  <box 
                    height={barHeight} 
                    width="2" 
                    backgroundColor={`hsl(${hue}, 70%, 60%)`} 
                    opacity="0.7"
                  />
                  
                  {/* Puddle */}
                  <box 
                    height="4" 
                    width={Math.max(20, row.trip_count * 3)} 
                    cornerRadius="2"
                    backgroundColor={`hsl(${hue}, 70%, 60%)`}
                    opacity="0.8"
                  />
                </vstack>
                <text width="30" alignment="center" weight="bold">{row.trip_count}</text>
              </hstack>
            )
          })}
        </vstack>
      )}
      
      <text size="small" color="tertiary">
        Data updates in real-time as new trips are created
      </text>
    </vstack>
  )
}