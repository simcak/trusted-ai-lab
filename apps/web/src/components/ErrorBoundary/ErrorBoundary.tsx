import { Component, type ErrorInfo, type ReactNode } from 'react';
import { cs } from '../../i18n/cs.ts';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Keeps the shell alive when a lazy module chunk fails to load (e.g. stale tab after a redeploy)
 * or a module throws — the presentation must never end on a blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  override render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert">
        <h1>{cs.error.title}</h1>
        <p>{cs.error.text}</p>
        <button type="button" className="button" onClick={() => window.location.reload()}>
          {cs.error.reload}
        </button>
      </div>
    );
  }
}
