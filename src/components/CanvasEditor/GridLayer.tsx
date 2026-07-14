import { Line } from 'react-konva'
import { GridEngine } from '@/core/grid/GridEngine'
import type { GridConfig } from '@/types/grid'

interface GridLayerProps {
  width: number
  height: number
  grid: GridConfig
  zoom: number
}

/** Document grid overlay — owned by GridEngine; never part of EkoDocument. */
export function GridLayer({ width, height, grid, zoom }: GridLayerProps) {
  if (!grid.enabled || !grid.visible) return null

  const model = GridEngine.build(width, height, grid, zoom)

  return (
    <>
      {model.lines.map((line, index) =>
        line.orientation === 'vertical' ? (
          <Line
            key={`gv-${line.position}-${index}`}
            points={[line.position, 0, line.position, height]}
            stroke={line.major ? grid.color : grid.subdivisionColor}
            strokeWidth={line.major ? 1 : 0.5}
            listening={false}
          />
        ) : (
          <Line
            key={`gh-${line.position}-${index}`}
            points={[0, line.position, width, line.position]}
            stroke={line.major ? grid.color : grid.subdivisionColor}
            strokeWidth={line.major ? 1 : 0.5}
            listening={false}
          />
        ),
      )}
    </>
  )
}
