export interface AddPageButtonProps {
  onAdd: () => void
  disabled?: boolean
}

export function AddPageButton({ onAdd, disabled }: AddPageButtonProps) {
  return (
    <button
      type="button"
      className="eko-add-page-button"
      onClick={onAdd}
      disabled={disabled}
      title="Add page"
      data-testid="add-page-button"
    >
      + Page
    </button>
  )
}
