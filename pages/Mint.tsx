
import React, { useState, useEffect } from 'react';
import { Minus, Plus, X, Share2, ExternalLink, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { WalletState, NFT } from '../types';
import { CONTRACT_ADDRESS, EXPLORER_URL, APP_URL } from '../constants';
import { fetchUserNFTs, fetchMetadata, fetchCollectionStats } from '../services/web3';
import { rewardUserShare } from '../services/db';

interface MintProps {
  wallet: WalletState;
  onConnect: () => void;
}

const Mint: React.FC<MintProps> = ({ wallet, onConnect }) => {
  const [quantity, setQuantity] = useState(1);
  const [minting, setMinting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [mintedNFT, setMintedNFT] = useState<NFT | null>(null);
  
  const [showMyNFTs, setShowMyNFTs] = useState(false);
  const [userNFTs, setUserNFTs] = useState<NFT[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [errorNFTs, setErrorNFTs] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [shareRewardMsg, setShareRewardMsg] = useState('');

  // Stats from Contract
  const [stats, setStats] = useState({
    price: 0.002, // Fallback default
    supply: 0,
    maxSupply: 11305
  });

  useEffect(() => {
    const loadStats = async () => {
        const data = await fetchCollectionStats();
        setStats({
            price: data.price > 0 ? data.price : 0.002,
            supply: data.totalSupply,
            maxSupply: data.maxSupply > 0 ? data.maxSupply : 11305
        });
    };
    loadStats();
    // Refresh stats every 30s
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDecrement = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleIncrement = () => {
    if (quantity < 20) setQuantity(quantity + 1);
  };

  const loadUserNFTs = async () => {
    if (!wallet.address) return;
    setLoadingNFTs(true);
    setErrorNFTs(false);
    try {
        const nfts = await fetchUserNFTs(wallet.address);
        setUserNFTs(nfts);
    } catch (e) {
        console.error("Failed to load NFTs", e);
        setErrorNFTs(true);
    } finally {
        setLoadingNFTs(false);
    }
  };

  useEffect(() => {
    if (showMyNFTs && wallet.address) {
      loadUserNFTs();
    }
  }, [showMyNFTs, wallet.address]);

  const handleMint = async () => {
    if (!wallet.connected) {
      onConnect();
      return;
    }

    setMinting(true);
    
    // Simulate mint delay and success (In real implementation, interact with contract via wallet provider)
    setTimeout(async () => {
      setMinting(false);
      
      // Fetch a random NFT to simulate the mint reveal
      const randomId = Math.floor(Math.random() * 10);
      const metadata = await fetchMetadata(randomId);
      
      if (metadata) {
        setMintedNFT(metadata);
        setShowSuccess(true);
        // Refresh supply after mint
        const data = await fetchCollectionStats();
        setStats(prev => ({ ...prev, supply: data.totalSupply }));
      }
    }, 2000);
  };

  const handleShare = async () => {
    if (!mintedNFT) return;
    
    // 1. Reward user logic (Optimistic update)
    if (wallet.address) {
        await rewardUserShare(wallet.address);
        setShareRewardMsg("+1 XP for Sharing!");
        setTimeout(() => setShareRewardMsg(''), 3000);
    }

    // 2. Open Warpcast with 2 embeds: Image + App URL
    const text = `I just minted ${mintedNFT.name}! Verify my Phunk on Base. ⚡️`;
    const imageUrl = mintedNFT.image;
    // We add two embeds: The image and the Mini App URL. Warpcast usually renders this as Image Left / App Right
    const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(imageUrl)}&embeds[]=${encodeURIComponent(APP_URL)}`;
    
    window.open(url, '_blank');
  };

  return (
    <div className="pt-20 pb-24 px-4 max-w-md mx-auto min-h-screen flex flex-col relative">
      <div className="flex justify-center mb-6">
        <div className="bg-gray-900 rounded-full px-4 py-1 border border-gray-800">
          <span className="text-gray-400 text-xs font-mono tracking-widest">SUPPLY: {stats.supply} / {stats.maxSupply}</span>
        </div>
      </div>

      {/* Main Image Container - Cleaned up to show raw image */}
      <div className="relative w-full aspect-square mb-6 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(0,255,148,0.15)] group bg-[#111]">
        <img 
          src="https://fcphunksmini.vercel.app//example.webp" 
          alt="Bastard DeGAN Phunk" 
          className="w-full h-full object-cover pixel-art transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* View Collection Button Overlay */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
            <button 
                onClick={() => setShowMyNFTs(true)}
                className="bg-black/80 backdrop-blur-md text-neon border border-neon/50 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-neon hover:text-black transition-colors flex items-center gap-2"
            >
                <ImageIcon size={14} />
                View Collection
            </button>
        </div>
      </div>

      <div className="bg-[#111] rounded-2xl p-6 border border-gray-800 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-gray-500 text-xs font-bold mb-1 tracking-wider">PRICE</p>
            <p className="text-2xl font-mono font-bold text-white">{stats.price} ETH</p>
          </div>

          <div className="flex items-center bg-black rounded-lg border border-gray-800 p-1">
            <button 
              onClick={handleDecrement}
              className="p-2 hover:bg-gray-800 rounded-md transition-colors text-white"
            >
              <Minus size={16} />
            </button>
            <span className="w-12 text-center font-mono font-bold text-lg">{quantity}</span>
            <button 
              onClick={handleIncrement}
              className="p-2 hover:bg-gray-800 rounded-md transition-colors text-white"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <button
          onClick={handleMint}
          disabled={minting}
          className={`w-full py-4 rounded-xl font-bold text-lg tracking-widest transition-all ${
            minting 
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-[#1F2937] text-gray-200 hover:bg-neon hover:text-black shadow-[0_4px_0_#000] active:shadow-none active:translate-y-[4px]'
          }`}
        >
          {minting ? 'MINTING...' : wallet.connected ? `MINT ${quantity} (${(stats.price * quantity).toFixed(3)} ETH)` : 'CONNECT WALLET'}
        </button>
        
        <div className="mt-4 text-center">
          <a 
            href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-600 font-mono hover:text-neon transition-colors border-b border-transparent hover:border-neon"
          >
            {CONTRACT_ADDRESS.substring(0, 10)}...{CONTRACT_ADDRESS.substring(36)}
          </a>
        </div>
      </div>

      {/* SUCCESS MODAL */}
      {showSuccess && mintedNFT && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#151515] border border-neon/50 p-6 rounded-3xl shadow-[0_0_50px_rgba(0,255,148,0.2)] max-w-sm w-full relative">
                <button 
                    onClick={() => setShowSuccess(false)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-800 z-50"
                >
                    <X size={20} />
                </button>
                
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-neon mb-2 tracking-tighter uppercase animate-pulse">MINT SUCCESSFUL!</h2>
                    <p className="text-gray-400 text-xs mb-6 font-mono">Welcome to the family, bastard.</p>
                    
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-6 border-2 border-neon/30">
                        <img src={mintedNFT.image} alt="Minted NFT" className="w-full h-full object-cover pixel-art" />
                        {mintedNFT.isAnimated && (
                            <div className="absolute top-2 right-2 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-lg">
                                Animated
                            </div>
                        )}
                    </div>

                    <div className="bg-black/50 rounded-lg p-3 mb-6 text-left max-h-32 overflow-y-auto">
                        <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Traits</p>
                        <div className="grid grid-cols-2 gap-2">
                            {mintedNFT.attributes.map((trait, i) => (
                                <div key={i} className="bg-gray-900 p-2 rounded border border-gray-800">
                                    <p className="text-[10px] text-gray-500 uppercase">{trait.trait_type}</p>
                                    <p className="text-xs font-bold text-white truncate">{trait.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleShare}
                        className="w-full bg-[#472a91] text-white font-bold py-3 rounded-xl hover:bg-[#5b36b5] transition-colors flex items-center justify-center gap-2 relative overflow-hidden"
                    >
                        <Share2 size={18} />
                        Share on Warpcast
                    </button>
                    
                    {shareRewardMsg && (
                        <p className="text-neon text-xs font-bold mt-2 animate-bounce">{shareRewardMsg}</p>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* MY NFTS MODAL */}
      {showMyNFTs && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:px-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#111] border-t sm:border border-gray-800 w-full sm:max-w-md h-[85vh] sm:h-[80vh] sm:rounded-3xl rounded-t-3xl flex flex-col relative shadow-2xl">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white tracking-tight">My Collection</h2>
                    <button 
                        onClick={() => setShowMyNFTs(false)}
                        className="text-gray-500 hover:text-white transition-colors bg-gray-900 p-2 rounded-full"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                    {!wallet.connected ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <p className="text-gray-500 mb-4">Connect wallet to view your Phunks.</p>
                            <button onClick={onConnect} className="text-neon font-bold uppercase text-sm">Connect Wallet</button>
                        </div>
                    ) : loadingNFTs ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-neon"></div>
                        </div>
                    ) : errorNFTs ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6">
                            <AlertCircle className="text-red-500 mb-2" size={32} />
                            <p className="text-white font-bold mb-1">Could not load NFTs</p>
                            <p className="text-gray-500 text-sm mb-4">There was an error fetching your collection data from the blockchain.</p>
                            <button onClick={loadUserNFTs} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700">Try Again</button>
                        </div>
                    ) : userNFTs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <p className="text-gray-500 text-sm">No Bastard DeGAN Phunks found.</p>
                            <button onClick={() => setShowMyNFTs(false)} className="mt-4 text-neon font-bold text-sm">Mint One Now</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {userNFTs.map((nft) => (
                                <button 
                                    key={nft.id} 
                                    onClick={() => setSelectedNFT(nft)}
                                    className="relative aspect-square bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-neon transition-colors group"
                                >
                                    <img src={nft.image} alt={nft.name} className="w-full h-full object-cover pixel-art" />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 backdrop-blur-sm">
                                        <p className="text-xs font-bold text-white truncate">#{nft.id}</p>
                                    </div>
                                    {nft.isAnimated && (
                                        <div className="absolute top-1 right-1 bg-purple-600 w-2 h-2 rounded-full shadow-[0_0_5px_#9333ea]"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Selected NFT Detail Popup */}
            {selectedNFT && (
                <div className="absolute inset-0 z-[95] bg-[#111] sm:rounded-3xl rounded-t-3xl flex flex-col animate-in slide-in-from-bottom duration-200">
                    <div className="p-4 flex justify-between items-center bg-black/50 backdrop-blur-md absolute top-0 left-0 right-0 z-10">
                        <h3 className="font-bold text-white">{selectedNFT.name}</h3>
                        <button onClick={() => setSelectedNFT(null)} className="bg-black/50 p-2 rounded-full text-white backdrop-blur-md">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <div className="w-full aspect-square relative">
                             <img src={selectedNFT.image} alt={selectedNFT.name} className="w-full h-full object-cover pixel-art" />
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <a 
                                    href={`https://opensea.io/assets/base/${CONTRACT_ADDRESS}/${selectedNFT.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 bg-[#2081E2] hover:bg-[#1868b7] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                                >
                                    <ExternalLink size={16} /> OpenSea
                                </a>
                                {selectedNFT.isAnimated && (
                                    <div className="bg-purple-900/50 border border-purple-500/50 text-purple-200 px-4 py-3 rounded-xl font-bold text-sm uppercase flex items-center gap-2">
                                        <span>✨</span> Animated
                                    </div>
                                )}
                            </div>
                            
                            <h4 className="text-sm font-bold text-gray-400 uppercase mb-3 tracking-wider">Attributes</h4>
                            <div className="space-y-2">
                                {selectedNFT.attributes.map((attr, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                                        <span className="text-gray-500 text-xs uppercase font-medium">{attr.trait_type}</span>
                                        <span className="text-neon text-sm font-bold text-right">{attr.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default Mint;
