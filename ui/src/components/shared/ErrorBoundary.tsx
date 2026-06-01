import { ArrowCounterClockwise, ArrowsClockwise, WarningCircle } from "@phosphor-icons/react";
import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (typeof console !== "undefined") {
      console.error("Resilience Pilot UI crashed:", error, info.componentStack);
    }
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="grid min-h-[100dvh] place-items-center bg-graphite px-6 py-12">
        <article className="w-full max-w-xl rounded-2xl border border-rose-400/25 bg-rose-400/8 p-7 shadow-surface">
          <div className="flex items-start gap-3">
            <WarningCircle size={28} weight="fill" className="mt-0.5 shrink-0 text-rose-200" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-200/80">Runtime error</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Something went wrong rendering the dashboard</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                The control plane hit an unexpected error. The shell is isolated, so other tabs are unaffected. Reload the page or reset the boundary to continue.
              </p>
              <pre className="mt-5 max-h-44 overflow-auto rounded-lg border border-rose-400/20 bg-slate-950/60 p-3 font-mono text-xs text-rose-100/90">
                {this.state.error.message}
              </pre>
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-rose-200 active:scale-[0.98]"
                >
                  <ArrowsClockwise size={16} weight="bold" />Reload page
                </button>
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 active:scale-[0.98]"
                >
                  <ArrowCounterClockwise size={16} />Try to recover
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>
    );
  }
}
