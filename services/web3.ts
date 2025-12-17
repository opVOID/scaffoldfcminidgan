
import { CONTRACT_ADDRESS, RPC_URL, IPFS_GATEWAY, SELECTORS } from '../constants';
import { NFT } from '../types';

// Helper to encode function calls for JSON-RPC
const encodeFunctionCall = (functionSignature: string, addressArg?: string): string => {
  if (functionSignature === 'walletOfOwner(address)') {
    if (!addressArg) return '0x';
    const cleanAddr = addressArg.replace('0x', '').toLowerCase();
    const paddedAddr = cleanAddr.padStart(64, '0');
    return `${SELECTORS.walletOfOwner}${paddedAddr}`;
  }
  if (functionSignature === 'balanceOf(address)') {
    if (!addressArg) return '0x';
    const cleanAddr = addressArg.replace('0x', '').toLowerCase();
    const paddedAddr = cleanAddr.padStart(64, '0');
    return `${SELECTORS.balanceOf}${paddedAddr}`;
  }
  if (functionSignature === 'totalSupply()') {
    return SELECTORS.totalSupply;
  }
  return '0x';
};

// Encode purchaseTickets(address referrer, uint256 value, address recipient)
export const encodePurchaseTickets = (referrer: string, valueUSDC: number, recipient: string): string => {
  // Function Selector for purchaseTickets(address,uint256,address)
  // keccak256("purchaseTickets(address,uint256,address)") -> 0x7eff275e
  const selector = "0x7eff275e";

  const cleanReferrer = referrer.replace('0x', '').padStart(64, '0');
  const cleanRecipient = recipient.replace('0x', '').padStart(64, '0');

  // Value is passed in standard USD (e.g. 1.0)
  // We convert to USDC (6 decimals) -> 1.0 * 1,000,000 = 1000000
  const rawValue = Math.floor(valueUSDC * 1000000);
  const hexValue = rawValue.toString(16).padStart(64, '0');

  return `${selector}${cleanReferrer}${hexValue}${cleanRecipient}`;
};

const hexToDecimal = (hex: string): number => {
  if (!hex || hex === '0x') return 0;
  return parseInt(hex, 16);
};

const hexToEth = (hex: string): number => {
  if (!hex || hex === '0x') return 0;
  const wei = parseInt(hex, 16);
  return wei / 1e18;
};

interface CollectionStats {
  totalSupply: number;
  maxSupply: number;
  price: number;
}

// Cache for collection stats to avoid rate limiting
let cachedStats: CollectionStats | null = null;
let lastCacheTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export const fetchCollectionStats = async (): Promise<CollectionStats> => {
  try {
    // Return cached data if still valid
    if (cachedStats && Date.now() - lastCacheTime < CACHE_DURATION) {
      console.log('Returning cached collection stats:', cachedStats);
      return cachedStats;
    }

    console.log('Fetching collection stats using Alchemy REST API...');

    // Use Alchemy REST API to get contract metadata
    const response = await fetch(
      `${ALCHEMY_BASE_URL}/${ALCHEMY_API_KEY}/getContractMetadata?contractAddress=${CONTRACT_ADDRESS}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Try to get totalSupply using Alchemy NFT API as fallback
    let totalSupply = 0;
    try {
      // Get all NFTs for the contract to count them
      const nftResponse = await fetch(
        `${ALCHEMY_BASE_URL}/${ALCHEMY_API_KEY}/getNFTsForCollection?contractAddress=${CONTRACT_ADDRESS}&withMetadata=false`
      );

      if (nftResponse.ok) {
        const nftData = await nftResponse.json();
        console.log('NFT collection response:', nftData);

        if (nftData.nfts && Array.isArray(nftData.nfts)) {
          totalSupply = nftData.nfts.length;
          console.log('TotalSupply from NFT collection:', totalSupply);
        } else if (nftData.error) {
          console.warn('NFT collection error:', nftData.error);
        }
      } else {
        console.warn('NFT collection HTTP error:', nftResponse.status);
      }
    } catch (error) {
      console.warn('Failed to get totalSupply from NFT collection:', error);
    }

    // If NFT API failed, try RPC call as last resort
    if (totalSupply === 0) {
      try {
        const supplyResponse = await fetch(`${ALCHEMY_BASE_URL}/${ALCHEMY_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{ to: CONTRACT_ADDRESS, data: SELECTORS.totalSupply }, 'latest'],
            id: 1
          })
        });

        if (supplyResponse.ok) {
          const supplyData = await supplyResponse.json();
          console.log('TotalSupply RPC response:', supplyData);

          if (supplyData.error) {
            console.warn('TotalSupply RPC error:', supplyData.error);
          } else if (supplyData.result && supplyData.result !== '0x') {
            totalSupply = parseInt(supplyData.result, 16);
            console.log('TotalSupply parsed:', totalSupply);
          } else {
            console.log('TotalSupply result is 0x or empty:', supplyData.result);
          }
        } else {
          console.warn('TotalSupply HTTP error:', supplyResponse.status);
        }
      } catch (error) {
        console.warn('Failed to get totalSupply via RPC:', error);
      }
    }

    // Fetch dynamic price from contract
    let contractPrice = 0;
    try {
      const priceResponse = await fetch(`${ALCHEMY_BASE_URL}/${ALCHEMY_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{ to: CONTRACT_ADDRESS, data: SELECTORS.cost }, 'latest'],
          id: 1
        })
      });

      if (priceResponse.ok) {
        const priceData = await priceResponse.json();
        console.log('Price RPC response:', priceData);
        if (priceData.result && priceData.result !== '0x') {
          const wei = parseInt(priceData.result, 16);
          contractPrice = wei / 1e18;
          console.log('Contract price parsed:', contractPrice);
        }
      }
    } catch (error) {
      console.warn('Failed to get price from contract:', error);
    }

    totalSupply: totalSupply,
      maxSupply: parseInt(data.maxSupply || '11305', 10),
        // Use fetched contract price if available, otherwise fallback
        price: contractPrice > 0 ? contractPrice : (parseFloat(data.openSea?.floorPrice || '0.0003') || 0.0003)
  };

  // Cache the results
  cachedStats = stats;
  lastCacheTime = Date.now();

  console.log('Successfully fetched collection stats:', stats);
  return stats;

} catch (error) {
  console.error("Error fetching collection stats:", error);
  // Return fallback values if all methods fail
  return {
    totalSupply: cachedStats?.totalSupply || 0,
    maxSupply: 11305,
    price: 0.0003
  };
}
};

// Multiple RPC endpoints for rotation to avoid rate limiting
const RPC_ENDPOINTS = [
  "https://mainnet.base.org",
  "https://base.gateway.tenderly.co",
  "https://base.blockpi.network/v1/rpc/public",
  "https://rpc.ankr.com/base",
  "https://base.publicnode.com",
  "https://base-mainnet.public.blastapi.io"
];

let currentRpcIndex = 0;

// Get next RPC endpoint
const getNextRpcUrl = () => {
  const url = RPC_ENDPOINTS[currentRpcIndex];
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
  return url;
};

// Alchemy REST API Configuration
const ALCHEMY_API_KEY = import.meta.env.VITE_RPC_URL?.split('/').pop() || "FE-zLOi6n9jK04j_NmGJUOnXMQibzPYD";
const ALCHEMY_BASE_URL = "https://base-mainnet.g.alchemy.com/v2";

// Cache for NFT data to avoid rate limiting
const nftCache = new Map<string, { data: NFT[]; timestamp: number }>();

// Helper to fetch traits from IPFS metadata
const fetchTraitsFromIPFS = async (tokenId: string): Promise<any[]> => {
  try {
    const metadataUrl = `${IPFS_GATEWAY}${tokenId}.json`;
    const response = await fetch(metadataUrl);

    if (!response.ok) {
      console.warn(`Failed to fetch metadata for token ${tokenId}`);
      return [];
    }

    const metadata = await response.json();
    return metadata.attributes || [];
  } catch (error) {
    console.warn(`Error fetching traits for token ${tokenId}:`, error);
    return [];
  }
};

export const fetchUserNFTs = async (address: string): Promise<NFT[]> => {
  // Check cache first
  const cached = nftCache.get(address);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Using cached NFT data for', address);
    return cached.data;
  }

  console.log(`Fetching NFTs for ${address} using Alchemy REST API...`);

  try {
    // Use Alchemy REST API to get NFTs for owner
    const response = await fetch(
      `${ALCHEMY_BASE_URL}/${ALCHEMY_API_KEY}/getNFTs?owner=${address}&contractAddresses[]=${CONTRACT_ADDRESS}&withMetadata=false`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const nfts = data.ownedNfts || [];

    console.log(`Found ${nfts.length} NFTs for ${address}`);
    console.log('Raw Alchemy NFT sample:', JSON.stringify(nfts[0], null, 2));

    // Transform Alchemy NFT data to our NFT format
    const transformedNfts: NFT[] = nfts.map((nft: any) => {
      // Extract tokenId properly from Alchemy response structure
      let tokenId = nft.id?.tokenId || nft.tokenId;

      // If tokenId is in hex format, convert to decimal
      if (typeof tokenId === 'string' && tokenId.startsWith('0x')) {
        tokenId = parseInt(tokenId, 16).toString();
      } else if (typeof tokenId === 'number') {
        tokenId = tokenId.toString();
      } else if (typeof tokenId === 'string' && !isNaN(parseInt(tokenId))) {
        tokenId = parseInt(tokenId).toString();
      }

      console.log(`Processing token ID: ${tokenId} (original: ${nft.id?.tokenId || nft.tokenId})`);

      // Use our IPFS gateway for images as specified in the requirements
      const imageUrl = `${IPFS_GATEWAY}${tokenId}.webp`;

      return {
        id: tokenId,
        name: `Bastard DeGAN Phunk #${tokenId}`,
        image: imageUrl,
        description: `Bastard DeGAN Phunk #${tokenId}`,
        attributes: [], // Start empty, will fetch traits when clicked
        isAnimated: false // Could add logic later if needed
      };
    });

    console.log('Transformed NFT sample:', transformedNfts[0]);

    // Cache the results
    nftCache.set(address, { data: transformedNfts, timestamp: Date.now() });

    console.log(`Successfully fetched ${transformedNfts.length} NFTs using Alchemy REST API`);
    return transformedNfts;

  } catch (error) {
    console.error("Error fetching NFTs with Alchemy REST API:", error);
    return []; // Return empty array on error
  }
};

// Helper to convert hex string to regular string
const hexToString = (hex: string): string => {
  if (!hex || hex === '0x') return '';
  const clean = hex.replace('0x', '');
  if (clean.length % 2 !== 0) return '';

  let result = '';
  for (let i = 0; i < clean.length; i += 2) {
    const hexPair = clean.substr(i, 2);
    const charCode = parseInt(hexPair, 16);
    if (charCode === 0) break; // Stop at null terminator
    result += String.fromCharCode(charCode);
  }
  return result;
};

export const fetchMetadata = async (tokenId: number): Promise<NFT | null> => {
  try {
    const response = await fetch(`${IPFS_GATEWAY}${tokenId}.json`);
    if (!response.ok) return null;
    const json = await response.json();

    const isAnimated = json.attributes?.some(
      (attr: any) => attr.trait_type === "HYPE TYPE" && attr.value === "HYPED AF (ANIMATED)"
    );

    let imageUrl = json.image || '';
    if (imageUrl.startsWith('ipfs://')) {
      imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }

    return {
      id: tokenId.toString(),
      name: json.name,
      image: imageUrl,
      description: json.description,
      attributes: json.attributes,
      isAnimated: !!isAnimated
    };
  } catch (e) {
    console.warn(`Error fetching metadata for token ${tokenId}`, e);
    throw new Error(`Failed to fetch metadata for token ${tokenId}`);
  }
};
