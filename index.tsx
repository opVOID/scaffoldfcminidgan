import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MiniAppProvider } from '@neynar/react';
import ErrorBoundary from './components/ErrorBoundary';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { config } from './config/wagmi';

// Check if we're in a Farcaster environment
const isFarcasterEnvironment = () => {
  return typeof window !== 'undefined' && (
    window.farcaster || 
    window.sdk || 
    (window as any).frameSDK ||
    window.location?.search?.includes('farcaster')
  );
};

const queryClient = new QueryClient();



const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {isFarcasterEnvironment() ? (
              <MiniAppProvider>
                <App />
              </MiniAppProvider>
            ) : (
              <App />
            )}
          </AuthProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  </React.StrictMode>
);