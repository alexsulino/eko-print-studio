import { describe, expect, it } from 'vitest'
import {
  computeElementScreenBox,
  elementScreenBoxCssTransform,
} from '@/core/coordinates/ElementScreenBox'

describe('ElementScreenBox', () => {
  it('maps document origin through pan and zoom', () => {
    const box = computeElementScreenBox(
      {
        x: 100,
        y: 50,
        width: 200,
        height: 80,
        rotation: 15,
        scaleX: 1.5,
        scaleY: 0.5,
      },
      { zoom: 2, panX: 40, panY: 10 },
    )

    expect(box.left).toBe(100 * 2 + 40)
    expect(box.top).toBe(50 * 2 + 10)
    expect(box.width).toBe(400)
    expect(box.height).toBe(160)
    expect(box.rotationDeg).toBe(15)
    expect(box.scaleX).toBe(1.5)
    expect(box.scaleY).toBe(0.5)
    expect(elementScreenBoxCssTransform(box)).toBe('rotate(15deg) scale(1.5, 0.5)')
  })
})
