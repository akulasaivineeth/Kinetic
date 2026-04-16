'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-dark-bg flex flex-col items-center justify-center px-8">
          <p className="text-dark-text font-black text-lg tracking-tight mb-2">
            Something went wrong
          </p>
          <p className="text-dark-muted text-sm mb-6 text-center">
            The app lost connection while in the background.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-2xl bg-emerald-500 text-black text-xs font-black tracking-widest uppercase"
          >
            TAP TO RELOAD
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
