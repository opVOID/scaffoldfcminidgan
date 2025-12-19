import './polyfills';
import React, { useState, useEffect } from 'react';
import { useWallet } from './hooks/useWallet';
import { PageType } from './types';
import NavBar from './components/NavBar';
import Header from './components/Header';
import Mint from './pages/Mint';
import Leaderboard from './pages/Leaderboard';
import Airdrop from './pages/Airdrop';
import Raffle from './pages/Raffle';
import Card from './pages/Card';
import { AuthKitProvider } from '@farcaster/auth-kit';
import { AuthProvider } from './contexts/AuthContext';

// Initialize Farcaster SDK directly
declare global {
  interface Window {
    sdk?: any;
  }
}

import { useMiniApp } from '@neynar/react';

function App() {
  const { isSDKLoaded, actions, added } = useMiniApp();
  const { wallet, connect, disconnect, getAuthToken } = useWallet({ isLoaded: isSDKLoaded, actions });
  const [activePage, setActivePage] = useState<PageType>('mint');
  const hasAttemptedToAdd = React.useRef(false);

  const authKitConfig = {
    relay: import.meta.env.VITE_FARCASTER_RELAY || 'https://relay.farcaster.xyz',
    rpcUrl: import.meta.env.VITE_FARCASTER_RPC_URL || 'https://mainnet.optimism.io',
    domain: import.meta.env.PROD
      ? (import.meta.env.VITE_FARCASTER_DOMAIN || window.location.host)
      : window.location.host,
    siweUri: `${window.location.origin}/login`,
  };

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
        return <Mint wallet={wallet} onConnect={connect} getAuthToken={getAuthToken} />;
      case 'rank':
        return <Leaderboard wallet={wallet} onConnect={connect} getAuthToken={getAuthToken} />;
      case 'airdrop':
        return <Airdrop wallet={wallet} />;
      case 'card':
        return <Card wallet={wallet} setPage={setActivePage} />;
      case 'raffle':
        return <Raffle />;
      default:
        return <Mint wallet={wallet} onConnect={connect} />;
    }
  };

  return (
    <AuthKitProvider config={authKitConfig}>
      <AuthProvider>
        <div className="min-h-screen bg-[#050505] text-white selection:bg-neon selection:text-black">
          <Header wallet={wallet} onConnect={connect} onDisconnect={disconnect} />

          {renderPage()}

          <NavBar activePage={activePage} setPage={setActivePage} />
        </div>
      </AuthProvider>
    </AuthKitProvider>
  );
}

export default App;