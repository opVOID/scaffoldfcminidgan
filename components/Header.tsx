import React from 'react';
import { Wallet, Zap } from 'lucide-react';
import { WalletState } from '../types';

interface HeaderProps {
  wallet: WalletState;
  onConnect: () => void;
}

const Header: React.FC<HeaderProps> = ({ wallet, onConnect }) => {
  const formatAddress = (addr: string) => `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

  return (
    <header className="fixed top-0 left-0 right-0 bg-black/90 backdrop-blur-sm z-50 border-b border-gray-800 px-4 py-3">
      <div className="max-w-md mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Zap className="text-neon" size={20} />
          <span className="font-bold text-lg tracking-tighter">PHUNKS</span>
        </div>
        
        <button
          onClick={onConnect}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm transition-all ${
            wallet.connected 
              ? 'bg-gray-800 text-neon border border-gray-700' 
              : 'bg-neon text-black hover:bg-white hover:scale-105'
          }`}
        >
          <Wallet size={16} />
          {wallet.connected && wallet.address ? formatAddress(wallet.address) : 'CONNECT WALLET'}
        </button>
      </div>
    </header>
  );
};

export default Header;