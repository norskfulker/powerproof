import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { FuzzySomethingWentWrong } from '@/components/FuzzySomethingWentWrong'
import { logError } from '@/lib/logger'

type Props = { children: ReactNode }

type State = { hasError: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError('React render error', error, { componentStack: info.componentStack })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
          <h1 className="text-foreground">
            <FuzzySomethingWentWrong size="lg" />
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            An unexpected error occurred. Try refreshing the page.
          </p>
          <Button type="button" variant="default" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
