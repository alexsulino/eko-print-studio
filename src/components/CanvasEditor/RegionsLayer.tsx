import { Rect } from 'react-konva'
import type { RendererFrame } from '@/core/layout'

interface RegionsLayerProps {
  regions: RendererFrame['regions']
}

/** Domain regions projected for editing — derived from EkoDocument, not Konva-authored. */
export function RegionsLayer({ regions }: RegionsLayerProps) {
  return (
    <>
      {regions.map((region) => (
        <Rect
          key={region.id}
          x={region.x}
          y={region.y}
          width={region.width}
          height={region.height}
          stroke={region.stroke}
          dash={region.dash}
          strokeWidth={1}
          listening={false}
        />
      ))}
    </>
  )
}
