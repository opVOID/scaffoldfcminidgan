import React, { useState, useEffect, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorState {
  hasError: boolean;
  error?: Error;
}

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children, fallback }) => {
  const [errorState, setErrorState] = useState<ErrorState>({ hasError: false });

  useEffect(() => {
    // Set up global error handler for unhandled errors
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      setErrorState({ hasError: true, error: event.error });
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Simple error boundary using try-catch for synchronous rendering
  try {
    if (errorState.hasError) {
      if (fallback) {
        return <>{fallback}</>;
      }
      
      return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h2>
            <p className="text-gray-400 mb-4">The app encountered an error. This might be due to Farcaster SDK initialization issues.</p>
            <details className="text-left text-gray-500 text-sm mb-4">
              <summary>Error details</summary>
              <pre className="mt-2 p-2 bg-black rounded overflow-auto">
                {errorState.error?.toString()}
              </pre>
            </details>
            <button 
              onClick={() => window.location.reload()}
              className="bg-neon text-black px-4 py-2 rounded font-bold hover:bg-white transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return <>{children}</>;
  } catch (error) {
    console.error('ErrorBoundary caught rendering error:', error);
    setErrorState({ hasError: true, error: error as Error });
    
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h2>
          <p className="text-gray-400 mb-4">The app encountered an error during rendering.</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-neon text-black px-4 py-2 rounded font-bold hover:bg-white transition-colors"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
};

export default ErrorBoundary;
