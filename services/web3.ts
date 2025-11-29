
import { CONTRACT_ADDRESS, RPC_URL, IPFS_GATEWAY, SELECTORS } from '../constants';
import { NFT } from '../types';

// Helper to encode function calls for JSON-RPC
const encodeFunctionCall = (functionSignature: string, addressArg?: string): string => {
  if (functionSignature === 'walletOfOwner(address)') {
    if (!addressArg) return '0x';
    const cleanAddr = addressArg.replace('0x', '');
    return `${SELECTORS.walletOfOwner}000000000000000000000000${cleanAddr}`;
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

    const batchBody = [
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: CONTRACT_ADDRESS, data: SELECTORS.totalSupply }, 'latest']
      },
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'eth_call',
        params: [{ to: CONTRACT_ADDRESS, data: SELECTORS.maxSupply }, 'latest']
      },
      {
        jsonrpc: '2.0',
        id: 3,
        method: 'eth_call',
        params: [{ to: CONTRACT_ADDRESS, data: SELECTORS.cost }, 'latest']
      }
    ];

    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchBody)
    });

    if (!response.ok) {
      console.error(`RPC HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    let results;
    try {
      results = JSON.parse(text);
    } catch (e) {
      console.warn("Failed to parse JSON response", text);
      throw new Error("Invalid JSON response from RPC");
    }

    const totalSupplyRes = Array.isArray(results) ? results.find((r: any) => r.id === 1) : null;
    const maxSupplyRes = Array.isArray(results) ? results.find((r: any) => r.id === 2) : null;
    const costRes = Array.isArray(results) ? results.find((r: any) => r.id === 3) : null;

    console.log('NFT Contract Responses:', { totalSupplyRes, maxSupplyRes, costRes });

    // Handle rate limiting errors - keep previous values
    if (totalSupplyRes?.error?.code === -32016 || maxSupplyRes?.error?.code === -32016) {
      console.warn('Rate limit hit, returning cached values');
      if (cachedStats) {
        return cachedStats;
      }
      // If no cache, return fallback values
      return {
        totalSupply: 0,
        maxSupply: 11305,
        price: 0.002
      };
    }

    const totalSupply = totalSupplyRes?.result && totalSupplyRes.result !== '0x' ? hexToDecimal(totalSupplyRes.result) : 0;
    const maxSupply = maxSupplyRes?.result && maxSupplyRes.result !== '0x' ? hexToDecimal(maxSupplyRes.result) : 11305;
    const price = costRes?.result && costRes.result !== '0x' ? hexToEth(costRes.result) : 0.002;

    const stats = {
      totalSupply,
      maxSupply,
      price
    };

    // Cache the successful result
    cachedStats = stats;
    lastCacheTime = Date.now();

    return stats;
  } catch (error) {
    console.error("Error fetching collection stats:", error);
    // Return cached values if available, otherwise fallback
    if (cachedStats) {
      console.log('Returning cached stats due to error:', cachedStats);
      return cachedStats;
    }
    // Return fallback values instead of throwing
    return {
      totalSupply: 0,
      maxSupply: 11305,
      price: 0.002
    };
  }
};

export const fetchUserNFTs = async (address: string): Promise<NFT[]> => {
  try {
    const callData = encodeFunctionCall('walletOfOwner(address)', address);
    const rpcBody = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: CONTRACT_ADDRESS, data: callData }, 'latest']
    };

    const rpcRes = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rpcBody)
    });

    const rpcJson = await rpcRes.json();

    if (rpcJson.error) {
      // console.warn(`RPC Execution Reverted for walletOfOwner on ${address}`);
      return [];
    }
    if (!rpcJson.result) {
      return [];
    }

    const raw = rpcJson.result.replace('0x', '');
    if (raw.length < 64) return [];

    const lengthHex = raw.substring(64, 128);
    const length = parseInt(lengthHex, 16);

    if (isNaN(length) || length === 0) return [];

    const ids: number[] = [];
    for (let i = 0; i < length; i++) {
      const start = 128 + (i * 64);
      if (start + 64 > raw.length) break;
      const idHex = raw.substring(start, start + 64);
      ids.push(parseInt(idHex, 16));
    }

    const nfts = await Promise.all(ids.map(id => fetchMetadata(id)));
    return nfts.filter(n => n !== null) as NFT[];

  } catch (error) {
    console.warn("Error fetching NFTs:", error);
    throw new Error("Failed to fetch user NFTs from contract");
  }
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
