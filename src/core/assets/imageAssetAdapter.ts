import type { AssetResolver } from './AssetResolver'
import type { ResolvedAsset } from './ResolvedAsset'

/**
 * Display-facing resolution for image elements.
 * Hides AssetResolver details from the React/Konva renderer.
 */
export type ImageResourceStatus = 'idle' | 'loading' | 'resolved' | 'missing' | 'failed'

export interface ImageResourceRequest {
  assetId?: string | null
  /** Legacy ImageProperties.src — always available as fallback. */
  fallbackSrc?: string | null
}

export interface ImageResourceResult {
  status: ImageResourceStatus
  /** URI safe to pass to HTMLImageElement / Konva. */
  uri?: string
  /** Raw resolver outcome when assetId was attempted. */
  resolved?: ResolvedAsset
  /** True when fallbackSrc was used because asset resolution did not yield a URI. */
  usedFallback: boolean
}

/**
 * Pure adapter: assetId → resolved URI, with legacy src fallback.
 * Never throws — safe for canvas render paths.
 */
export function resolveImageResource(
  request: ImageResourceRequest,
  resolver?: AssetResolver | null,
): ImageResourceResult {
  const assetId = request.assetId?.trim() || undefined
  const fallback = request.fallbackSrc?.trim() || undefined

  if (!assetId) {
    if (!fallback) {
      return { status: 'idle', usedFallback: false }
    }
    return { status: 'resolved', uri: fallback, usedFallback: false }
  }

  if (!resolver) {
    if (fallback) {
      return { status: 'resolved', uri: fallback, usedFallback: true }
    }
    return {
      status: 'missing',
      usedFallback: false,
      resolved: { assetId, status: 'missing' },
    }
  }

  try {
    const resolved = resolver.resolve(assetId)

    if (resolved.status === 'resolved' && resolved.resource?.uri) {
      return {
        status: 'resolved',
        uri: resolved.resource.uri,
        resolved,
        usedFallback: false,
      }
    }

    if (fallback) {
      return {
        status: 'resolved',
        uri: fallback,
        resolved,
        usedFallback: true,
      }
    }

    if (resolved.status === 'missing' || resolved.status === 'unresolved') {
      return { status: 'missing', resolved, usedFallback: false }
    }

    return { status: 'failed', resolved, usedFallback: false }
  } catch {
    if (fallback) {
      return { status: 'resolved', uri: fallback, usedFallback: true }
    }
    return {
      status: 'failed',
      usedFallback: false,
      resolved: {
        assetId,
        status: 'failed',
        error: 'Image asset adapter failed',
      },
    }
  }
}
