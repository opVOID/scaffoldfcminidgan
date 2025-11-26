
import React, { useState } from 'react';
import { useWallet } from './hooks/useWallet';
import { PageType } from './types';
import NavBar from './components/NavBar';
import Header from './components/Header';
import Mint from './pages/Mint';
import Leaderboard from './pages/Leaderboard';
import Airdrop from './pages/Airdrop';
import Raffle from './pages/Raffle';
import Card from './pages/Card';

function App() {
  const { wallet, connect } = useWallet();
  const [activePage, setActivePage] = useState<PageType>('mint');

  const renderPage = () => {
    switch (activePage) {
      case 'mint':
        return <Mint wallet={wallet} onConnect={connect} />;
      case 'rank':
        return <Leaderboard wallet={wallet} onConnect={connect} />;
      case 'airdrop':
        return <Airdrop wallet={wallet} />;
      case 'card':
        // Card is now just a popup overlaying the Mint page essentially, 
        // or just renders the Card component which handles its own display
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
