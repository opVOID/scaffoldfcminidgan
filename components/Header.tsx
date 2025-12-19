import React from 'react';
import { Wallet, Zap } from 'lucide-react';
import { WalletState } from '../types';
import AdminButton from './AdminButton';
import { FarcasterAuthButton } from './FarcasterAuthButton';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect?: () => void;
}

const Header: React.FC<HeaderProps> = ({ wallet, onConnect, onDisconnect }) => {
  const { user, isAuthenticated, signOut } = useAuth();
  
  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Check if connected wallet is the referral wallet (admin)
  const isReferralWallet = wallet.connected &&
    wallet.address?.toLowerCase() === '0x5872286f932e5b015ef74b2f9c8723022d1b5e1b'.toLowerCase();

  const handleWalletClick = () => {
    if (wallet.connected && onDisconnect) {
      if (window.confirm("Disconnect current wallet?")) {
        onDisconnect();
      }
    } else {
      onConnect();
    }
  };

  const handleAuthClick = () => {
    if (isAuthenticated) {
      if (window.confirm("Sign out of Farcaster?")) {
        signOut();
      }
    }
    // If not authenticated, FarcasterAuthButton handles the click
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-black/90 backdrop-blur-sm z-50 border-b border-gray-800">
      <div className="max-w-md mx-auto flex justify-between items-center px-4 py-3">
        {/* Logo/Brand */}
        <div className="flex items-center gap-2">
          <Zap className="text-neon" size={20} />
          <span className="font-bold text-lg tracking-tighter">PHUNKS</span>
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-2">
          {/* Admin button - only show if wallet is admin */}
          {isReferralWallet && <AdminButton wallet={wallet} />}
          
          {/* Farcaster Auth Button - show when not authenticated */}
          {!isAuthenticated && (
            <FarcasterAuthButton 
              className="flex items-center gap-2 px-3 py-2 rounded-md font-bold text-xs sm:text-sm transition-all bg-purple-600 text-white border border-purple-500 hover:bg-purple-700"
            />
          )}

          {/* Farcaster User Display - show when authenticated but wallet not connected */}
          {isAuthenticated && !wallet.connected && (
            <button
              onClick={handleAuthClick}
              className="flex items-center gap-2 px-3 py-2 rounded-md font-bold text-xs sm:text-sm transition-all bg-gray-700 text-white border border-gray-600 hover:bg-red-600 hover:border-red-500"
              title="Click to sign out"
            >
              <Wallet size={14} />
              <span className="max-w-[100px] truncate">
                {user?.displayName || user?.username || 'FARCASTER'}
              </span>
            </button>
          )}

          {/* Wallet Button - show when wallet is connected OR as fallback connect button */}
          {(wallet.connected || isAuthenticated) && (
            <button
              onClick={handleWalletClick}
              className={`flex items-center gap-2 px-3 py-2 rounded-md font-bold text-xs sm:text-sm transition-all ${
                wallet.connected
                  ? wallet.providerName === 'Farcaster'
                    ? 'bg-purple-600 text-white border border-purple-500 hover:bg-red-600 hover:border-red-500'
                    : 'bg-gray-800 text-neon border border-gray-700 hover:bg-red-900/80 hover:text-white hover:border-red-500'
                  : 'bg-neon text-black border border-neon hover:bg-white hover:scale-105'
              }`}
              title={wallet.connected ? "Click to Disconnect" : "Connect Wallet"}
            >
              <Wallet size={14} />
              {wallet.connected && wallet.address 
                ? formatAddress(wallet.address)
                : 'CONNECT WALLET'
              }
            </button>
          )}

          {/* Fallback Connect Button - show only if neither authenticated nor connected */}
          {!isAuthenticated && !wallet.connected && (
            <button
              onClick={onConnect}
              className="flex items-center gap-2 px-3 py-2 rounded-md font-bold text-xs sm:text-sm transition-all bg-neon text-black border border-neon hover:bg-white hover:scale-105"
              title="Connect Wallet"
            >
              <Wallet size={14} />
              CONNECT WALLET
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;