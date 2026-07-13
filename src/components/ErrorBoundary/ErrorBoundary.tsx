import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Optional region label for dev diagnostics. */
  region?: string
  onError?: (error: Error, info: ErrorInfo) => void
}

interface ErrorBoundaryState {
  error: Error | null
}

const FALLBACK_MESSAGE = `Eko Print Studio encontrou um erro de renderização.

O documento permanece protegido.

Recarregue o editor ou consulte o diagnóstico.`

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info)
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[Eko Print Studio] Render error', error, info.componentStack)
    }
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary-card">
          <h2>Erro de renderização</h2>
          <p className="error-boundary-message">{FALLBACK_MESSAGE}</p>
          {this.props.region ? (
            <p className="error-boundary-region">
              Região: <code>{this.props.region}</code>
            </p>
          ) : null}
          {import.meta.env.DEV ? (
            <details className="error-boundary-details" open>
              <summary>Detalhes (desenvolvimento)</summary>
              <pre>{error.message}</pre>
              {error.stack ? <pre>{error.stack}</pre> : null}
            </details>
          ) : null}
          <button type="button" onClick={this.handleReload}>
            Recarregar editor
          </button>
        </div>
      </div>
    )
  }
}
