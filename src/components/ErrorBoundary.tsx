import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Firestore Error: ${parsed.error} during ${parsed.operationType} on ${parsed.path || 'unknown path'}`;
            isFirestoreError = true;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-[40px] p-10 text-center shadow-2xl border border-red-100">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="text-red-500" size={40} />
            </div>
            <h2 className="text-3xl font-display mb-4 text-dark-bg">Something went wrong</h2>
            <div className="bg-red-50 rounded-2xl p-4 mb-8 text-left">
              <p className="text-red-800 font-medium text-sm break-words">
                {errorMessage}
              </p>
              {isFirestoreError && (
                <p className="text-red-600 text-xs mt-2">
                  This is likely a permission issue. Please ensure you are logged in with the correct account.
                </p>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-dark-bg text-primary-gold py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-opacity-90 transition-all"
            >
              <RefreshCw size={20} />
              RELOAD APPLICATION
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
