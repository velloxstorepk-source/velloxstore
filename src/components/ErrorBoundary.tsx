import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let message = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(message);
      if (parsed && parsed.error) {
        message = `Database access error (${parsed.operationType} on ${parsed.path}): ${parsed.error}`;
      }
    } catch {
      // plain error string
    }
    return { hasError: true, message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
            <h1 className="text-lg font-semibold text-zinc-900">Something went wrong</h1>
            <p className="mt-2 text-sm text-zinc-600 break-words">{this.state.message}</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.href = '/';
              }}
              className="mt-5 px-4 py-2 bg-[#111317] text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
