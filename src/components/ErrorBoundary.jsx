import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled error in app tree:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface px-4 text-center text-text">
          <p className="text-lg font-semibold">Terjadi kesalahan pada aplikasi.</p>
          <p className="text-sm text-text-muted">Silakan muat ulang halaman.</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-2"
          >
            Muat Ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
