import React from 'react';
import { Wallet, Zap } from 'lucide-react';
import { WalletState } from '../types';
import AdminButton from './AdminButton';

interface HeaderProps {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect?: () => void;
}

const Header: React.FC<HeaderProps> = ({ wallet, onConnect, onDisconnect }) => {
  const formatAddress = (addr: string) => `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

  // Check if connected wallet is the referral wallet
  const isReferralWallet = wallet.connected &&
    wallet.address?.toLowerCase() === '0x5872286f932e5b015ef74b2f9c8723022d1b5e1b'.toLowerCase();

  const getConnectText = () => {
    if (wallet.connected && wallet.address) {
      // User requested strictly NO provider names, just the address
      return formatAddress(wallet.address);
    }
    return 'CONNECT WALLET';
  };

  const getConnectButtonStyle = () => {
    if (wallet.connected && wallet.address) {
      if (wallet.providerName === 'Farcaster') {
        return 'bg-purple-600 text-white border border-purple-500 hover:bg-red-600 hover:border-red-500';
      }
      // Added hover red style to indicate disconnect action
      return 'bg-gray-800 text-neon border border-gray-700 hover:bg-red-900/80 hover:text-white hover:border-red-500';
    }
    return 'bg-neon text-black hover:bg-white hover:scale-105';
  };

  const handleClick = () => {
    if (wallet.connected) {
      // If connected, serve option to disconnect
      if (onDisconnect) {
        if (window.confirm("Disconnect current wallet?")) {
          onDisconnect();
        }
      }
    } else {
      onConnect();
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-black/90 backdrop-blur-sm z-50 border-b border-gray-800 px-4 py-3">
      <div className="max-w-md mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Zap className="text-neon" size={20} />
          <span className="font-bold text-lg tracking-tighter">PHUNKS</span>
        </div>

        <div className="flex items-center gap-2">
          {wallet.connected && wallet.providerName === 'Farcaster' && (
            <div className="text-sm text-gray-300">
              Farcaster User
            </div>
          )}
          {isReferralWallet && <AdminButton wallet={wallet} />}
          <button
            onClick={handleClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm transition-all ${getConnectButtonStyle()}`}
            title={wallet.connected ? "Click to Disconnect" : "Connect Wallet"}
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