import type { PropertyDescriptor } from '@/types/properties'

export interface PropertyFieldProps {
  descriptor: PropertyDescriptor
  onChange: (path: string, value: unknown) => void
}

/**
 * Controlled field — value comes from PropertyDescriptor; writes go through onChange → commands.
 */
export function PropertyField({ descriptor, onChange }: PropertyFieldProps) {
  const disabled = !descriptor.editable

  const label = (
    <span className="eko-property-field__label">
      {descriptor.label}
      {!descriptor.editable && descriptor.reason ? (
        <em className="eko-property-field__reason"> — {descriptor.reason}</em>
      ) : null}
    </span>
  )

  if (descriptor.control === 'textarea') {
    return (
      <label className="eko-property-field">
        {label}
        <textarea
          rows={3}
          disabled={disabled}
          value={String(descriptor.value ?? '')}
          onChange={(e) => onChange(descriptor.path, e.target.value)}
        />
      </label>
    )
  }

  if (descriptor.control === 'select') {
    return (
      <label className="eko-property-field">
        {label}
        <select
          disabled={disabled}
          value={String(descriptor.value ?? '')}
          onChange={(e) => onChange(descriptor.path, e.target.value)}
        >
          {(descriptor.options ?? []).map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (descriptor.control === 'color') {
    return (
      <label className="eko-property-field">
        {label}
        <input
          type="color"
          disabled={disabled}
          value={normalizeColor(descriptor.value)}
          onChange={(e) => onChange(descriptor.path, e.target.value)}
        />
      </label>
    )
  }

  if (descriptor.control === 'number') {
    return (
      <label className="eko-property-field">
        {label}
        <input
          type="number"
          disabled={disabled}
          min={descriptor.min}
          max={descriptor.max}
          step={descriptor.step ?? 1}
          value={
            typeof descriptor.value === 'number'
              ? descriptor.value
              : Number(descriptor.value ?? 0)
          }
          onChange={(e) => onChange(descriptor.path, Number(e.target.value))}
        />
      </label>
    )
  }

  return (
    <label className="eko-property-field">
      {label}
      <input
        type="text"
        disabled={disabled}
        value={String(descriptor.value ?? '')}
        onChange={(e) => onChange(descriptor.path, e.target.value)}
      />
    </label>
  )
}

function normalizeColor(value: unknown): string {
  if (typeof value !== 'string' || !value) return '#000000'
  if (value.startsWith('#') && (value.length === 7 || value.length === 4)) return value
  return '#000000'
}
