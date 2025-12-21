import './polyfills';
import React, { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import Header from './components/Header';
import NavBar from './components/NavBar';
import ErrorBoundary from './components/ErrorBoundary';
import Mint from './pages/Mint';
import Leaderboard from './pages/Leaderboard';
import Raffle from './pages/Raffle';
import Card from './pages/Card';
import Airdrop from './pages/Airdrop';
import Settings from './pages/Settings';
import { config } from './config/wagmi';
import { initializeWalletProvider, getWalletInfo } from './utils/walletProvider';
import type { PageType } from './types';

// Create a client
const queryClient = new QueryClient();

// Inner App component that uses the MiniApp SDK
function InnerApp() {
  const [activePage, setActivePage] = useState<PageType>('mint');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ fid: number; username?: string; custodyAddress?: string } | null>(null);

  // Initialize app and handle authentication
  useEffect(() => {
    const initializeApp = async () => {
      console.log('[DEBUG] Starting app initialization...');
      
      try {
        // Initialize wallet provider first to handle conflicts
        console.log('[DEBUG] Initializing wallet provider...');
        const walletProvider = await initializeWalletProvider();
        const walletInfo = getWalletInfo();
        console.log('[DEBUG] Wallet info:', walletInfo);
        
        // Debug: Log current environment
        console.log('[DEBUG] Checking Farcaster environment...');
        const isFarcasterEnv = !!(
          window.farcaster || 
          window.sdk || 
          (window as any).frameSDK ||
          window.location?.search?.includes('farcaster')
        );
        console.log('[DEBUG] Farcaster environment detected:', isFarcasterEnv);

        // CRITICAL: Always try to call ready() to hide splash screen
        const tryCallReady = async (source: string) => {
          try {
            console.log(`[DEBUG] Calling sdk.actions.ready() from ${source}...`);
            const readyResponse = await sdk.actions.ready();
            console.log(`[DEBUG] sdk.actions.ready() response from ${source}:`, readyResponse);
            return true;
          } catch (error) {
            console.error(`[ERROR] Failed to call ready() from ${source}:`, error);
            return false;
          }
        };

        // Multiple attempts to hide splash screen
        if (isFarcasterEnv) {
          try {
            console.log('[DEBUG] Initializing Farcaster SDK...');
            
            // Add debug info about SDK availability
            console.log('[DEBUG] SDK available:', !!sdk);
            console.log('[DEBUG] sdk.actions:', sdk?.actions ? 'available' : 'missing');
            
            // Try multiple times to call ready()
            await tryCallReady('primary attempt');
            
            // If we get here, SDK is properly initialized
            console.log('[DEBUG] Farcaster SDK initialized successfully');
          } catch (error) {
            console.error('[ERROR] Farcaster initialization failed:', error);
          }
        } else {
          console.log('[DEBUG] Not in Farcaster environment, but still calling ready()');
        }

        // Try Quick Auth for seamless authentication
        try {
          console.log('[DEBUG] Attempting Quick Auth...');
          
          // First, try to get a token directly from Mini App SDK
          let token = null;
          if (window.sdk?.quickAuth?.getToken) {
            token = await window.sdk.quickAuth.getToken();
            console.log('[DEBUG] Got token from sdk.quickAuth.getToken:', token ? 'success' : 'failed');
          }
          
          if (token) {
            // If we have a token, use it to get user data
            const authResponse = await fetch('/api/auth/quick-auth', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
            });
            
            if (authResponse.ok) {
              const userData = await authResponse.json();
              console.log('[DEBUG] Quick Auth successful:', userData);
              setUser(userData.user || userData);
              setIsAuthenticated(true);
            } else {
              console.log('[DEBUG] Quick Auth verification failed:', await authResponse.text());
            }
          } else {
            console.log('[DEBUG] No Quick Auth token available');
          }
        } catch (authError) {
          console.error('[ERROR] Error during Quick Auth:', authError);
          // Continue without authentication
        }
      } catch (error) {
        console.error('[ERROR] Critical error during app initialization:', error);
      } finally {
        // FINAL FALLBACK: Always try to call ready() one more time
        await tryCallReady('final fallback');
        console.log('[DEBUG] App initialization completed');
      }
    };

    initializeApp();
  }, []);

  const handleSignIn = async () => {
    try {
      const nonce = Math.random().toString(36).substring(7);
      const result = await sdk.actions.signIn({ 
        nonce,
        acceptAuthAddress: true 
      });
      
      if (result) {
        // Verify the sign-in message on server
        const verifyResponse = await fetch('/api/auth/verify-signin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(result),
        });
        
        if (verifyResponse.ok) {
          const userData = await verifyResponse.json();
          setUser(userData);
          setIsAuthenticated(true);
          console.log('User signed in:', userData);
        }
      }
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case 'mint':
        return <Mint wallet={{ connected: isAuthenticated, address: user?.custodyAddress || null }} />;
      case 'leaderboard':
        return <Leaderboard wallet={{ connected: isAuthenticated, address: user?.custodyAddress || null }} />;
      case 'raffle':
        return <Raffle />;
      case 'card':
        return <Card />;
      case 'airdrop':
        return <Airdrop />;
      case 'settings':
        return <Settings />;
      default:
        return <Mint wallet={{ connected: isAuthenticated, address: user?.custodyAddress || null }} />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header 
        wallet={{ 
          connected: isAuthenticated, 
          address: user?.custodyAddress || null,
          providerName: 'Farcaster'
        }} 
        onConnect={handleSignIn}
        onDisconnect={() => {
          setIsAuthenticated(false);
          setUser(null);
        }}
      />
      
      <main className="pt-20 pb-20">
        {renderPage()}
      </main>

      <NavBar activePage={activePage} setActivePage={setActivePage} />
    </div>
  );
}

// Main App component
function App() {
  return (
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <InnerApp />
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}

export default App;