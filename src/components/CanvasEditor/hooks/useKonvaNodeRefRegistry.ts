import { useEffect, useMemo, useRef } from 'react'
import { KonvaNodeRefRegistry, type KonvaNodeRefHandler } from './konvaNodeRefRegistry'

/**
 * React hook wrapper around {@link KonvaNodeRefRegistry}.
 * Keeps handler fresh without recreating stable per-id callbacks.
 */
export function useKonvaNodeRefRegistry(handler: KonvaNodeRefHandler) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  const registryRef = useRef<KonvaNodeRefRegistry | null>(null)
  if (!registryRef.current) {
    registryRef.current = new KonvaNodeRefRegistry((id, node) =>
      handlerRef.current(id, node),
    )
  }

  useEffect(() => {
    registryRef.current?.setHandler((id, node) => handlerRef.current(id, node))
  })

  return useMemo(
    () => ({
      getNodeRef: (id: string) => registryRef.current!.getRef(id),
      prune: (liveIds: ReadonlySet<string>) => registryRef.current!.prune(liveIds),
      clear: () => registryRef.current!.clear(),
      getStats: () => registryRef.current!.getStats(),
    }),
    [],
  )
}
