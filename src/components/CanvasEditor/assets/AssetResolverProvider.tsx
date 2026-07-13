import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  AssetResolver,
  InMemoryAssetCache,
  InMemoryAssetRepository,
  syncDocumentAssetsToRepository,
} from '@/core/assets'
import type { EkoDocument } from '@/types/document'

const AssetResolverContext = createContext<AssetResolver | null>(null)

export function useAssetResolver(): AssetResolver | null {
  return useContext(AssetResolverContext)
}

interface AssetResolverProviderProps {
  document: EkoDocument | null
  children: ReactNode
}

/**
 * Provides a stable AssetResolver seeded from document.assets.
 * Repository/cache live in refs so ImageNode context consumers do not thrash.
 */
export function AssetResolverProvider({ document, children }: AssetResolverProviderProps) {
  const repositoryRef = useRef(new InMemoryAssetRepository())
  const cacheRef = useRef(new InMemoryAssetCache())
  const resolverRef = useRef(
    new AssetResolver(repositoryRef.current, { cache: cacheRef.current }),
  )

  const assetsKey = useMemo(() => {
    if (!document) return ''
    const { images, backgrounds, fonts } = document.assets
    return [
      document.id,
      ...images.map((a) => `${a.id}:${a.src}`),
      ...backgrounds.map((a) => `${a.id}:${a.src}`),
      ...fonts.map((a) => `${a.id}:${a.src}`),
    ].join('|')
  }, [document])

  useEffect(() => {
    cacheRef.current.clear()
    if (!document) {
      repositoryRef.current.clear()
      return
    }
    syncDocumentAssetsToRepository(repositoryRef.current, document.assets)
  }, [assetsKey, document])

  return (
    <AssetResolverContext.Provider value={resolverRef.current}>
      {children}
    </AssetResolverContext.Provider>
  )
}
