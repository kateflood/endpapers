import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center max-w-[400px]">
            <h1 className="font-serif text-3xl text-text mb-3">Something went wrong</h1>
            <p className="text-[0.9375rem] text-text-secondary mb-6">
              An unexpected error occurred. Try reloading the page.
            </p>
            <button
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-sm text-[0.9375rem] font-medium cursor-pointer bg-accent text-white border border-accent transition-opacity hover:opacity-[0.82]"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
