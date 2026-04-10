'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
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

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <AlertTriangle size={24} className="text-red-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-dark-text">{this.props.fallbackTitle || 'Something went wrong'}</p>
          <p className="text-[10px] text-dark-muted mt-1">Try refreshing the page</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 px-4 py-1.5 rounded-xl bg-dark-elevated border border-dark-border text-[10px] font-bold text-dark-muted hover:text-emerald-500 transition-colors"
          >
            RETRY
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
