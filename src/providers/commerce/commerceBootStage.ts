/**
 * Observability tags for Commerce boot failures (no behavior change).
 * Nested stages keep the innermost tag already set.
 */
export type CommerceBootStage =
  | 'createCommerceProvider'
  | 'prepare'
  | 'configureCommerce'
  | 'start'
  | 'openPersonalization'
  | 'createSession'

const STAGE_KEY = 'commerceBootStage' as const

export function getCommerceBootStage(err: unknown): CommerceBootStage | undefined {
  if (!err || typeof err !== 'object') return undefined
  const stage = Reflect.get(err, STAGE_KEY)
  if (
    stage === 'createCommerceProvider' ||
    stage === 'prepare' ||
    stage === 'configureCommerce' ||
    stage === 'start' ||
    stage === 'openPersonalization' ||
    stage === 'createSession'
  ) {
    return stage
  }
  return undefined
}

export async function withCommerceBootStage<T>(
  stage: CommerceBootStage,
  fn: () => Promise<T> | T,
): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (getCommerceBootStage(err)) throw err
    const wrapped =
      err instanceof Error
        ? err
        : new Error(typeof err === 'string' ? err : 'Commerce boot failed', { cause: err })
    Object.defineProperty(wrapped, STAGE_KEY, {
      value: stage,
      enumerable: true,
      configurable: true,
    })
    throw wrapped
  }
}
