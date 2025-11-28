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

function App() {
  const { wallet, connect } = useWallet();
  const [activePage, setActivePage] = useState<PageType>('mint');

  // Initialize Farcaster SDK when app loads
 useEffect(() => {
  // Only try to initialize if we're actually in a Farcaster environment
  if (window.location.href.includes('warpcast') || window.location.href.includes('farcaster')) {
    if (window.sdk && window.sdk.actions && typeof window.sdk.actions.ready === 'function') {
      console.log('Initializing Farcaster SDK...');
      window.sdk.actions.ready();
    } else if (window.sdk) {
      // Retry after delay if SDK found but not ready
      setTimeout(() => {
        if (window.sdk?.actions?.ready) {
          console.log('Farcaster SDK ready on retry');
          window.sdk.actions.ready();
        }
      }, 1000);
    }
  } else {
    console.log('Not in Farcaster environment - skipping SDK initialization');
  }
}, []);

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
      
      {renderPage()}
      
      <NavBar activePage={activePage} setPage={setActivePage} />
    </div>
  );
}

export default App;