
export const CONTRACT_ADDRESS = "0xB7116Be05Bf2662a0F60A160F29b9cb69Ade67Be";
export const BASE_CHAIN_ID = 8453;
export const EXPLORER_URL = "https://basescan.org";
export const APP_URL = "https://fcphunksmini.vercel.app";

// RPC - Using LlamaRPC for better public access and CORS handling
export const RPC_URL = "https://base.llamarpc.com"; 
export const IPFS_GATEWAY = "https://ipfs.io/ipfs/bafybeibu47rax5yr4bdkl7gxqttyumkf54pl3jvwxdnxqbfqfytd6qfcvi/";

// Safe Environment Variable Access
const metaEnv = (import.meta as any).env;

export const env = {
  VITE_KV_REST_API_URL: metaEnv?.VITE_KV_REST_API_URL || "",
  VITE_KV_REST_API_TOKEN: metaEnv?.VITE_KV_REST_API_TOKEN || "",
  VITE_NEYNAR_API_KEY: metaEnv?.VITE_NEYNAR_API_KEY || "",
};

// Vercel KV (Upstash) Credentials
export const KV_REST_API_URL = env.VITE_KV_REST_API_URL;
export const KV_REST_API_TOKEN = env.VITE_KV_REST_API_TOKEN;

// Neynar API for Farcaster Data
export const NEYNAR_API_KEY = env.VITE_NEYNAR_API_KEY;

// MegaPot Config
export const MEGAPOT_API_KEY = "cZ0nVsc61Ttn9Omasz3w";
export const REFERRAL_ADDRESS = "0x5872286f932E5b015Ef74B2f9c8723022D1B5e1B";
export const MEGAPOT_CONTRACT_ADDRESS = "0x4C770B0E5D5c3035348259e86E207000A22D2983";
export const MEGAPOT_LOGO_URL = "https://raw.githubusercontent.com/opVOID/scaffoldfcminidgan/refs/heads/main/megapoints-small.png?token=GHSAT0AAAAAADPL6E3VLKDYOGEC5YEUPHRC2JHGSUQ"; 

// Function Selectors for Raw RPC Calls
export const SELECTORS = {
  totalSupply: "0x18160ddd",     // totalSupply()
  maxSupply: "0xd5abeb01",       // maxSupply()
  cost: "0x2c6a0e66",            // cost()
  walletOfOwner: "0x2790965c",   // walletOfOwner(address)
  buyTicketsRef: "0x5361093f"    // buyTickets(address referral) - Example selector, ensures referral
};

export const NAV_ITEMS = [
  { id: 'mint', label: 'MINT', icon: 'Home' },
  { id: 'rank', label: 'RANK', icon: 'Trophy' },
  { id: 'airdrop', label: 'AIRDROP', icon: 'Gift' },
  { id: 'card', label: 'CARD', icon: 'CreditCard' },
  { id: 'raffle', label: 'RAFFLE', icon: 'Dices' },
];
