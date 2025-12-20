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
      try {
        // Check if we're in a Farcaster environment
        const isFarcasterEnv = !!(
          window.farcaster || 
          window.sdk || 
          (window as any).frameSDK ||
          window.location?.search?.includes('farcaster')
        );

        if (isFarcasterEnv) {
          // Try to get authenticated user using Quick Auth
          try {
            const response = await sdk.actions.ready();
            console.log('App ready response:', response);
            
            // Try Quick Auth for seamless authentication
            const authResponse = await fetch('/api/auth/quick-auth', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (authResponse.ok) {
              const userData = await authResponse.json();
              setUser(userData);
              setIsAuthenticated(true);
              console.log('User authenticated via Quick Auth:', userData);
            }
          } catch (error) {
            console.log('Quick Auth not available, app ready');
          }
        }

        // Call ready() to hide splash screen
        await sdk.actions.ready();
        
      } catch (error) {
        console.error('Failed to initialize app:', error);
        // Still call ready() even if auth fails
        try {
          await sdk.actions.ready();
        } catch (readyError) {
          console.error('Failed to call ready():', readyError);
        }
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