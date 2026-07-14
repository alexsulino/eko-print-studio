import { Line, Rect } from 'react-konva'
import type { MarqueeRect, SnapGuide } from '@/types/interaction'
import { recordReactRender } from '@/diagnostics/dragProfiler'

interface GuidesLayerProps {
  guides: SnapGuide[]
  marquee: MarqueeRect | null
  hoveredRect: { x: number; y: number; width: number; height: number } | null
  documentWidth: number
  documentHeight: number
}

/** Transient alignment guides + marquee + hover — never part of EkoDocument. */
export function GuidesLayer({
  guides,
  marquee,
  hoveredRect,
  documentWidth,
  documentHeight,
}: GuidesLayerProps) {
  recordReactRender('GuidesLayer')
  return (
    <>
      {hoveredRect ? (
        <Rect
          x={hoveredRect.x}
          y={hoveredRect.y}
          width={hoveredRect.width}
          height={hoveredRect.height}
          stroke="rgba(59, 130, 246, 0.45)"
          strokeWidth={1}
          dash={[4, 3]}
          listening={false}
        />
      ) : null}

      {guides.map((guide, index) =>
        guide.orientation === 'vertical' ? (
          <Line
            key={`v-${guide.kind}-${guide.position}-${index}`}
            points={[guide.position, -2000, guide.position, documentHeight + 2000]}
            stroke={guideColor(guide.kind)}
            strokeWidth={guide.kind === 'spacing' ? 1.5 : 1}
            dash={guide.kind === 'center' || guide.kind === 'spacing' ? undefined : [4, 4]}
            listening={false}
            opacity={0.9}
          />
        ) : (
          <Line
            key={`h-${guide.kind}-${guide.position}-${index}`}
            points={[-2000, guide.position, documentWidth + 2000, guide.position]}
            stroke={guideColor(guide.kind)}
            strokeWidth={guide.kind === 'spacing' ? 1.5 : 1}
            dash={guide.kind === 'center' || guide.kind === 'spacing' ? undefined : [4, 4]}
            listening={false}
            opacity={0.9}
          />
        ),
      )}

      {marquee && (
        <Rect
          x={Math.min(marquee.x1, marquee.x2)}
          y={Math.min(marquee.y1, marquee.y2)}
          width={Math.abs(marquee.x2 - marquee.x1)}
          height={Math.abs(marquee.y2 - marquee.y1)}
          fill="rgba(59, 130, 246, 0.08)"
          stroke="rgba(59, 130, 246, 0.75)"
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
      return '#e11d48'
    case 'spacing':
      return '#f43f5e'
    case 'safe':
      return '#0f6b4c'
    case 'bleed':
      return '#9b1c1c'
    case 'margin':
      return '#0b57a4'
    case 'grid':
      return '#94a3b8'
    case 'guide':
      return '#7c3aed'
    default:
      return '#3b82f6'
  }
}
