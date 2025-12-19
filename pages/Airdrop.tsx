import React from 'react';
import { WalletState } from '../types';
import { Gift } from 'lucide-react';

interface AirdropProps {
  wallet: WalletState;
}

const Airdrop: React.FC<AirdropProps> = ({ wallet }) => {
  return (
    <div className="pt-20 pb-24 px-4 max-w-md mx-auto min-h-screen">
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="absolute inset-0 bg-neon blur-xl opacity-20"></div>
          <div className="relative bg-[#111] border border-neon/30 p-4 rounded-full">
            <Gift size={48} className="text-neon" />
          </div>
        </div>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold font-mono mb-2">AIRDROP INCOMING</h1>
        <h2 className="text-3xl font-bold text-neon tracking-wider drop-shadow-[0_0_10px_rgba(0,255,148,0.5)]">
          $BASETARD
        </h2>
      </div>

      <p className="text-center text-gray-400 text-sm mb-8 max-w-[80%] mx-auto">
        The native token will launch on <span className="text-white font-bold">Jan 1st, 2026</span>.
      </p>

      <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6 mb-6">
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          It will be a Superfluid live vesting asset. Your leaderboard rank and mint count determines your allocation.
        </p>

        <div className="bg-[#2e1065]/30 border border-purple-500/30 rounded-xl p-4 flex gap-3 items-start">
          <span className="text-xl">✨</span>
          <p className="text-purple-300 text-sm font-bold">
            There are Animated NFTs among the Phunks these carry double the Weight for the Quotient regarding the airdrop allocation.
          </p>
        </div>
      </div>

      <button 
        disabled
        className="w-full bg-[#1F2937]/50 border border-gray-700 text-gray-500 font-bold py-4 rounded-xl cursor-not-allowed tracking-wider"
      >
        Distribution Pending...
      </button>
    </div>
  );
};

export default Airdrop;