import { Line, Rect } from 'react-konva'
import type { MarqueeRect, SnapGuide } from '@/types/interaction'

interface GuidesLayerProps {
  guides: SnapGuide[]
  marquee: MarqueeRect | null
  documentWidth: number
  documentHeight: number
}

/** Transient alignment guides + marquee — never part of EkoDocument. */
export function GuidesLayer({ guides, marquee, documentWidth, documentHeight }: GuidesLayerProps) {
  return (
    <>
      {guides.map((guide, index) =>
        guide.orientation === 'vertical' ? (
          <Line
            key={`v-${guide.position}-${index}`}
            points={[guide.position, -2000, guide.position, documentHeight + 2000]}
            stroke={guideColor(guide.kind)}
            strokeWidth={1}
            dash={[4, 4]}
            listening={false}
          />
        ) : (
          <Line
            key={`h-${guide.position}-${index}`}
            points={[-2000, guide.position, documentWidth + 2000, guide.position]}
            stroke={guideColor(guide.kind)}
            strokeWidth={1}
            dash={[4, 4]}
            listening={false}
          />
        ),
      )}

      {marquee && (
        <Rect
          x={Math.min(marquee.x1, marquee.x2)}
          y={Math.min(marquee.y1, marquee.y2)}
          width={Math.abs(marquee.x2 - marquee.x1)}
          height={Math.abs(marquee.y2 - marquee.y1)}
          fill="rgba(15, 107, 76, 0.12)"
          stroke="rgba(15, 107, 76, 0.85)"
          strokeWidth={1}
          listening={false}
        />
      )}
    </>
  )
}

function guideColor(kind: SnapGuide['kind']): string {
  switch (kind) {
    case 'center':
      return '#c026a0'
    case 'safe':
      return '#0f6b4c'
    case 'bleed':
      return '#9b1c1c'
    case 'margin':
      return '#0b57a4'
    default:
      return '#2563eb'
  }
}
