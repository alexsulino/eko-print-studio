import type { EkoDocument } from '@/types/document'
import type { EkoElement } from '@/types/element'
import type { ProductionPreviewRef } from '@/types/commerce'
import type { ExportFormat, ExportProvider, ExportResult } from '@/core/platform/providers'
import { exportDocument } from '@/core/document/serializeDocument'
import { getDocumentPixelSize } from '@/core/document/units'

const MAX_PREVIEW_EDGE = 640
const OFFICIAL_FILENAME = 'preview.png'

/**
 * Raster ExportProvider — produces official `preview.png` (data URL) for commerce sessions.
 * Uses offscreen Canvas 2D (no Konva / no editor UI dependency).
 */
export class RasterExportProvider implements ExportProvider {
  readonly id = 'raster'
  readonly formats = ['png'] as const satisfies readonly ExportFormat[]
  private readonly maxEdge: number

  constructor(options?: { maxEdge?: number }) {
    this.maxEdge = options?.maxEdge ?? MAX_PREVIEW_EDGE
  }

  async exportDocument(
    document: EkoDocument,
    options: { format: ExportFormat; quality?: number },
  ): Promise<ExportResult> {
    if (options.format !== 'png') {
      throw new Error(`RasterExportProvider: unsupported format "${options.format}"`)
    }
    const preview = await this.createSessionPreview(document)
    return {
      format: 'png',
      mimeType: 'image/png',
      data: preview.data,
    }
  }

  async createSessionPreview(document: EkoDocument): Promise<ProductionPreviewRef> {
    const size = getDocumentPixelSize(document.canvas)
    const scale = Math.min(1, this.maxEdge / Math.max(size.widthPx, size.heightPx, 1))
    const widthPx = Math.max(1, Math.round(size.widthPx * scale))
    const heightPx = Math.max(1, Math.round(size.heightPx * scale))
    const dataUrl = renderDocumentToPngDataUrl(document, widthPx, heightPx, scale)
    const domainData = exportDocument(document)

    return {
      format: 'png',
      mimeType: 'image/png',
      data: dataUrl,
      widthPx,
      heightPx,
      generatedAt: new Date().toISOString(),
      fidelity: 'raster',
      filename: OFFICIAL_FILENAME,
      domainData,
    }
  }
}

function renderDocumentToPngDataUrl(
  doc: EkoDocument,
  widthPx: number,
  heightPx: number,
  scale: number,
): string {
  const dom = typeof globalThis !== 'undefined' ? globalThis.document : undefined
  if (!dom?.createElement) {
    return minimalPngDataUrl()
  }

  const canvas = dom.createElement('canvas')
  canvas.width = widthPx
  canvas.height = heightPx
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return minimalPngDataUrl()
  }

  ctx.fillStyle = doc.canvas.backgroundColor || '#ffffff'
  ctx.fillRect(0, 0, widthPx, heightPx)

  const elements = [...doc.elements]
    .filter((el) => el.visible !== false)
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))

  for (const el of elements) {
    paintElement(ctx, el, scale)
  }

  try {
    return canvas.toDataURL('image/png')
  } catch {
    return minimalPngDataUrl()
  }
}

function paintElement(ctx: CanvasRenderingContext2D, el: EkoElement, scale: number): void {
  const t = el.transform
  const x = t.x * scale
  const y = t.y * scale
  const w = Math.max(1, t.width * scale)
  const h = Math.max(1, t.height * scale)
  const props = (el.properties ?? {}) as Record<string, unknown>

  ctx.save()
  ctx.translate(x + w / 2, y + h / 2)
  ctx.rotate(((t.rotation ?? 0) * Math.PI) / 180)
  ctx.scale(t.scaleX ?? 1, t.scaleY ?? 1)
  ctx.translate(-w / 2, -h / 2)

  if (el.type === 'text') {
    const text = String(props.text ?? '')
    const fontSize = Math.max(8, Number(props.fontSize ?? 16) * scale)
    const fontFamily = String(props.fontFamily ?? 'sans-serif')
    const fontStyle = String(props.fontStyle ?? 'normal')
    ctx.fillStyle = String(props.fill ?? '#111111')
    ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`
    ctx.textBaseline = 'top'
    const align = String(props.align ?? 'left')
    ctx.textAlign = align === 'center' || align === 'right' ? align : 'left'
    const tx = align === 'center' ? w / 2 : align === 'right' ? w : 0
    wrapFillText(ctx, text, tx, 0, w, fontSize * 1.25)
  } else if (el.type === 'image') {
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#94a3b8'
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1)
  } else {
    // shape / rect / other
    const fill = props.fill != null ? String(props.fill) : '#cbd5e1'
    const stroke = props.stroke != null ? String(props.stroke) : ''
    const radius = Number(props.cornerRadius ?? 0) * scale
    ctx.fillStyle = fill.includes('gradient') ? '#cbd5e1' : fill
    roundRect(ctx, 0, 0, w, h, radius)
    ctx.fill()
    if (stroke && stroke !== 'transparent') {
      ctx.strokeStyle = stroke
      ctx.lineWidth = Math.max(1, Number(props.strokeWidth ?? 1) * scale)
      ctx.stroke()
    }
  }

  ctx.restore()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius)
    return
  }
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function wrapFillText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(/\s+/)
  let line = ''
  let cy = y
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy)
      line = word
      cy += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, cy)
}

/** 1×1 transparent PNG — last-resort when Canvas is unavailable (SSR / broken jsdom). */
function minimalPngDataUrl(): string {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
}
