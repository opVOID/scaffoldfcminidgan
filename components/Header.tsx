import React from 'react';
import { Wallet, Zap } from 'lucide-react';
import { SignInButton, useSignIn } from '@farcaster/auth-kit';
import { WalletState } from '../types';
import AdminButton from './AdminButton';

interface HeaderProps {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect?: () => void;
}

const Header: React.FC<HeaderProps> = ({ wallet, onConnect, onDisconnect }) => {
  const signIn = useSignIn();
  const formatAddress = (addr: string) => `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

  // Check if connected wallet is the referral wallet
  const isReferralWallet = wallet.connected &&
    wallet.address?.toLowerCase() === '0x5872286f932e5b015ef74b2f9c8723022d1b5e1b'.toLowerCase();

  const getConnectText = () => {
    if (signIn.isSuccess && signIn.data) {
      return signIn.data.username || formatAddress(signIn.data.custodyAddress || '');
    }
    return 'CONNECT WALLET';
  };

  const getConnectButtonStyle = () => {
    if (signIn.isSuccess) {
      return 'bg-purple-600 text-white border border-purple-500 hover:bg-red-600 hover:border-red-500';
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
          {signIn.isSuccess && signIn.data && (
            <div className="text-sm text-gray-300">
              {signIn.data.username || `FID: ${signIn.data.fid}`}
            </div>
          )}
          {isReferralWallet && <AdminButton wallet={wallet} />}
          <SignInButton
            onSuccess={({ fid, username, message, signature }) => {
              console.log(`Connected: ${username} (FID: ${fid})`);
            }}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;