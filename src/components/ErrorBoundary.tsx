import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorFallback } from '@/components/common/ErrorFallback';
import { safariDebugError } from '@/lib/safe-browser';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

type BreadcrumbType = 'click' | 'navigation' | 'api' | 'input';

interface BreadcrumbEvent {
  type: BreadcrumbType;
  description: string;
  timestamp: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  errorId: string | null;
}

// Module-scoped breadcrumb buffer (shared across boundary instances)
const MAX_BREADCRUMBS = 15;
const breadcrumbs: BreadcrumbEvent[] = [];
let breadcrumbsInstalled = false;

function addBreadcrumb(type: BreadcrumbType, description: string) {
  breadcrumbs.push({ type, description: description.slice(0, 200), timestamp: new Date().toISOString() });
  if (breadcrumbs.length > MAX_BREADCRUMBS) breadcrumbs.shift();
}

function installBreadcrumbTracking() {
  if (breadcrumbsInstalled || typeof window === 'undefined') return;
  breadcrumbsInstalled = true;

  try {
    document.addEventListener(
      'click',
      (e) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const label =
          (target.getAttribute('aria-label') ||
            target.textContent ||
            target.tagName).trim();
        addBreadcrumb('click', `Klick: ${target.tagName.toLowerCase()} "${label.slice(0, 60)}"`);
      },
      { capture: true, passive: true },
    );

    window.addEventListener('popstate', () => {
      addBreadcrumb('navigation', `Navigerade till: ${window.location.pathname}`);
    });
  } catch {
    /* ignore */
  }
}

if (typeof window !== 'undefined') {
  installBreadcrumbTracking();

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      (reason && (reason.message || reason.toString())) || 'Unhandled rejection';
    const stack = reason?.stack || '';
    void logErrorRemote({
      errorId: `promise_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      message: String(message),
      stack: String(stack),
      componentStack: '',
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      breadcrumbs: [...breadcrumbs],
    });
  });
}

interface RemoteErrorPayload {
  errorId: string;
  message: string;
  stack: string;
  componentStack: string;
  url: string;
  timestamp: string;
  userAgent: string;
  breadcrumbs: BreadcrumbEvent[];
}

async function logErrorRemote(payload: RemoteErrorPayload): Promise<void> {
  try {
    await supabase.functions.invoke('log-error', { body: payload });
  } catch (e) {
    // Fail-silent — never throw from error logger
    console.warn('[ErrorBoundary] remote log failed:', e);
  }
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    safariDebugError('render stopped inside ErrorBoundary', error, {
      componentStack: errorInfo.componentStack,
      errorCount: this.state.errorCount + 1,
    });

    // Auto-recover from stale dynamic-import chunks
    const msg = (error?.message || '').toLowerCase();
    const isChunkLoadError =
      msg.includes('failed to fetch dynamically imported module') ||
      msg.includes('loading chunk') ||
      msg.includes('loading css chunk') ||
      msg.includes('importing a module script failed');
    if (isChunkLoadError && typeof window !== 'undefined') {
      const KEY = '__northledger_chunk_reload_at';
      const last = Number(sessionStorage.getItem(KEY) || '0');
      if (Date.now() - last > 10_000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
        return;
      }
    }

    const errorId = `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    this.setState((prevState) => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
      errorId,
    }));

    // Notify Technical AI Support (sandboxed)
    try {
      window.dispatchEvent(
        new CustomEvent('tech-support:report', {
          detail: { message: error.message, module: 'render' },
        }),
      );
    } catch {
      /* noop */
    }

    // Remote log to error_logs table (fail-silent)
    void logErrorRemote({
      errorId,
      message: error.message,
      stack: error.stack ?? '',
      componentStack: errorInfo.componentStack ?? '',
      url: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      breadcrumbs: [...breadcrumbs],
    });

    // Auto-recovery: try to reset after 5s if error count is low
    if (this.state.errorCount < 3) {
      this.resetTimer = setTimeout(() => {
        this.handleReset();
      }, 5000);
    }
  }

  componentWillUnmount() {
    if (this.resetTimer) clearTimeout(this.resetTimer);
  }

  handleReset = () => {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <ErrorFallback
          error={this.state.error ?? undefined}
          resetError={this.handleReset}
          message="Appen kunde inte renderas korrekt"
        />
      );
    }
    return this.props.children;
  }
}
