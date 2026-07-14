/**
 * Payload from Konva Transformer / drag end — document-space units.
 * Applied via store.transformElement → TransformElement command → History.
 */
export interface CanvasTransformPayload {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  scaleX: number
  scaleY: number
}

export interface CanvasMovePayload {
  id: string
  x: number
  y: number
}

/**
 * Documents the command mapping (no store import — caller dispatches).
 */
export function describeTransformCommand(payload: CanvasTransformPayload): {
  type: 'TransformElement'
  elementId: string
  transform: {
    x: number
    y: number
    width: number
    height: number
    rotation: number
    scaleX: number
    scaleY: number
  }
} {
  return {
    type: 'TransformElement',
    elementId: payload.id,
    transform: {
      x: payload.x,
      y: payload.y,
      width: payload.width,
      height: payload.height,
      rotation: payload.rotation,
      scaleX: payload.scaleX,
      scaleY: payload.scaleY,
    },
  }
}

export function describeTransformCommands(payloads: CanvasTransformPayload[]): Array<{
  elementId: string
  transform: {
    x: number
    y: number
    width: number
    height: number
    rotation: number
    scaleX: number
    scaleY: number
  }
}> {
  return payloads.map((payload) => describeTransformCommand(payload)).map((cmd) => ({
    elementId: cmd.elementId,
    transform: cmd.transform,
  }))
}

export function describeMoveCommand(payload: CanvasMovePayload): {
  type: 'MoveElement'
  elementId: string
  x: number
  y: number
} {
  return {
    type: 'MoveElement',
    elementId: payload.id,
    x: payload.x,
    y: payload.y,
  }
}
