import { useMemo } from 'react'
import {
  resolveImageResource,
  type AssetResolver,
  type ImageResourceStatus,
} from '@/core/assets'
import { useHtmlImage } from './useHtmlImage'
import { useAssetResolver } from '../assets/AssetResolverProvider'

export interface AssetResourceState {
  status: ImageResourceStatus
  uri?: string
  image?: HTMLImageElement
  usedFallback: boolean
}

/**
 * Resolves image display URI via AssetResolver (+ legacy src fallback),
 * then loads HTMLImageElement. Safe for canvas — never throws.
 */
export function useAssetResource(
  assetId?: string | null,
  fallbackSrc?: string | null,
  resolverOverride?: AssetResolver | null,
): AssetResourceState {
  const contextResolver = useAssetResolver()
  const resolver = resolverOverride === undefined ? contextResolver : resolverOverride

  const resolved = useMemo(
    () => resolveImageResource({ assetId, fallbackSrc }, resolver),
    [assetId, fallbackSrc, resolver],
  )

  const image = useHtmlImage(resolved.uri)

  let status: ImageResourceStatus = resolved.status
  if (resolved.uri) {
    status = image ? 'resolved' : 'loading'
  }

  return {
    status,
    uri: resolved.uri,
    image,
    usedFallback: resolved.usedFallback,
  }
}
