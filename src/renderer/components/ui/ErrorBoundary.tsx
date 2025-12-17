import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo })

    // Log error to console in development
    console.error('Error caught by ErrorBoundary:', error, errorInfo)

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleReload = (): void => {
    window.location.reload()
  }

  handleGoHome = (): void => {
    window.location.href = '/'
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background-dark flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-surface-dark rounded-2xl border border-white/10 p-6 text-center">
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-error" />
            </div>

            {/* Title */}
            <h1 className="text-xl font-bold text-white mb-2">
              エラーが発生しました
            </h1>

            {/* Description */}
            <p className="text-gray-400 text-sm mb-4">
              予期しないエラーが発生しました。問題が解決しない場合は、アプリケーションを再起動してください。
            </p>

            {/* Error details (collapsible) */}
            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400 mb-2">
                  エラー詳細を表示
                </summary>
                <div className="bg-black/30 rounded-lg p-3 overflow-auto max-h-40">
                  <p className="text-xs text-error font-mono break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="text-xs text-gray-500 font-mono mt-2 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-xl transition-colors"
              >
                <RefreshCw size={16} />
                再試行
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
              >
                <Home size={16} />
                ホームへ
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  return function WithErrorBoundaryWrapper(props: P): JSX.Element {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }
}

// Page-level error boundary with simpler UI
export function PageErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <AlertTriangle size={48} className="text-error mb-4" />
          <h2 className="text-lg font-medium text-white mb-2">ページの読み込みに失敗しました</h2>
          <p className="text-gray-400 text-sm mb-4">しばらくしてから再度お試しください</p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-xl transition-colors"
          >
            <RefreshCw size={16} />
            再読み込み
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

export default ErrorBoundary
