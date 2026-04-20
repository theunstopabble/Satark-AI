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

  componentDidCatch(_error: Error, _info: React.ErrorInfo) {
    // Optionally log error to external service
    // console.error("ErrorBoundary caught an error", _error, _info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <pre className="mb-4 text-sm text-red-500 max-w-xl whitespace-pre-wrap">
            {this.state.error?.message}
          </pre>
          <button
            className="px-4 py-2 bg-primary text-white rounded shadow"
            onClick={this.handleReload}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
