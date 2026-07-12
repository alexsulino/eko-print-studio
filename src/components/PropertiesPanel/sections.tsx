import type { PropertyDescriptor } from '@/types/properties'
import { PropertyField } from './PropertyField'

interface SectionProps {
  title: string
  descriptors: PropertyDescriptor[]
  onChange: (path: string, value: unknown) => void
}

function PropertySection({ title, descriptors, onChange }: SectionProps) {
  if (!descriptors.length) return null
  return (
    <section className="prop-section">
      <h3>{title}</h3>
      <div className="prop-fields">
        {descriptors.map((descriptor) => (
          <PropertyField key={descriptor.path} descriptor={descriptor} onChange={onChange} />
        ))}
      </div>
    </section>
  )
}

export function TransformSection(props: SectionProps) {
  return <PropertySection {...props} />
}

export function AppearanceSection(props: SectionProps) {
  return <PropertySection {...props} />
}

export function TypographySection(props: SectionProps) {
  return <PropertySection {...props} />
}

export function ContentSection(props: SectionProps) {
  return <PropertySection {...props} />
}
