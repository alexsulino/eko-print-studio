import type { PropertyDescriptor } from '@/types/properties'

interface PropertyFieldProps {
  descriptor: PropertyDescriptor
  onChange: (path: string, value: unknown) => void
}

export function PropertyField({ descriptor, onChange }: PropertyFieldProps) {
  const disabled = !descriptor.editable

  const commonLabel = (
    <span>
      {descriptor.label}
      {!descriptor.editable && descriptor.reason ? (
        <em className="prop-locked-reason"> — {descriptor.reason}</em>
      ) : null}
    </span>
  )

  if (descriptor.control === 'textarea') {
    return (
      <label className="field">
        {commonLabel}
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
      <label className="field">
        {commonLabel}
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
      <label className="field">
        {commonLabel}
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
      <label className="field">
        {commonLabel}
        <input
          type="number"
          disabled={disabled}
          min={descriptor.min}
          max={descriptor.max}
          step={descriptor.step ?? 1}
          value={typeof descriptor.value === 'number' ? descriptor.value : Number(descriptor.value ?? 0)}
          onChange={(e) => onChange(descriptor.path, Number(e.target.value))}
        />
      </label>
    )
  }

  return (
    <label className="field">
      {commonLabel}
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
