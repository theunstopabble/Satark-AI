import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  // FIX: Actually log errors — was completely silent before
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 text-center">
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <pre className="mb-4 text-sm text-red-500 max-w-xl whitespace-pre-wrap break-all">
            {this.state.error?.message}
          </pre>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 bg-primary text-white rounded shadow"
              onClick={this.handleReload}
            >
              Reload App
            </button>
            <button
              className="px-4 py-2 bg-secondary text-foreground rounded shadow border"
              onClick={this.handleGoHome}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
