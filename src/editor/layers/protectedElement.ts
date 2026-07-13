import type { EkoElement } from '@/types/element'

/**
 * Template / system chrome the user should recognize as protected.
 * Derived from element fields — never parallel state.
 */
export function isProtectedElement(element: EkoElement): boolean {
  if (element.metadata?.protected === true || element.metadata?.guide === true) return true
  if (element.category === 'system' || element.category === 'brand') return true
  if (!element.editable || element.locked) return true
  return false
}

export function protectedReason(element: EkoElement): string {
  if (element.category === 'system' || element.metadata?.guide) {
    return 'Elemento de sistema do template — não pode ser movido.'
  }
  if (element.category === 'brand') {
    return 'Elemento de marca do template — protegido.'
  }
  if (element.locked || !element.editable) {
    return 'Elemento protegido do template — não pode ser movido.'
  }
  return 'Elemento protegido.'
}
