import type { ReactNode } from 'react'

export interface InspectorSectionProps {
  title: string
  children: ReactNode
}

export function InspectorSection({ title, children }: InspectorSectionProps) {
  return (
    <section className="eko-inspector-section" data-testid="inspector-section">
      <h3>{title}</h3>
      <div className="eko-inspector-section__body">{children}</div>
    </section>
  )
}
