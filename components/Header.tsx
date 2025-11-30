import React from 'react';
import { Wallet, Zap } from 'lucide-react';
import { WalletState } from '../types';
import AdminButton from './AdminButton';

interface HeaderProps {
  wallet: WalletState;
  onConnect: () => void;
}

const Header: React.FC<HeaderProps> = ({ wallet, onConnect }) => {
  const formatAddress = (addr: string) => `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

  // Check if connected wallet is the referral wallet
  const isReferralWallet = wallet.connected && 
    wallet.address?.toLowerCase() === '0x5872286f932e5b015ef74b2f9c8723022d1b5e1b'.toLowerCase();

  const getConnectText = () => {
    if (wallet.connected && wallet.address) {
      if (wallet.providerName) {
        return `${formatAddress(wallet.address)} (${wallet.providerName})`;
      }
      return formatAddress(wallet.address);
    }
    return 'CONNECT WALLET';
  };

  const getConnectButtonStyle = () => {
    if (wallet.connected && wallet.address) {
      if (wallet.providerName === 'Farcaster') {
        return 'bg-purple-600 text-white border border-purple-500';
      }
      return 'bg-gray-800 text-neon border border-gray-700';
    }
    return 'bg-neon text-black hover:bg-white hover:scale-105';
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-black/90 backdrop-blur-sm z-50 border-b border-gray-800 px-4 py-3">
      <div className="max-w-md mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Zap className="text-neon" size={20} />
          <span className="font-bold text-lg tracking-tighter">PHUNKS</span>
        </div>
        
        <div className="flex items-center gap-2">
          {isReferralWallet && <AdminButton wallet={wallet} />}
          <button
            onClick={onConnect}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm transition-all ${getConnectButtonStyle()}`}
          >
            <Wallet size={16} />
            {getConnectText()}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;