import type { ElementCategory, RuleAction } from './element'

export interface RuleDecision {
  allowed: boolean
  reason: string
}

export interface CategoryRuleOverrides {
  category: ElementCategory
  /** When false, all edit actions are denied for this category. */
  editable?: boolean
  deniedActions?: RuleAction[]
}
