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

// Initialize Farcaster SDK directly
declare global {
  interface Window {
    sdk?: any;
  }
}

import { useMiniApp } from '@neynar/react';

function App() {
  const { wallet, connect } = useWallet();
  const [activePage, setActivePage] = useState<PageType>('mint');
  const { isSDKLoaded, actions } = useMiniApp();

  const handleAddMiniApp = async () => {
    if (!isSDKLoaded || !actions?.addMiniApp) return;
    try {
      const result = await actions.addMiniApp();
      if (result.notificationDetails) {
        console.log('Notification token:', result.notificationDetails.token);
      }
    } catch (error) {
      console.error('Failed to add mini app:', error);
    }
  };

  // Initialize Farcaster SDK when app loads
  useEffect(() => {
    if (isSDKLoaded && actions?.ready) {
      console.log('Calling sdk.actions.ready() via Neynar hook...');
      actions.ready();
    }
  }, [isSDKLoaded, actions]);

  const renderPage = () => {
    switch (activePage) {
      case 'mint':
        return <Mint wallet={wallet} onConnect={connect} />;
      case 'rank':
        return <Leaderboard wallet={wallet} onConnect={connect} />;
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
    <div className="min-h-screen bg-[#050505] text-white selection:bg-neon selection:text-black">
      <Header wallet={wallet} onConnect={connect} />

      {/* Add Mini App Button (Visible only if not added, but we don't know that yet without context, so just showing it for now) */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={handleAddMiniApp}
          className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-1 px-3 rounded-full shadow-lg transition-all"
        >
          🔔 Enable Notifications
        </button>
      </div>

      {renderPage()}

      <NavBar activePage={activePage} setPage={setActivePage} />
    </div>
  );
}

export default App;