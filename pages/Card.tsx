import React, { useEffect } from 'react';
import { WalletState, PageType } from '../types';
import { X } from 'lucide-react';

interface CardProps {
  wallet: WalletState;
  setPage: (page: PageType) => void;
}

const Card: React.FC<CardProps> = ({ wallet, setPage }) => {
  
  const handleClose = () => {
    // Redirect to mint section upon closing
    setPage('mint');
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center px-4 animate-in fade-in duration-200">
        <div className="bg-[#151515] border border-gray-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full relative transform scale-100 transition-all">
            {/* Shapeless optic background within the popup for branding style */}
            <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-neon/20 rounded-full blur-[60px] pointer-events-none"></div>
            <div className="absolute bottom-[-50px] right-[-50px] w-32 h-32 bg-purple-600/20 rounded-full blur-[60px] pointer-events-none"></div>

            <button 
                onClick={handleClose}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-800 z-10"
            >
                <X size={20} />
            </button>
            <div className="text-center pt-2 relative z-10">
                <div className="w-16 h-16 bg-gray-900/50 border border-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <span className="text-3xl">🚧</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Coming Soon</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                    The Phunk Card utility and gating features are currently under active development.
                </p>
                <p className="text-neon text-xs font-bold mt-2 tracking-widest uppercase">Stay Tuned</p>
            </div>
        </div>
    </div>
  );
};

export default Card;