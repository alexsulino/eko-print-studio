export interface BottomStatusBarProps {
  pageInfo?: string
  zoomLabel?: string
}

/**
 * Bottom status strip — display-only labels passed from App.
 */
export function BottomStatusBar({
  pageInfo = 'Page —',
  zoomLabel = 'Zoom —',
}: BottomStatusBarProps) {
  return (
    <footer className="eko-bottom-status" data-testid="bottom-status-bar">
      <span className="eko-bottom-status__item">{pageInfo}</span>
      <span className="eko-bottom-status__spacer" aria-hidden />
      <span className="eko-bottom-status__item">{zoomLabel}</span>
    </footer>
  )
}
