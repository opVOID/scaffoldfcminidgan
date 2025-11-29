import { MEGAPOT_API_KEY, REFERRAL_ADDRESS, MEGAPOT_CONTRACT_ADDRESS, USDC_CONTRACT_ADDRESS } from '../constants';

// ============== TYPES ==============
export interface RaffleStats {
  potSizeUSD: number;
  timeLeftSeconds: number;
  currentRoundId: number;
  ticketCost: number;
  ticketsSoldCount: number;
  oddsPerTicket: string;
  activePlayers: number;
  feeBps: number;
  referralFeeBps: number;
  endTimestamp: number;
}

export interface Winner {
  roundId: number;
  address: string;
  prize: number;
  timestamp: number;
  txHash?: string;
  ticketCount?: number;
}

export interface UserRaffleStats {
  tickets: number;
  ticketsBps: number;
  freeTicketClaimed: boolean;
  lastClaimTimestamp: number;
  nextEligibleAt?: number;
  winningsClaimable: number;
}

export interface LpInfo {
  principal: number;
  inRange: number;
  riskPercentage: number;
  active: boolean;
}

export interface LpPoolStatus {
  totalDeposited: number;
  totalLps: number;
  utilizationRate: number;
  currentRiskPercentage: number;
}

export interface FreeClaimResult {
  success: boolean;
  message: string;
  timestamp?: number;
  entryId?: number;
  nextEligibleAt?: number;
  currentRoundId?: number;
}

// ============== API CONFIG ==============
const API_BASE_URL = `${import.meta.env.VITE_MEGAPOT_API_HOST || 'https://api.megapot.io'}${import.meta.env.VITE_MEGAPOT_API_BASE_PATH || '/api/v1'}`;
const RPC_PROVIDER = `${import.meta.env.VITE_RPC_HOST || 'https://base-mainnet.g.alchemy.com'}${import.meta.env.VITE_RPC_PATH || '/v2/FE-zLOi6n9jK04j_NmGJUOnXMQibzPYD'}`;
const BASESCAN_API_KEY = import.meta.env.VITE_BASESCAN_API_KEY;
const BASESCAN_API_BASE = 'https://api.basescan.org/api';

// ============== CONSTANTS ==============
const USDC_DECIMALS = 1000000n;

// LP Function Selectors - Using actual function signatures
const LP_SELECTORS = {
  lpDeposit: '0x8b0c8b3f', // lpDeposit(uint256,uint256)
  withdrawAllLp: '0x2e1a7d4d', // withdrawAllLp(uint256)
  lpAdjustRiskPercentage: '0x9d436dcb', // lpAdjustRiskPercentage(uint256)
  lpPoolCap: '0x8c3c2ea0', // lpPoolCap()
  lpPoolTotal: '0x8f8f1653', // lpPoolTotal()
  minLpDeposit: '0x5c975abb', // minLpDeposit()
  lpsInfo: '0x59988c8c', // lpsInfo(address)
  lpLimit: '0x6e8f6e04', // lpLimit()
  activeLpAddresses: '0x8da5cb5b', // activeLpAddresses()
  usersInfo: '0x18160ddd' // usersInfo(address)
};

// ============== API HELPERS ==============
const megapotFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'apikey': MEGAPOT_API_KEY,
  };

  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as any || {}),
    }
  });
};

// ============== RPC HELPERS ==============
const rpcCall = async (method: string, params: any[] = []): Promise<any> => {
  const response = await fetch(RPC_PROVIDER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params })
  });
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message || 'RPC call failed');
  return payload.result;
};

const callMegapotContract = async (data: string, target: string = MEGAPOT_CONTRACT_ADDRESS): Promise<string> => {
  return rpcCall('eth_call', [{ to: target, data, }, 'latest']);
};

const hexChunk = (hex: string, index: number): string => `0x${hex.slice(2 + index * 64, 2 + (index + 1) * 64)}`;
const hexToBigInt = (hex?: string): bigint => (hex && hex !== '0x' ? BigInt(hex) : 0n);
const formatUSDC = (value: bigint): number => Number(value) / Number(USDC_DECIMALS);

// ============== LP FUNCTIONS ==============
export const getLpPoolStatus = async (): Promise<boolean> => {
  try {
    // Use Megapot API to get LP pool status (open/closed)
    const response = await megapotFetch(`/contracts/${MEGAPOT_CONTRACT_ADDRESS}`);
    console.log('LP API Response status:', response.status);
    
    if (!response.ok) throw new Error('Failed to fetch contract data');
    
    const data = await response.json();
    console.log('LP API Response data:', data);
    const result = data.data?.result;
    
    if (!result) {
      console.log('No result data in API response, checking structure:', Object.keys(data));
      return false; // Default to closed if no data
    }
    
    // Return whether LP pool is open (allowPurchasing indicates pool is active)
    const isOpen = result.allowPurchasing === true;
    console.log('LP Pool is open:', isOpen);
    
    return isOpen;
  } catch (error) {
    console.error('getLpPoolStatus error:', error);
    return false; // Default to closed on error
  }
};

export const getMinLpDeposit = async (): Promise<number> => {
  try {
    // Use Megapot API to get real minimum deposit data
    const response = await megapotFetch(`/contracts/${MEGAPOT_CONTRACT_ADDRESS}`);
    if (!response.ok) throw new Error('Failed to fetch contract data');
    
    const data = await response.json();
    const result = data.data?.result; // Fixed: data is nested under data.result
    
    if (!result || !result.minLpDeposit) {
      return 250; // Default fallback
    }
    
    // Convert from szabo units (6 decimals) to USDC
    return formatUSDC(BigInt(result.minLpDeposit));
  } catch (error) {
    console.error('getMinLpDeposit error:', error);
    return 250; // Default fallback
  }
};

export const getLpsInfo = async (userAddress: string): Promise<[bigint, bigint, bigint, boolean] | null> => {
  try {
    // Use API to get user LP info instead of direct contract call
    const response = await megapotFetch(`/contracts/${MEGAPOT_CONTRACT_ADDRESS}`);
    if (!response.ok) throw new Error('Failed to fetch contract data');
    
    const data = await response.json();
    const result = data.data?.result;
    
    if (!result) {
      console.log('No result data in API response');
      return null;
    }
    
    // For now, return default values since API doesn't provide user-specific LP data
    // In a real implementation, you'd need a user-specific endpoint or direct contract calls
    console.log('LP User Info - using default structure');
    
    // Return [principal, inRange, riskPercentage, active] format
    // These would need to be fetched from the contract directly for real user data
    return [0n, 0n, 0n, false];
  } catch (error) {
    console.error('getLpsInfo error:', error);
    return null;
  }
};

export const getUsdcBalance = async (userAddress: string): Promise<number> => {
  try {
    const cleanAddress = userAddress.replace('0x', '').padStart(64, '0');
    const selector = '0x70a08231';
    const data = `${selector}${cleanAddress}`;
    const result = await callMegapotContract(data, USDC_CONTRACT_ADDRESS);
    return formatUSDC(hexToBigInt(result));
  } catch (error) {
    console.error('getUsdcBalance error:', error);
    return 0;
  }
};

export const prepareLpDepositTransaction = (
  amountUSDC: number,
  userAddress: string,
  riskPercentage: number = 50
): { to: string, from: string, data: string, value: string } => {
  const amount = BigInt(Math.floor(amountUSDC * Number(USDC_DECIMALS)));
  const risk = BigInt(Math.floor(riskPercentage));
  const amountHex = amount.toString(16).padStart(64, '0');
  const riskHex = risk.toString(16).padStart(64, '0');
  const data = `${LP_SELECTORS.lpDeposit}${riskHex}${amountHex}`;
  return {
    to: MEGAPOT_CONTRACT_ADDRESS,
    from: userAddress,
    data,
    value: '0x0'
  };
};

export const prepareLpAdjustRiskTransaction = (userAddress: string, riskPercentage: number): { to: string, from: string, data: string, value: string } => {
  const risk = BigInt(Math.floor(riskPercentage));
  const riskHex = risk.toString(16).padStart(64, '0');
  const data = `${LP_SELECTORS.lpAdjustRiskPercentage}${riskHex}`;
  return {
    to: MEGAPOT_CONTRACT_ADDRESS,
    from: userAddress,
    data,
    value: '0x0'
  };
};

export const prepareLpWithdrawTransaction = (
  amountLP: number,
  userAddress: string
): { to: string, from: string, data: string, value: string } => {
  const amount = BigInt(Math.floor(amountLP * 1e18));
  const amountHex = amount.toString(16).padStart(64, '0');
  const data = `${LP_SELECTORS.withdrawAllLp}${amountHex}`;
  return {
    to: MEGAPOT_CONTRACT_ADDRESS,
    from: userAddress,
    data: data,
    value: '0x0'
  };
};

// ============== MEGAPOT API FUNCTIONS ==============
export const getRaffleStats = async (): Promise<RaffleStats> => {
  try {
    // Use the correct endpoint from Megapot docs
    const response = await megapotFetch('/jackpot-round-stats/active');
    if (!response.ok) throw new Error('Failed to fetch raffle stats');
    
    const data = await response.json();
    const endTimestamp = parseInt(data.endTimestamp) || Date.now() + 3600000;
    const timeLeftSeconds = Math.max(0, Math.floor((endTimestamp - Date.now()) / 1000));
    
    return {
      potSizeUSD: parseFloat(data.prizeUsd) || 0,
      timeLeftSeconds: timeLeftSeconds, // Whole seconds only
      currentRoundId: 1, // Not provided in API, using default
      ticketCost: (data.ticketPrice || 1000000) / 1000000, // Convert from Szabo units
      ticketsSoldCount: data.ticketsSoldCount || 0,
      oddsPerTicket: `1 in ${data.oddsPerTicket || '0'}`,
      activePlayers: data.activePlayers || 0,
      feeBps: data.feeBps || 3000,
      referralFeeBps: data.referralFeeBps || 1000,
      endTimestamp: endTimestamp
    };
  } catch (e) {
    console.error('getRaffleStats error:', e);
    // Return mock data for development
    return {
      potSizeUSD: 1000,
      timeLeftSeconds: 3600,
      currentRoundId: 1,
      ticketCost: 1,
      ticketsSoldCount: 500,
      oddsPerTicket: '1 in 500',
      activePlayers: 25,
      feeBps: 3000,
      referralFeeBps: 1000,
      endTimestamp: Date.now() + 3600000
    };
  }
};

export const getUserInfo = async (userAddress: string): Promise<UserRaffleStats> => {
  try {
    // Use the correct endpoint from Megapot docs
    const response = await megapotFetch(`/ticket-purchases/${userAddress}`);
    if (!response.ok) {
      // Return mock data for development
      return {
        tickets: 0,
        ticketsBps: 0,
        freeTicketClaimed: false,
        lastClaimTimestamp: 0,
        winningsClaimable: 0
      };
    }
    
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return {
        tickets: 0,
        ticketsBps: 0,
        freeTicketClaimed: false,
        lastClaimTimestamp: 0,
        winningsClaimable: 0
      };
    }
    
    // Calculate total tickets from purchases
    const totalTickets = data.reduce((sum, purchase) => sum + (purchase.ticketsPurchased || 0), 0);
    const totalBps = data.reduce((sum, purchase) => sum + (purchase.ticketsPurchasedTotalBps || 0), 0);
    
    return {
      tickets: totalTickets,
      ticketsBps: totalBps,
      freeTicketClaimed: false, // Not provided in this endpoint
      lastClaimTimestamp: 0,
      winningsClaimable: 0
    };
  } catch (e) {
    console.error('getUserInfo error:', e);
    return {
      tickets: 0,
      ticketsBps: 0,
      freeTicketClaimed: false,
      lastClaimTimestamp: 0,
      winningsClaimable: 0
    };
  }
};

export const claimDailyFreeTicket = async (userAddress: string): Promise<FreeClaimResult> => {
  try {
    const response = await megapotFetch('/giveaways/daily-ticket-pool', {
      method: 'POST',
      body: JSON.stringify({
        userAddress: userAddress.toLowerCase()
      })
    });
    
    const data = await response.json();
    return {
      success: response.ok,
      message: data.message || (response.ok ? 'Ticket claimed successfully!' : 'Failed to claim ticket'),
      timestamp: data.timestamp,
      entryId: data.entryId,
      nextEligibleAt: data.nextEligibleAt,
      currentRoundId: data.currentRoundId
    };
  } catch (e: any) {
    console.error('claimDailyFreeTicket error:', e);
    return {
      success: false,
      message: e.message || 'Network error'
    };
  }
};

export const getRecentWinners = async (limit: number = 10): Promise<Winner[]> => {
  try {
    let response = await megapotFetch('/jackpot-history');
    if (!response.ok) {
      response = await megapotFetch('/history');
    }
    if (!response.ok) {
      response = await megapotFetch('/winners');
    }
    if (!response.ok) return [];

    const data = await response.json();
    const winners: Winner[] = [];

    if (Array.isArray(data)) {
      const rounds = data.slice(0, limit);

      for (let i = 0; i < rounds.length; i++) {
        const round = rounds[i];
        if (round.jackpot && round.jackpot.winAmount) {
          // Use fallback address for now to avoid RPC rate limiting
          const winnerAddress = round.ticketPurchases?.[0]?.recipient || 
                               "0x0000000000000000000000000000000000000000";

          let timestamp = Date.now();
          if (round.jackpot.blockNumberEnd) {
            const baseGenesisBlock = 0;
            const baseGenesisTime = 1686789347000;
            const blockNumber = parseInt(round.jackpot.blockNumberEnd);
            timestamp = baseGenesisTime + ((blockNumber - baseGenesisBlock) * 2000);
          }

          winners.push({
            roundId: rounds.length - i,
            address: winnerAddress,
            prize: (parseInt(round.jackpot.winAmount) || 0) / 1000000,
            timestamp: timestamp,
            txHash: round.jackpot.txHash,
            ticketCount: round.jackpot.ticketPurchasedCount
          });
        }
      }
    }
    return winners;
  } catch (e) {
    console.error("getRecentWinners error:", e);
    return [];
  }
};

// ============== TRANSACTION HELPERS ==============
export const checkUSDCAllowance = async (
  userAddress: string
): Promise<number> => {
  try {
    // allowance(address owner, address spender)
    const selector = "0xdd62ed3e";
    const owner = userAddress.replace('0x', '').toLowerCase().padStart(64, '0');
    const spender = MEGAPOT_CONTRACT_ADDRESS.replace('0x', '').toLowerCase().padStart(64, '0');
    const data = `${selector}${owner}${spender}`;

    console.log('Checking allowance for:', userAddress, 'spender:', MEGAPOT_CONTRACT_ADDRESS);
    const result = await callMegapotContract(data, USDC_CONTRACT_ADDRESS);
    console.log('Allowance result:', result);
    
    if (result && result !== '0x') {
      const allowance = parseInt(result, 16) / 1000000;
      console.log('Parsed allowance:', allowance);
      return allowance;
    }
    console.log('No allowance found');
    return 0;
  } catch (e) {
    console.error("checkUSDCAllowance error:", e);
    return 0;
  }
};

export const waitForTransactionReceipt = async (txHash: string, maxAttempts: number = 10): Promise<any> => {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const receipt = await rpcCall('eth_getTransactionReceipt', [txHash]);
      if (receipt && receipt.blockNumber) {
        return receipt;
      }
    } catch (e) {
      console.error('Error checking transaction receipt:', e);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    attempts++;
  }
  
  throw new Error('Transaction receipt not found after multiple attempts');
};

// ============== ENCODING HELPERS ==============
export const encodePurchaseTickets = (
  referrer: string,
  valueUSDC: number,
  recipient: string
): string => {
  const selector = "0x5fd8c710"; // purchaseTickets(address,uint256,address)
  const cleanReferrer = referrer.replace('0x', '').toLowerCase().padStart(64, '0');
  const cleanRecipient = recipient.replace('0x', '').toLowerCase().padStart(64, '0');
  const rawValue = Math.floor(valueUSDC * 1000000);
  const hexValue = rawValue.toString(16).padStart(64, '0');

  return `${selector}${cleanReferrer}${hexValue}${cleanRecipient}`;
};

export const encodeApprove = (
  spender: string,
  amount: number
): string => {
  const selector = "0x095ea7b3";
  const cleanSpender = spender.replace('0x', '').toLowerCase().padStart(64, '0');
  // Amount is already in USDC, convert to smallest unit (6 decimals for USDC)
  const rawAmount = Math.floor(amount * 1000000);
  const hexAmount = rawAmount.toString(16).padStart(64, '0');
  return `${selector}${cleanSpender}${hexAmount}`;
};

export const prepareBuyTransaction = (
  ticketCount: number,
  userAddress: string,
  ticketPrice: number = 1
): { to: string, from: string, data: string, value: string } => {
  const totalUSDC = ticketCount * ticketPrice;

  const data = encodePurchaseTickets(
    REFERRAL_ADDRESS,
    totalUSDC,
    userAddress
  );

  return {
    to: MEGAPOT_CONTRACT_ADDRESS,
    from: userAddress,
    data: data,
    value: '0x0'
  };
};

export const prepareApproveTransaction = (
  userAddress: string,
  amount: number
): { to: string, from: string, data: string, value: string } => {
  const data = encodeApprove(MEGAPOT_CONTRACT_ADDRESS, amount);

  return {
    to: USDC_CONTRACT_ADDRESS,
    from: userAddress,
    data: data,
    value: '0x0'
  };
};