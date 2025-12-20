import './polyfills';
import React, { useState, useEffect } from 'react';
import { AuthKitProvider, ConnectButton, useAuthKit } from '@farcaster/auth-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { Header } from './components/Header';
import { NavBar } from './components/NavBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Mint } from './pages/Mint';
import { Leaderboard } from './pages/Leaderboard';
import { Raffle } from './pages/Raffle';
import { Card } from './pages/Card';
import { Airdrop } from './pages/Airdrop';
import { Settings } from './pages/Settings';
import { config } from './config/wagmi';
import type { PageType } from './types';

// Create a client
const queryClient = new QueryClient();

// Farcaster AuthKit configuration
const authKitConfig = {
  rpcUrl: 'https://mainnet.optimism.io',
  domain: 'phunks.farcaster.xyz', // Your domain
  siweUri: 'https://phunks.farcaster.xyz/login', // Your login endpoint
};

// Inner App component that uses the auth kit
function InnerApp() {
  const { isAuthenticated, user, profile } = useAuthKit();
  const [activePage, setActivePage] = useState<PageType>('mint');

  // Auto-connect in Farcaster environment
  useEffect(() => {
    const isFarcasterEnv = !!(
      window.farcaster || 
      window.sdk || 
      (window as any).frameSDK ||
      window.location?.search?.includes('farcaster')
    );
    
    if (isFarcasterEnv && !isAuthenticated) {
      // Auto-connect when in Farcaster environment
      console.log('In Farcaster environment, auto-connecting...');
    }
  }, [isAuthenticated]);

  const formatAddress = (addr: string) => `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

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
        onConnect={() => {}} // Handled by ConnectButton
        onDisconnect={() => {}} // Handled by ConnectButton
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
          <AuthKitProvider config={authKitConfig}>
            <InnerApp />
          </AuthKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}

export default App;