import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorType: 'chunk' | 'network' | 'generic';
}

/**
 * Detects if the error is a chunk/module loading error.
 * These happen when user has stale JS after a deploy.
 */
function isChunkLoadError(error: Error): boolean {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  return (
    name === 'chunkloaderror' ||
    message.includes('loading chunk') ||
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('unable to preload css') ||
    message.includes('loading css chunk') ||
    message.includes('failed to load')
  );
}

/**
 * Detects if the error is a network-related error.
 */
function isNetworkError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('no response from server')
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorType: 'generic' };
  }

  static getDerivedStateFromError(error: Error): State {
    let errorType: 'chunk' | 'network' | 'generic' = 'generic';

    if (isChunkLoadError(error)) {
      errorType = 'chunk';
    } else if (isNetworkError(error)) {
      errorType = 'network';
    }

    return { hasError: true, error, errorType };
  }

  componentDidCatch() {
    // In production, send to error tracking service (e.g., Sentry)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorType: 'generic' });
  };

  /**
   * Clear caches and force a hard reload.
   * Used for chunk errors where user needs fresh assets.
   */
  handleHardReload = async () => {
    try {
      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }
    } catch (e) {
      console.warn('Cache clearing failed:', e);
    }

    // Force hard reload (bypass cache)
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkError = this.state.errorType === 'chunk';
      const isNetwork = this.state.errorType === 'network';

      return (
        <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4'>
          <div className='max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-8 text-center'>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isNetwork
                ? 'bg-amber-100 dark:bg-amber-900/20'
                : 'bg-red-100 dark:bg-red-900/20'
              }`}>
              {isNetwork ? (
                <WifiOff className='w-8 h-8 text-amber-600 dark:text-amber-400' />
              ) : (
                <AlertTriangle className='w-8 h-8 text-red-600 dark:text-red-400' />
              )}
            </div>

            <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
              {isChunkError
                ? 'App Update Required'
                : isNetwork
                  ? 'Connection Problem'
                  : 'Oops! Something went wrong'
              }
            </h2>

            <p className='text-gray-600 dark:text-gray-400 mb-6'>
              {isChunkError
                ? "A new version is available. Please refresh to get the latest update."
                : isNetwork
                  ? "Unable to connect. Please check your internet connection and try again."
                  : "We encountered an unexpected error. Don't worry, your data is safe."
              }
            </p>

            {this.state.error && !isChunkError && (
              <details className='mb-6 text-left'>
                <summary className='cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'>
                  Technical details
                </summary>
                <pre className='mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs overflow-auto max-h-32'>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            {isChunkError ? (
              <button
                onClick={this.handleHardReload}
                className='w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center'
              >
                <RefreshCw className='w-5 h-5 mr-2' />
                Update Now
              </button>
            ) : (
              <button
                onClick={this.handleReset}
                className='w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center'
              >
                <RefreshCw className='w-5 h-5 mr-2' />
                Try Again
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
