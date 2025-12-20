import './polyfills';
import React, { useState, useEffect } from 'react';
import { useWagmiWallet } from './hooks/useWagmiWallet';
import { PageType } from './types';
import NavBar from './components/NavBar';
import Header from './components/Header';
import Mint from './pages/Mint';
import Leaderboard from './pages/Leaderboard';
import Airdrop from './pages/Airdrop';
import Raffle from './pages/Raffle';
import Card from './pages/Card';
import { useMiniApp } from '@neynar/react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wagmi';
import { AuthProvider } from './contexts/AuthContext';

// Initialize Farcaster SDK directly
declare global {
  interface Window {
    sdk?: any;
  }
}

const queryClient = new QueryClient();

function App() {
  // Check if we're in a Farcaster environment before using useMiniApp
  const isFarcasterEnv = typeof window !== 'undefined' && (
    window.farcaster || 
    window.sdk || 
    (window as any).frameSDK ||
    window.location?.search?.includes('farcaster')
  );
  
  const miniApp = isFarcasterEnv ? useMiniApp() : { isSDKLoaded: false, actions: null, added: false };
  const { isSDKLoaded, actions, added } = miniApp;
  
  const { wallet, connect, disconnect, getAuthToken, walletClient, ensureCorrectNetwork } = useWagmiWallet();
  const [activePage, setActivePage] = useState<PageType>('mint');
  const hasAttemptedToAdd = React.useRef(false);

  const handleAddMiniApp = async () => {
    if (!isSDKLoaded || !actions?.addMiniApp) return;
    try {
      const result = await actions.addMiniApp();
      if (result.notificationDetails) {
        console.log('Notification token:', result.notificationDetails.token);
      }
    } catch (error: any) {
      // Check for the specific error "Cannot read properties of undefined (reading 'result')"
      // which happens when the Farcaster client returns an empty response (common in some environments)
      if (error instanceof TypeError && error.message.includes("reading 'result'")) {
        console.warn('Mini App addition failed: The Farcaster client returned an empty response. This may happen if you are not in a fully supported Farcaster client environment.');
      } else {
        console.error('Failed to add mini app:', error);
      }
    }
  };

  // Initialize Farcaster SDK when app loads
  useEffect(() => {
    if (isSDKLoaded && actions?.ready) {
      console.log('Calling sdk.actions.ready() via Neynar hook...');
      actions.ready();

      // Auto-prompt to add mini app if not already added
      if (!added && !hasAttemptedToAdd.current) {
        console.log('App not added, prompting user...');
        hasAttemptedToAdd.current = true;
        handleAddMiniApp();
      }
    }
  }, [isSDKLoaded, actions, added]);

  const renderPage = () => {
    switch (activePage) {
      case 'mint':
        return <Mint wallet={wallet} onConnect={connect} getAuthToken={getAuthToken} walletClient={walletClient} ensureCorrectNetwork={ensureCorrectNetwork} />;
      case 'rank':
        return <Leaderboard wallet={wallet} onConnect={connect} getAuthToken={getAuthToken} />;
      case 'airdrop':
        return <Airdrop wallet={wallet} />;
      case 'card':
        return <Card wallet={wallet} setPage={setActivePage} />;
      case 'raffle':
        return <Raffle />;
      default:
        return <Mint wallet={wallet} onConnect={connect} getAuthToken={getAuthToken} walletClient={walletClient} ensureCorrectNetwork={ensureCorrectNetwork} />;
    }
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <div className="min-h-screen bg-[#050505] text-white selection:bg-neon selection:text-black">
            <Header wallet={wallet} onConnect={connect} onDisconnect={disconnect} />

            {renderPage()}

            <NavBar activePage={activePage} setPage={setActivePage} />
          </div>
        </AuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;