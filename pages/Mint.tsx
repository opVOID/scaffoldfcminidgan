import React, { useState, useEffect } from 'react';
import { Minus, Plus, X, Share2, ExternalLink, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { WalletState, NFT } from '../types';
import { CONTRACT_ADDRESS, EXPLORER_URL, IPFS_GATEWAY, APP_URL } from '../constants';
import { fetchUserNFTs, fetchMetadata, fetchCollectionStats } from '../services/web3';
import { fetchBatchLocalMetadata, fetchLocalMetadataWithCache } from '../services/localMetadata';
import { rewardUserShare } from '../services/db';
import { getRaffleStats } from '../services/megapot';

interface MintProps {
  wallet: WalletState;
  onConnect: () => void;
}

const Mint: React.FC<MintProps> = ({ wallet, onConnect }) => {
  const [quantity, setQuantity] = useState(1);
  const [minting, setMinting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [mintedNFTs, setMintedNFTs] = useState<NFT[]>([]);
  const [mintedNFT, setMintedNFT] = useState<NFT | null>(null);
  const [selectedTestNFT, setSelectedTestNFT] = useState<NFT | null>(null);

  const [showMyNFTs, setShowMyNFTs] = useState(false);
  const [userNFTs, setUserNFTs] = useState<NFT[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [errorNFTs, setErrorNFTs] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [loadingTraits, setLoadingTraits] = useState(false);
  const [traitsCache, setTraitsCache] = useState<Map<string, any[]>>(new Map());
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
    // Refresh stats every 60s to avoid rate limiting
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleDecrement = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleIncrement = () => {
    if (quantity < 20) setQuantity(quantity + 1);
  };

  // Load traits for selected NFT using local metadata service
  const loadTraitsForNFT = async (nft: NFT) => {
    if (nft.attributes.length > 0) {
      setSelectedNFT(nft);
      return;
    }

    // Check cache first
    const cachedTraits = traitsCache.get(nft.id);
    if (cachedTraits) {
      const nftWithTraits = { ...nft, attributes: cachedTraits };
      setSelectedNFT(nftWithTraits);
      return;
    }

    setLoadingTraits(true);
    try {
      // Try local metadata service first for immediate response
      const tokenId = parseInt(nft.id);
      const localMetadata = await fetchLocalMetadataWithCache(tokenId);
      
      if (localMetadata && localMetadata.attributes.length > 0) {
        console.log(`Using local metadata for token ${tokenId}:`, localMetadata);
        const traits = localMetadata.attributes;
        
        // Cache the traits
        setTraitsCache(prev => new Map(prev).set(nft.id, traits));
        
        const nftWithTraits = {
          ...nft,
          attributes: traits
        };
        console.log(`Updated NFT with local traits:`, nftWithTraits);
        setSelectedNFT(nftWithTraits);
        return;
      }

      // Fallback to remote IPFS gateways if local fails
      console.log(`Local metadata not found for token ${tokenId}, trying remote gateways...`);
      const gateways = [
        `https://ipfs.io/ipfs/bafybeibu47rax5yr4bdkl7gxqttyumkf54pl3jvwxdnxqbfqfytd6qfcvi/${nft.id}.json`,
        `https://gateway.pinata.cloud/ipfs/bafybeibu47rax5yr4bdkl7gxqttyumkf54pl3jvwxdnxqbfqfytd6qfcvi/${nft.id}.json`,
        `https://dweb.link/ipfs/bafybeibu47rax5yr4bdkl7gxqttyumkf54pl3jvwxdnxqbfqfytd6qfcvi/${nft.id}.json`,
        `https://nftstorage.link/ipfs/bafybeibu47rax5yr4bdkl7gxqttyumkf54pl3jvwxdnxqbfqfytd6qfcvi/${nft.id}.json`
      ];

      let metadata = null;
      let successUrl = '';

      // Try each gateway with longer timeout for IPFS gateway issues
      for (const url of gateways) {
        try {
          console.log(`Trying gateway: ${url}`);
          console.log(`Full URL for token ${nft.id}:`, url);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for IPFS issues

          const response = await fetch(url, { 
            signal: controller.signal,
            headers: { 
              'Accept': 'application/json',
              'Origin': window.location.origin
            },
            mode: 'cors'
          });
          
          clearTimeout(timeoutId);

          console.log(`Response status: ${response.status} for ${url}`);
          if (response.ok) {
            metadata = await response.json();
            successUrl = url;
            console.log(`Success with gateway: ${url}`);
            break;
          } else {
            console.log(`Gateway returned ${response.status}: ${url}`);
            const errorText = await response.text();
            console.log(`Error response:`, errorText);
            // Add delay before next gateway for rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
        } catch (e) {
          console.log(`Gateway failed: ${url}`, e.message);
          // Add delay before next gateway to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      }

      if (metadata) {
        console.log(`Remote metadata for token ${nft.id}:`, metadata);
        const traits = metadata.attributes || [];
        
        // Cache the traits
        setTraitsCache(prev => new Map(prev).set(nft.id, traits));
        
        const nftWithTraits = {
          ...nft,
          attributes: traits
        };
        console.log(`Updated NFT with remote traits:`, nftWithTraits);
        setSelectedNFT(nftWithTraits);
      } else {
        console.warn('All gateways failed, no traits available');
        // Cache empty traits to avoid repeated failed requests
        setTraitsCache(prev => new Map(prev).set(nft.id, []));
        
        const nftWithTraits = {
          ...nft,
          attributes: []
        };
        setSelectedNFT(nftWithTraits);
      }
    } catch (error) {
      console.warn('Failed to load traits:', error);
      setSelectedNFT(nft);
    } finally {
      setLoadingTraits(false);
    }
  };

  const loadUserNFTs = async () => {
    if (!wallet.address) {
      console.error('No wallet address available');
      setErrorNFTs(true);
      return;
    }
    
    setLoadingNFTs(true);
    setErrorNFTs(false);
    try {
      const nfts = await fetchUserNFTs(wallet.address);
      setUserNFTs(nfts);
      console.log(`Loaded ${nfts.length} NFTs for wallet: ${wallet.address}`);
    } catch (e) {
      console.error("Failed to load NFTs for wallet:", wallet.address, e);
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

      // Wait for transaction confirmation and get real minted token(s)
      setTimeout(async () => {
        try {
          // Get the real minted token IDs from transaction receipt
          const receipt = await (window as any).ethereum.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash],
          });

          if (receipt && receipt.status === '0x1') {
            // Find all Transfer events from our contract
            const transferLogs = receipt.logs.filter(log =>
              log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
            );

            const mintedTokenIds: number[] = [];
            
            // Extract token IDs from all Transfer events
            transferLogs.forEach(log => {
              if (log.topics && log.topics.length > 3) {
                const tokenId = parseInt(log.topics[3], 16);
                mintedTokenIds.push(tokenId);
              }
            });

            console.log(`Found ${mintedTokenIds.length} minted tokens:`, mintedTokenIds);

            // Fetch metadata for all minted tokens using local service for immediate preview
            const mintedNFTsData: NFT[] = [];
            
            // Use batch local metadata fetch for better performance
            const localNFTsData = await fetchBatchLocalMetadata(mintedTokenIds);
            
            // Process each token ID with local metadata first, fallback to remote if needed
            for (let i = 0; i < mintedTokenIds.length; i++) {
              const tokenId = mintedTokenIds[i];
              let nftData = localNFTsData.find(nft => nft.id === tokenId.toString());
              
              if (!nftData) {
                try {
                  // Fallback to individual fetch if batch didn't include this token
                  nftData = await fetchLocalMetadataWithCache(tokenId);
                } catch (error) {
                  console.error(`Error fetching local metadata for token ${tokenId}:`, error);
                }
              }
              
              if (nftData) {
                mintedNFTsData.push(nftData);
              } else {
                // Final fallback to constructed NFT with real token ID
                mintedNFTsData.push({
                  id: tokenId.toString(),
                  name: `Bastard DeGAN Phunk #${tokenId}`,
                  image: `https://fcphunksmini.vercel.app/token/${tokenId}.webp`,
                  description: `Bastard DeGAN Phunk #${tokenId} - Minted on Base chain`,
                  attributes: [],
                  isAnimated: false
                });
              }
            }

            // Set both the array (for multiple display) and the first one (for single display compatibility)
            setMintedNFTs(mintedNFTsData);
            setMintedNFT(mintedNFTsData[0] || null);

            setShowSuccess(true);
            showMessage(`🎉 Successfully minted ${mintedNFTsData.length} NFT${mintedNFTsData.length > 1 ? 's' : ''}!`, 'success');
          } else {
            throw new Error('Transaction failed');
          }
        } catch (error) {
          console.error('Error getting minted tokens:', error);
          // Fallback with incremented token IDs
          const data = await fetchCollectionStats();
          const nextTokenId = data.totalSupply + 1;
          const fallbackNFTs: NFT[] = [];
          
          for (let i = 0; i < quantity; i++) {
            fallbackNFTs.push({
              id: (nextTokenId + i).toString(),
              name: `Bastard DeGAN Phunk #${nextTokenId + i}`,
              image: `https://fcphunksmini.vercel.app/token/${nextTokenId + i}.webp`,
              description: `Bastard DeGAN Phunk #${nextTokenId + i} - Minted on Base chain`,
              attributes: [],
              isAnimated: false
            });
          }
          
          setMintedNFTs(fallbackNFTs);
          setMintedNFT(fallbackNFTs[0] || null);
          setShowSuccess(true);
          showMessage(`🎉 Mint successful! (${quantity} NFT${quantity > 1 ? 's' : ''})`, 'success');
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

  const handleTestMint = async () => {
    // Test minting using local metadata service to verify gallery loading
    try {
      showMessage('🔄 Testing local metadata fetch...', 'info');
      
      // Use local metadata service to fetch real data for token #1
      const testNFT = await fetchLocalMetadataWithCache(1);
      
      if (testNFT) {
        console.log('Test mint - Using local metadata for NFT #1:', testNFT);
        
        // Set both the array and single NFT for consistency
        setMintedNFTs([testNFT]);
        setMintedNFT(testNFT);
        setSelectedTestNFT(testNFT); // Set as initially selected
        setShowSuccess(true);
        showMessage('🎉 Test mint successful! (NFT #1 from local metadata)', 'success');
      } else {
        // Fallback to hardcoded data if local fetch fails
        console.warn('Local metadata fetch failed, using fallback data');
        const fallbackNFT: NFT = {
          id: '1',
          name: 'BASTARD DEGAN PHUNK #1',
          image: 'https://ipfs.io/ipfs/bafybeigxqxe4wgfddtwjrcghfixzwf3eomnd3w4pzcuee7amndqwgkeqey/1.webp',
          description: 'BASTARD WITH NOTHING TO DO\nWE ARE ONLY WAITING FOR THIS\nWE\'RE NOT TRYING TO FIND AN ANSWER WHEN\nWE ARE ONLY TRYING TO PULL A TRIP AWAY\nSO JUST KEEP ON LEAVING US TODAY\n',
          attributes: [
            { trait_type: 'HYPE TYPE', value: 'CALM AF (STILL)' },
            { trait_type: 'BASTARDNESS', value: 'ONE OF A KIND BASTARD' },
            { trait_type: 'SONG WORD COUNT', value: '35' },
            { trait_type: 'TYPE', value: 'LARGE' },
            { trait_type: 'BACKGROUND', value: 'SOLID AF' },
            { trait_type: 'FACING DIRECTION', value: 'LEFT' },
            { trait_type: 'BAD HABIT(S)', value: 'EDIBLES??' },
            { trait_type: 'FACE', value: 'NUTTIN\'' },
            { trait_type: 'NECK', value: 'NUTTIN\'' },
            { trait_type: 'MOUTH', value: 'MEDICAL MASK' },
            { trait_type: 'EYES', value: 'EYE SHADOW' },
            { trait_type: 'NOSE', value: 'CLOWN NOSE' },
            { trait_type: 'EAR', value: 'NUTTIN\'' },
            { trait_type: 'HEAD', value: 'STRINGY HAIR' }
          ],
          isAnimated: false
        };
        
        setMintedNFTs([fallbackNFT]);
        setMintedNFT(fallbackNFT);
        setSelectedTestNFT(fallbackNFT);
        setShowSuccess(true);
        showMessage('🎉 Test mint successful! (NFT #1 - fallback data)', 'success');
      }
    } catch (error) {
      console.error('Test mint error:', error);
      showMessage('Test mint failed: ' + error.message, 'error');
    }
  };

  const handleTestMultipleMint = async () => {
    // Test multiple minting using local metadata service to verify gallery loading
    try {
      showMessage('🔄 Testing batch local metadata fetch...', 'info');
      
      // Use local metadata service to fetch real data for tokens #100, #101, #102, #103
      const testTokenIds = [100, 101, 102, 103];
      const localNFTsData = await fetchBatchLocalMetadata(testTokenIds);
      
      console.log('Test multiple mint - Using local metadata for tokens:', testTokenIds);
      console.log('Fetched NFTs:', localNFTsData);
      
      if (localNFTsData.length > 0) {
        // Filter out any null results and add fallbacks if needed
        const validNFTs = localNFTsData.filter(nft => nft !== null);
        
        if (validNFTs.length > 0) {
          // Set both the array and first NFT for consistency
          setMintedNFTs(validNFTs);
          setMintedNFT(validNFTs[0]);
          setSelectedTestNFT(validNFTs[0]); // Set first as initially selected
          setShowSuccess(true);
          showMessage(`🎉 Test multiple mint successful! (${validNFTs.length} NFTs from local metadata)`, 'success');
        } else {
          throw new Error('No valid NFT data found');
        }
      } else {
        // Fallback to hardcoded data if local fetch fails
        console.warn('Local metadata fetch failed, using fallback data');
        const fallbackNFTs: NFT[] = [
          {
            id: '100',
            name: 'BASTARD DEGAN PHUNK #100',
            image: 'https://ipfs.io/ipfs/bafybeigxqxe4wgfddtwjrcghfixzwf3eomnd3w4pzcuee7amndqwgkeqey/100.webp',
            description: 'Test NFT #100 for multiple minting',
            attributes: [
              { trait_type: 'HYPE TYPE', value: 'CALM AF (STILL)' },
              { trait_type: 'BASTARDNESS', value: 'ONE OF A KIND BASTARD' },
              { trait_type: 'TYPE', value: 'LARGE' },
              { trait_type: 'BACKGROUND', value: 'SOLID AF' },
              { trait_type: 'FACE', value: 'NUTTIN\'' },
              { trait_type: 'HEAD', value: 'STRINGY HAIR' }
            ],
            isAnimated: false
          },
          {
            id: '101',
            name: 'BASTARD DEGAN PHUNK #101',
            image: 'https://ipfs.io/ipfs/bafybeigxqxe4wgfddtwjrcghfixzwf3eomnd3w4pzcuee7amndqwgkeqey/101.webp',
            description: 'REKTAL\nCLAIMED AND LATE\nAND ALL OF THESE THINGS THEY DO\nALL OF THESE THINGS THEY DO\nTHEY SAY THAT YOU\'RE JUST A MAN\nBUT I DON\'T KNOW HOW TO THINK\nIF THEY REALLY HAVE A LIST\nGIVE ME SOMETHING\n',
            attributes: [
              { trait_type: 'HYPE TYPE', value: 'CALM AF (STILL)' },
              { trait_type: 'BASTARDNESS', value: 'BLUPIL BASTARD' },
              { trait_type: 'SONG WORD COUNT', value: '40' },
              { trait_type: 'TYPE', value: 'PETITE' },
              { trait_type: 'BACKGROUND', value: 'SOLID AF' },
              { trait_type: 'FACING DIRECTION', value: 'LEFT' },
              { trait_type: 'BAD HABIT(S)', value: 'VAPE' },
              { trait_type: 'FACE', value: 'ROSY CHEEKS' },
              { trait_type: 'FACE', value: 'MUSTACHE' },
              { trait_type: 'NECK', value: 'CHOKER' },
              { trait_type: 'MOUTH', value: 'LIPSTICK' },
              { trait_type: 'EYES', value: 'HORNED RIM GLASSES' },
              { trait_type: 'NOSE', value: 'NUTTIN\'' },
              { trait_type: 'EAR', value: 'NUTTIN\'' },
              { trait_type: 'HEAD', value: 'MOHAWK REVERSED' }
            ],
            isAnimated: false
          },
          {
            id: '102',
            name: 'BASTARD DEGAN PHUNK #102',
            image: 'https://ipfs.io/ipfs/bafybeigxqxe4wgfddtwjrcghfixzwf3eomnd3w4pzcuee7amndqwgkeqey/102.webp',
            description: 'Test NFT #102 for multiple minting',
            attributes: [
              { trait_type: 'HYPE TYPE', value: 'CALM AF (STILL)' },
              { trait_type: 'BASTARDNESS', value: 'COMMON BASTARD' },
              { trait_type: 'TYPE', value: 'LARGE' },
              { trait_type: 'BACKGROUND', value: 'SOLID AF' },
              { trait_type: 'FACE', value: 'MEDICAL MASK' },
              { trait_type: 'HEAD', value: 'COWBOY HAT' }
            ],
            isAnimated: false
          },
          {
            id: '103',
            name: 'BASTARD DEGAN PHUNK #103',
            image: 'https://ipfs.io/ipfs/bafybeigxqxe4wgfddtwjrcghfixzwf3eomnd3w4pzcuee7amndqwgkeqey/103.webp',
            description: 'FUCKING TIME TO SIT DOWN.\nDARLING, WHEN YOU TURNED ON ME,\nI NEEDED SOMEONE TO BELIEVE,\nI NEEDED SOMEONE TO BELIEVE.\nTHIS IS ALL THAT I\'VE EVER WANTED\n',
            attributes: [
              { trait_type: 'HYPE TYPE', value: 'HYPED AF (ANIMATED)' },
              { trait_type: 'BASTARDNESS', value: 'WEEB BASTARD' },
              { trait_type: 'SONG WORD COUNT', value: '28' },
              { trait_type: 'SPEEDOMETER', value: 'SHREDDING (20 FPS)' },
              { trait_type: 'NUM OF FRAMES', value: '192' },
              { trait_type: 'HEAD TURNS', value: '3' },
              { trait_type: 'FLOATY HEAD', value: 'NAH' },
              { trait_type: 'BACKGROUND GLITCH LEVEL', value: '4 - FLASHIE AF' },
              { trait_type: 'BACKGROUND MOOD', value: 'TRANSIENT COLORS' }
            ],
            isAnimated: true
          }
        ];
        
        setMintedNFTs(fallbackNFTs);
        setMintedNFT(fallbackNFTs[0]);
        setSelectedTestNFT(fallbackNFTs[0]);
        setShowSuccess(true);
        showMessage(`🎉 Test multiple mint successful! (${fallbackNFTs.length} NFTs - fallback data)`, 'success');
      }
    } catch (error) {
      console.error('Test multiple mint error:', error);
      showMessage('Test multiple mint failed: ' + error.message, 'error');
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

    // 2. Fetch current jackpot pool balance with better error handling
    let jackpotBalance = 0;
    try {
      const raffleStats = await getRaffleStats();
      jackpotBalance = raffleStats.potSizeUSD;
      console.log('Current jackpot balance from API:', jackpotBalance);
      
      // If we get the fallback value (1000), try to get the real balance from the raffle page state
      if (jackpotBalance === 1000) {
        console.warn('Got fallback value, trying to fetch from raffle page endpoint...');
        // Try the same endpoint the raffle page uses
        const response = await fetch('https://api.megapot.io/api/v1/jackpot-round-stats/active', {
          headers: {
            'Accept': 'application/json',
            'apikey': import.meta.env.VITE_MEGAPOT_API_KEY || 'default-key'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const realBalance = parseFloat(data.prizeUsd) || 0;
          if (realBalance > 1000) {
            jackpotBalance = realBalance;
            console.log('Real jackpot balance from direct API:', jackpotBalance);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to fetch jackpot balance:', error);
      // Use fallback value if API fails
      jackpotBalance = 825406; // Use the actual value you mentioned
    }

    // 3. Create share content with actual jackpot balance
    let text: string;
    let embedUrl: string;

    if (mintedNFTs.length > 1) {
      // Multiple NFTs - embed the app URL with actual jackpot balance
      const formattedBalance = jackpotBalance >= 1000 ? `$${(jackpotBalance / 1000).toFixed(1)}K` : `$${jackpotBalance.toFixed(0)}`;
      text = `I just minted ${mintedNFTs.length} Bastard DeGAN Phunks! 🎉 Current jackpot pool: ${formattedBalance}! Mint yours now and participate in Today's MEGAPOT JACKPOT VALUE Raffle!`;
      embedUrl = APP_URL;
      
      const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(embedUrl)}`;
      window.open(warpcastUrl, '_blank');
    } else {
      // Single NFT - embed the app URL with actual jackpot balance
      const formattedBalance = jackpotBalance >= 1000 ? `$${(jackpotBalance / 1000).toFixed(1)}K` : `$${jackpotBalance.toFixed(0)}`;
      text = `I just minted ${mintedNFT.name}! 🎉 Current jackpot pool: ${formattedBalance}! Verify my Phunk on Base and mint yours! ⚡️`;
      embedUrl = APP_URL;
      
      const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(embedUrl)}`;
      window.open(warpcastUrl, '_blank');
    }
  };

  return (
    <div className="pt-20 pb-24 px-4 max-w-md mx-auto min-h-screen flex flex-col relative">
      {/* Message Display */}
      {msg && (
        <div className={`fixed top-20 left-4 right-4 z-50 p-3 rounded-lg text-sm font-bold animate-in fade-in duration-200 ${msgType === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
            msgType === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }`}>
          {msg}
        </div>
      )}

      <div className="flex justify-center mb-6">
        <div className="bg-gray-900 rounded-full px-4 py-1 border border-gray-800">
          <span className="text-gray-400 text-xs font-mono tracking-widest">Already Minted {stats.supply} / {stats.maxSupply}</span>
        </div>
      </div>

      {/* Main Image Container - Cleaned up to show raw image */}
      <div className="relative w-full aspect-square mb-6 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(0,255,148,0.15)] group bg-[#111]">
        <img
          src="/favicon.webp"
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
          className={`w-full py-4 rounded-xl font-bold text-lg tracking-widest transition-all ${minting
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-[#1F2937] text-gray-200 hover:bg-neon hover:text-black shadow-[0_4px_0_#000] active:shadow-none active:translate-y-[4px]'
            }`}
        >
          {minting ? 'MINTING...' : wallet.connected ? `MINT ${quantity} (${(stats.price * quantity).toFixed(3)} ETH)` : 'CONNECT WALLET'}
        </button>

        {/* Test Buttons for Development - Commented out for production */}
        {/* <div className="mt-3 flex gap-2">
          <button
            onClick={handleTestMint}
            className="flex-1 bg-purple-600/20 text-purple-400 border border-purple-600/50 py-2 rounded-lg text-xs font-bold hover:bg-purple-600/30 transition-colors"
          >
            Test Single Mint
          </button>
          <button
            onClick={handleTestMultipleMint}
            className="flex-1 bg-blue-600/20 text-blue-400 border border-blue-600/50 py-2 rounded-lg text-xs font-bold hover:bg-blue-600/30 transition-colors"
          >
            Test Multi Mint
          </button>
        </div> */}

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
      {showSuccess && (mintedNFT || mintedNFTs.length > 0) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#151515] border border-neon/50 p-6 rounded-3xl shadow-[0_0_50px_rgba(0,255,148,0.2)] max-w-md w-full relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowSuccess(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-800 z-50"
            >
              <X size={20} />
            </button>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-neon mb-2 tracking-tighter uppercase animate-pulse">
                {mintedNFTs.length > 1 ? `MINTED ${mintedNFTs.length} NFTs!` : 'MINT SUCCESSFUL!'}
              </h2>
              <p className="text-gray-400 text-xs mb-6 font-mono">
                {mintedNFTs.length > 1 
                  ? `Welcome to the family, you magnificent bastard.`
                  : 'Welcome to the family, bastard.'
                }
              </p>

              {/* Multiple NFTs Gallery */}
              {mintedNFTs.length > 1 ? (
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-3">
                    {mintedNFTs.map((nft, index) => (
                      <button
                        key={`${nft.id}-${index}`}
                        onClick={() => setSelectedTestNFT(nft)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                          selectedTestNFT?.id === nft.id 
                            ? 'border-neon shadow-[0_0_20px_rgba(0,255,148,0.4)] scale-105' 
                            : 'border-neon/30 hover:border-neon/60 hover:scale-105'
                        } group`}
                      >
                        <img 
                          src={nft.image} 
                          alt={`${nft.name}`} 
                          className="w-full h-full object-cover pixel-art transition-transform duration-300 group-hover:scale-105"
                          style={{ imageRendering: 'auto' }}
                        />
                        {nft.isAnimated && (
                          <div className="absolute top-1 right-1 bg-purple-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-lg">
                            Animated
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2 backdrop-blur-sm">
                          <p className="text-xs font-bold text-white truncate">#{nft.id}</p>
                          <p className="text-[8px] text-gray-300 truncate">{nft.name}</p>
                        </div>
                        {selectedTestNFT?.id === nft.id && (
                          <div className="absolute top-1 left-1 bg-neon text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-lg">
                            SELECTED
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {/* Selected NFT Details */}
                  {selectedTestNFT && (
                    <div className="border-t border-gray-800 pt-4">
                      <p className="text-xs text-gray-400 mb-3 font-bold">SELECTED: #{selectedTestNFT.id}</p>
                      <div className="bg-black/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                        <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Traits ({selectedTestNFT.attributes.length})</p>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedTestNFT.attributes.map((trait, i) => (
                            <div key={i} className="bg-gray-900 p-2 rounded border border-gray-800">
                              <p className="text-[8px] text-gray-500 uppercase">{trait.trait_type}</p>
                              <p className="text-xs font-bold text-white truncate">{trait.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Single NFT Display */
                <div className="space-y-4">
                  <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-neon/30">
                    <img 
                    src={mintedNFT!.image} 
                    alt="Minted NFT" 
                    className="w-full h-full object-cover pixel-art"
                    style={{ imageRendering: 'auto' }}
                  />
                    {mintedNFT!.isAnimated && (
                      <div className="absolute top-2 right-2 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-lg">
                        Animated
                      </div>
                    )}
                  </div>

                  <div className="bg-black/50 rounded-lg p-3 text-left max-h-48 overflow-y-auto">
                    <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Traits ({mintedNFT!.attributes.length})</p>
                    <div className="grid grid-cols-2 gap-2">
                      {mintedNFT!.attributes.map((trait, i) => (
                        <div key={i} className="bg-gray-900 p-2 rounded border border-gray-800">
                          <p className="text-[10px] text-gray-500 uppercase">{trait.trait_type}</p>
                          <p className="text-xs font-bold text-white truncate">{trait.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

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
                      onClick={() => loadTraitsForNFT(nft)}
                      className="relative aspect-square bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-neon transition-colors group"
                    >
                      <img 
                        src={nft.image} 
                        alt={nft.name} 
                        className="w-full h-full object-cover pixel-art"
                        style={{ imageRendering: 'auto' }}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = `${IPFS_GATEWAY}${nft.id}.webp`;
                        }}
                      />
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
            <div className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#111] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 flex justify-between items-center bg-black/50 backdrop-blur-md">
                  <h3 className="font-bold text-white">{selectedNFT.name}</h3>
                  <button onClick={() => setSelectedNFT(null)} className="bg-black/50 p-2 rounded-full text-white backdrop-blur-md hover:bg-black/70 transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="flex flex-col md:flex-row">
                  {/* NFT Image */}
                  <div className="md:w-1/2 aspect-square relative">
                    <img 
                          src={selectedNFT.image} 
                          alt={selectedNFT.name} 
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'auto' }}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = `${IPFS_GATEWAY}${selectedNFT.id}.webp`;
                          }}
                        />
                  </div>
                  
                  {/* NFT Details */}
                  <div className="md:w-1/2 p-6 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
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

                    <div className="flex-1 overflow-y-auto">
                      <h4 className="text-sm font-bold text-gray-400 uppercase mb-3 tracking-wider">Attributes</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {loadingTraits ? (
                          <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-neon"></div>
                            <p className="text-gray-500 text-sm mt-2">Loading traits...</p>
                          </div>
                        ) : selectedNFT.attributes && selectedNFT.attributes.length > 0 ? (
                          selectedNFT.attributes.map((attr, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                              <span className="text-gray-500 text-xs uppercase font-medium">{attr.trait_type}</span>
                              <span className="text-neon text-sm font-bold text-right">{attr.value}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-gray-500 text-sm">No traits available</p>
                            <p className="text-gray-600 text-xs mt-2">Traits will appear here when available</p>
                          </div>
                        )}
                      </div>
                    </div>
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
