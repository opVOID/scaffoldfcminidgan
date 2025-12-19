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
import { useMiniApp } from '@neynar/react';

function App() {
  const { isSDKLoaded, actions, added } = useMiniApp();
  const { wallet, connect, disconnect, getAuthToken } = useWallet({ isLoaded: isSDKLoaded, actions });
  const [activePage, setActivePage] = useState<PageType>('mint');
  const [sdkReady, setSdkReady] = useState(false);
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
    if (!isSDKLoaded || !actions?.addMiniApp) {
      console.log("Cannot add mini app - SDK not ready");
      return;
    }
    
    try {
      console.log("Adding mini app...");
      const result = await actions.addMiniApp();
      if (result?.notificationDetails) {
        console.log('Notification token:', result.notificationDetails.token);
      }
      console.log("Mini app added successfully");
    } catch (error: any) {
      // Handle the empty response error from Farcaster client
      if (error instanceof TypeError && error.message.includes("reading 'result'")) {
        console.warn('Mini App addition: Farcaster client returned empty response (may be normal in some environments)');
      } else {
        console.error('Failed to add mini app:', error);
      }
    }
  };

  // Initialize Farcaster SDK
  useEffect(() => {
    console.log("SDK State changed:", { isSDKLoaded, hasActions: !!actions, added });

    if (!isSDKLoaded) {
      console.log("SDK not yet loaded, waiting...");
      return;
    }

    if (!actions) {
      console.log("Actions not available yet");
      return;
    }

    // Call ready() when SDK is loaded
    if (!sdkReady && actions.ready) {
      console.log('Calling SDK ready()...');
      actions.ready()
        .then(() => {
          console.log('SDK ready() completed');
          setSdkReady(true);
        })
        .catch((err: any) => {
          console.error('SDK ready() failed:', err);
          // Still mark as ready to prevent blocking
          setSdkReady(true);
        });
    }

    // Auto-prompt to add mini app if not already added
    if (sdkReady && !added && !hasAttemptedToAdd.current) {
      console.log('App not added, prompting user...');
      hasAttemptedToAdd.current = true;
      // Small delay to ensure everything is ready
      setTimeout(() => {
        handleAddMiniApp();
      }, 1000);
    }
  }, [isSDKLoaded, actions, added, sdkReady]);

  // Debug logging
  useEffect(() => {
    console.log("Wallet state:", wallet);
  }, [wallet]);

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
        return <Mint wallet={wallet} onConnect={connect} getAuthToken={getAuthToken} />;
    }
  };

  return (
    <AuthKitProvider config={authKitConfig}>
      <AuthProvider>
        <div className="min-h-screen bg-[#050505] text-white selection:bg-neon selection:text-black">
          {/* Show loading state while SDK initializes */}
          {!isSDKLoaded && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon mx-auto mb-4"></div>
                <p className="text-gray-400">Initializing Farcaster SDK...</p>
              </div>
            </div>
          )}

          <Header wallet={wallet} onConnect={connect} onDisconnect={disconnect} />

          {renderPage()}

          <NavBar activePage={activePage} setPage={setActivePage} />
        </div>
      </AuthProvider>
    </AuthKitProvider>
  );
}

export default App;