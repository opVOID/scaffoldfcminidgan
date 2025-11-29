// ============== PHUNKS NFT CONTRACT ==============
export const CONTRACT_ADDRESS = "0xB7116Be05Bf2662a0F60A160F29b9cb69Ade67Be";
export const BASE_CHAIN_ID = 8453;
export const EXPLORER_URL = "https://basescan.org";
export const APP_URL = "https://fcphunksmini.vercel.app";

// RPC - Using official Base RPC for better reliability
export const RPC_URL = "https://mainnet.base.org";
export const IPFS_GATEWAY = "https://ipfs.io/ipfs/bafybeibu47rax5yr4bdkl7gxqttyumkf54pl3jvwxdnxqbfqfytd6qfcvi/";

// Safe Environment Variable Access
const metaEnv = (import.meta as any).env;

export const env = {
  VITE_KV_REST_API_URL: metaEnv?.VITE_KV_REST_API_URL || metaEnv?.KV_REST_API_URL || "",
  VITE_KV_REST_API_TOKEN: metaEnv?.VITE_KV_REST_API_TOKEN || metaEnv?.KV_REST_API_TOKEN || "",
  VITE_NEYNAR_API_KEY: metaEnv?.VITE_NEYNAR_API_KEY || metaEnv?.NEYNAR_API_KEY || "",
};

// Vercel KV (Upstash) Credentials
export const KV_REST_API_URL = env.VITE_KV_REST_API_URL;
export const KV_REST_API_TOKEN = env.VITE_KV_REST_API_TOKEN;

// Neynar API for Farcaster Data
export const NEYNAR_API_KEY = env.VITE_NEYNAR_API_KEY;

// ============== MEGAPOT CONFIG ==============
export const MEGAPOT_API_KEY = "cZ0nVsc61Ttn9Omasz3w";
export const REFERRAL_ADDRESS = "0x5872286f932E5b015Ef74B2f9c8723022D1B5e1B";
export const MEGAPOT_CONTRACT_ADDRESS = "0xbEDd4F2beBE9E3E636161E644759f3cbe3d51B95";
export const USDC_CONTRACT_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// FIXED: Correct logo URL from phunksmegapot repo
export const MEGAPOT_LOGO_URL = "https://raw.githubusercontent.com/opVOID/phunksmegapot/main/megapoints-small.png";

// Function Selectors for Raw RPC Calls (NFT Contract)
export const SELECTORS = {
  totalSupply: "0x18160ddd",
  maxSupply: "0xd5abeb01",
  cost: "0x2c6a0e66",
  walletOfOwner: "0x2790965c",
};

export const NAV_ITEMS = [
  { id: 'mint', label: 'MINT', icon: 'Home' },
  { id: 'rank', label: 'RANK', icon: 'Trophy' },
  { id: 'airdrop', label: 'AIRDROP', icon: 'Gift' },
  { id: 'card', label: 'CARD', icon: 'CreditCard' },
  { id: 'raffle', label: 'RAFFLE', icon: 'Dices' },
];
