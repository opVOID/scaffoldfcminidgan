
export type PageType = 'mint' | 'rank' | 'airdrop' | 'card' | 'raffle';

export interface WalletState {
  address: string | null;
  chainId: number | null;
  connected: boolean;
  providerName: string | null;
  provider?: any;
}

export interface ContractInfo {
  address: string;
  totalSupply: number;
  maxSupply: number;
  price: number;
  isPublicSaleActive: boolean;
}

export interface Trait {
  trait_type: string;
  value: string | number;
}

export interface NFT {
  id: string;
  name: string;
  image: string;
  description: string;
  attributes: Trait[];
  isAnimated: boolean;
}

export interface FarcasterProfile {
  username: string;
  pfp: string;
  fid: number;
}

export interface UserData {
  lastCheckIn: number; // Timestamp
  streak: number;
  xp: number;
  farcaster?: FarcasterProfile;
}

export interface ReferralReward {
  amount: string;
  isLoading: boolean;
  error: string | null;
}
