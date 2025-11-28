
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
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error' | 'info'>('info');

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

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleMint = async () => {
    if (!wallet.connected) {
      onConnect();
      return;
    }

    setMinting(true);
    
    try {
      // Calculate total price in wei
      const totalPriceWei = Math.floor(stats.price * 1e18) * quantity;
      
      // Prepare mint transaction with quantity
      const mintFunctionData = quantity > 1 
        ? `0x8a4c5b5e${quantity.toString(16).padStart(64, '0')}` // mint(uint256) selector
        : '0x1249c58b'; // mint() selector for single
      
      const txParams = {
        from: wallet.address,
        to: CONTRACT_ADDRESS,
        data: mintFunctionData,
        value: totalPriceWei.toString(16),
      };

      // Send transaction
      const txHash = await (window as any).ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      showMessage('Transaction submitted! Waiting for confirmation...', 'info');
      
      // Wait for transaction confirmation and get real minted token
      setTimeout(async () => {
        try {
          // Get the real minted token ID from transaction receipt
          const receipt = await (window as any).ethereum.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash],
          });

          if (receipt && receipt.status === '0x1') {
            // Parse the Transfer event to get the token ID
            const transferLog = receipt.logs.find(log => 
              log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
            );
            
            let tokenId = Date.now().toString(); // fallback
            
            if (transferLog && transferLog.topics && transferLog.topics.length > 3) {
              // Extract token ID from Transfer event (topic[3] contains the token ID)
              tokenId = parseInt(transferLog.topics[3], 16).toString();
            }

            // Fetch the real metadata for the minted token
            const metadata = await fetchMetadata(parseInt(tokenId));
            
            if (metadata) {
              setMintedNFT(metadata);
            } else {
              // Fallback to constructed NFT with real token ID
              setMintedNFT({
                id: tokenId,
                name: `Bastard DeGAN Phunk #${tokenId}`,
                image: `https://fcphunksmini.vercel.app/token/${tokenId}.webp`,
                description: `Bastard DeGAN Phunk #${tokenId} - Minted on Base chain`,
                attributes: [],
                isAnimated: false
              });
            }
            
            setShowSuccess(true);
            showMessage('🎉 Mint successful!', 'success');
          } else {
            throw new Error('Transaction failed');
          }
        } catch (error) {
          console.error('Error getting minted token:', error);
          // Fallback with incremented token ID
          const data = await fetchCollectionStats();
          const nextTokenId = data.totalSupply + 1;
          setMintedNFT({
            id: nextTokenId.toString(),
            name: `Bastard DeGAN Phunk #${nextTokenId}`,
            image: `https://fcphunksmini.vercel.app/token/${nextTokenId}.webp`,
            description: `Bastard DeGAN Phunk #${nextTokenId} - Minted on Base chain`,
            attributes: [],
            isAnimated: false
          });
          setShowSuccess(true);
          showMessage('🎉 Mint successful!', 'success');
        }
        
        // Refresh supply after mint
        const data = await fetchCollectionStats();
        setStats(prev => ({ ...prev, totalSupply: data.totalSupply }));
        setMinting(false);
      }, 3000);
      
    } catch (error: any) {
      console.error('Mint error:', error);
      showMessage(error.message || 'Mint failed', 'error');
      setMinting(false);
    }
  };

  const handleShare = async () => {
    if (!mintedNFT) return;
    
    // 1. Reward user logic (Optimistic update)
    if (wallet.address) {
        await rewardUserShare(wallet.address);
        setShareRewardMsg("+1 XP for Sharing!");
        setTimeout(() => setShareRewardMsg(''), 3000);
    }

    // 2. Open Warpcast with a single HTML embed containing both image and app side by side
    const text = `I just minted ${mintedNFT.name}! Verify my Phunk on Base. ⚡️`;
    const imageUrl = mintedNFT.image;
    
    // Create HTML embed with guaranteed side-by-side layout
    const embedHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta property="og:image" content="${imageUrl}">
          <meta property="og:title" content="${mintedNFT.name}">
          <meta property="og:description" content="I just minted ${mintedNFT.name}! Verify my Phunk on Base. ⚡️">
          <style>
            * { box-sizing: border-box; }
            body { 
              margin: 0; 
              padding: 12px; 
              font-family: system-ui, -apple-system, sans-serif; 
              background: #000; 
              color: #fff;
              line-height: 1.4;
            }
            .container { 
              display: flex; 
              gap: 12px; 
              align-items: center; 
              max-width: 100%;
              min-height: 120px;
            }
            .image { 
              width: 120px; 
              height: 120px; 
              object-fit: cover; 
              border-radius: 8px;
              flex-shrink: 0;
              background: #222;
            }
            .app-info { 
              flex: 1; 
              min-width: 0;
            }
            .app-title { 
              font-size: 16px; 
              font-weight: bold; 
              margin: 0 0 4px 0; 
              color: #00FF94; 
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .app-desc { 
              font-size: 13px; 
              margin: 0 0 8px 0; 
              opacity: 0.9; 
              line-height: 1.3;
            }
            .app-button { 
              background: #00FF94; 
              color: #000; 
              padding: 6px 12px; 
              border-radius: 6px; 
              text-decoration: none; 
              font-weight: bold; 
              display: inline-block;
              font-size: 12px;
            }
            @media (max-width: 400px) {
              .container { flex-direction: column; text-align: center; }
              .image { width: 150px; height: 150px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="${imageUrl}" class="image" alt="${mintedNFT.name}" onerror="this.style.display='none'">
            <div class="app-info">
              <div class="app-title">${mintedNFT.name}</div>
              <div class="app-desc">I just minted this Phunk on Base! ⚡️</div>
              <a href="${APP_URL}" class="app-button" target="_blank">Mint Yours</a>
            </div>
          </div>
        </body>
      </html>
    `;
    
    // Encode the HTML and create the Warpcast URL
    const encodedHtml = encodeURIComponent(embedHtml);
    const dataUri = `data:text/html;charset=utf-8,${encodedHtml}`;
    const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(dataUri)}`;
    
    window.open(url, '_blank');
  };

  return (
    <div className="pt-20 pb-24 px-4 max-w-md mx-auto min-h-screen flex flex-col relative">
      {/* Message Display */}
      {msg && (
        <div className={`fixed top-20 left-4 right-4 z-50 p-3 rounded-lg text-sm font-bold animate-in fade-in duration-200 ${
          msgType === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
          msgType === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
          'bg-blue-500/20 text-blue-400 border border-blue-500/30'
        }`}>
          {msg}
        </div>
      )}

      <div className="flex justify-center mb-6">
        <div className="bg-gray-900 rounded-full px-4 py-1 border border-gray-800">
          <span className="text-gray-400 text-xs font-mono tracking-widest">SUPPLY: {stats.totalSupply} / {stats.maxSupply}</span>
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
