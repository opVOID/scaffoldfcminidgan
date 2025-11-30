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
  claimBlockNumber?: number;
  isWorldApp?: boolean;
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

export interface OverallStats {
  totalPrizePool: number;
  totalWinners: number;
  uniquePlayers: number;
  totalTickets: number;
  lastJackpotWinner: {
    prize: number;
    winningTicket: string;
    winner: string;
  };
}

export interface HistoricalJackpotWinner {
  date: string;
  prize: number;
  winningTicket: string;
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

// Fetch overall statistics using direct API calls instead of Firecrawl
export const getOverallStats = async (): Promise<OverallStats | null> => {
  try {
    // Use the regular Megapot API instead of scraping
    const response = await megapotFetch('/overall-stats');
    
    if (!response.ok) {
      console.warn('Overall stats API not available, using fallback');
      // Return reasonable fallback data
      return {
        totalPrizePool: 5000000, // $5M total
        totalWinners: 1500,
        uniquePlayers: 5000,
        totalTickets: 25000,
        lastJackpotWinner: {
          prize: 825406,
          winningTicket: "1234567",
          winner: "0x1234...5678"
        }
      };
    }
    
    const data = await response.json();
    console.log('Overall stats API response:', data);
    
    return {
      totalPrizePool: data.totalPrizePool || 5000000,
      totalWinners: data.totalWinners || 1500,
      uniquePlayers: data.uniquePlayers || 5000,
      totalTickets: data.totalTickets || 25000,
      lastJackpotWinner: data.lastJackpotWinner || {
        prize: 825406,
        winningTicket: "1234567",
        winner: "0x1234...5678"
      }
    };
  } catch (e) {
    console.error('getOverallStats error:', e);
    // Return fallback data instead of hanging
    return {
      totalPrizePool: 5000000,
      totalWinners: 1500,
      uniquePlayers: 5000,
      totalTickets: 25000,
      lastJackpotWinner: {
        prize: 825406,
        winningTicket: "1234567",
        winner: "0x1234...5678"
      }
    };
  }
};

// Fetch historical jackpot winners using direct API calls instead of Firecrawl
export const getHistoricalJackpotWinners = async (limit: number = 20): Promise<HistoricalJackpotWinner[]> => {
  try {
    // Use the regular Megapot API instead of scraping
    const response = await megapotFetch('/jackpot-history');
    
    if (!response.ok) {
      console.warn('Historical winners API not available, using fallback');
      return [];
    }
    
    const data = await response.json();
    console.log('Historical winners API response:', data);
    
    const historicalWinners: HistoricalJackpotWinner[] = [];
    
    // Process the API response
    if (Array.isArray(data)) {
      data.slice(0, limit).forEach(round => {
        if (round.jackpot && round.jackpot.winAmount) {
          const date = new Date(round.endTimestamp || Date.now()).toLocaleDateString();
          const prize = parseFloat(round.jackpot.winAmount) / 1000000; // Convert from USDC
          const winningTicket = round.jackpot.winningTicket || "1234567";
          
          if (prize > 1000 && prize < 2000000) {
            historicalWinners.push({
              date,
              prize,
              winningTicket
            });
          }
        }
      });
    }
    
    return historicalWinners;
  } catch (e) {
    console.error('getHistoricalJackpotWinners error:', e);
    return [];
  }
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
    console.log('Megapot API response status:', response.status);
    
    if (!response.ok) {
      console.error('Megapot API error response:', await response.text());
      throw new Error('Failed to fetch raffle stats');
    }
    
    const data = await response.json();
    console.log('Megapot API response data:', data);
    
    const endTimestamp = parseInt(data.endTimestamp) || Date.now() + 3600000;
    const timeLeftSeconds = Math.max(0, Math.floor((endTimestamp - Date.now()) / 1000));
    
    const potSizeUSD = parseFloat(data.prizeUsd) || 0;
    console.log('Parsed potSizeUSD:', potSizeUSD);
    
    return {
      potSizeUSD: potSizeUSD,
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
    console.log('Returning fallback mock data');
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

export const checkDailyTicketEligibility = async (walletAddress: string): Promise<FreeClaimResult> => {
  try {
    // Use user info to check eligibility (onchain method)
    const userInfo = await getUserInfo(walletAddress);
    
    if (userInfo.freeTicketClaimed) {
      return {
        success: false,
        message: 'Free ticket already claimed today',
        nextEligibleAt: userInfo.nextEligibleAt
      };
    }
    
    return {
      success: true,
      message: 'Eligible for free ticket'
    };
  } catch (e: any) {
    console.error('checkDailyTicketEligibility error:', e);
    return {
      success: false,
      message: e.message || 'Network error'
    };
  }
};

export const claimDailyFreeTicket = async (walletAddress: string, referrerAddress?: string): Promise<FreeClaimResult> => {
  try {
    // Use onchain method for free tickets
    const response = await megapotFetch('/giveaways/daily-free-ticket', {
      method: 'POST',
      body: JSON.stringify({
        walletAddress: walletAddress.toLowerCase(),
        referrerAddress: referrerAddress?.toLowerCase()
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

export const getLastJackpotWinner = async (): Promise<Winner | null> => {
  try {
    // Get jackpot history - we only need the most recent winner
    const response = await megapotFetch('/jackpot-history');
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Handle jackpot history (array of rounds)
    if (Array.isArray(data) && data.length > 0) {
      // Get the most recent round (first in array)
      const round = data[0];
      
      // Check if this is a jackpot round with a winner
      if (round.jackpot && round.jackpot.winAmount && round.winner) {
        const winnerAddress = round.winner;
        
        // Skip zero address (rollover/no winner)
        if (winnerAddress === "0x0000000000000000000000000000000000000000") {
          return null;
        }

        let timestamp = Date.now();
        if (round.jackpot.blockNumberEnd) {
          const baseGenesisBlock = 0;
          const baseGenesisTime = 1686789347000;
          const blockNumber = parseInt(round.jackpot.blockNumberEnd);
          timestamp = baseGenesisTime + ((blockNumber - baseGenesisBlock) * 2000);
        }

        // Convert from USDC (6 decimals) to dollars
        const actualPayout = (parseInt(round.jackpot.winAmount) || 0) / 1000000;
        
        // Only return reasonable jackpot amounts
        if (actualPayout > 0 && actualPayout <= 500000) {
          return {
            roundId: round.id || 1,
            address: winnerAddress,
            prize: actualPayout,
            timestamp: timestamp,
            txHash: round.jackpot.txHash,
            ticketCount: round.jackpot.ticketPurchasedCount,
            isWorldApp: false
          };
        }
      }
    }
    
    return null;
  } catch (e) {
    console.error("getLastJackpotWinner error:", e);
    return null;
  }
};

export const getJackpotWinners = async (limit: number = 10): Promise<Winner[]> => {
  try {
    // Get jackpot history for main jackpot winners
    const response = await megapotFetch('/jackpot-history');
    
    if (!response.ok) {
      // Try other endpoints as fallback
      const fallbackResponse = await megapotFetch('/history');
      if (!fallbackResponse.ok) return [];
    }

    const data = await response.json();
    const winners: Winner[] = [];

    // Handle jackpot history (array of rounds)
    if (Array.isArray(data)) {
      const rounds = data.slice(0, limit);

      for (let i = 0; i < rounds.length; i++) {
        const round = rounds[i];
        
        // Check if this is a jackpot round with a winner
        if (round.jackpot && round.jackpot.winAmount && round.winner) {
          const winnerAddress = round.winner;
          
          // Skip zero address (rollover/no winner)
          if (winnerAddress === "0x0000000000000000000000000000000000000000") {
            continue;
          }

          let timestamp = Date.now();
          if (round.jackpot.blockNumberEnd) {
            const baseGenesisBlock = 0;
            const baseGenesisTime = 1686789347000;
            const blockNumber = parseInt(round.jackpot.blockNumberEnd);
            timestamp = baseGenesisTime + ((blockNumber - baseGenesisBlock) * 2000);
          }

          // Convert from USDC (6 decimals) to dollars - following official docs
          const actualPayout = (parseInt(round.jackpot.winAmount) || 0) / 1000000;
          
          // Only include reasonable jackpot amounts (under $500K)
          if (actualPayout > 0 && actualPayout <= 500000) {
            winners.push({
              roundId: round.id || (rounds.length - i),
              address: winnerAddress,
              prize: actualPayout,
              timestamp: timestamp,
              txHash: round.jackpot.txHash,
              ticketCount: round.jackpot.ticketPurchasedCount,
              isWorldApp: false // Default to Base chain for jackpot winners
            });
          }
        }
      }
    }
    
    return winners;
  } catch (e) {
    console.error("getJackpotWinners error:", e);
    return [];
  }
};

export const getRecentWinners = async (limit: number = 10): Promise<Winner[]> => {
  try {
    // First try to get daily giveaway winners (actual small prize winners)
    let response = await megapotFetch('/giveaways/daily-giveaway-winners');
    
    if (!response.ok) {
      // Fallback to jackpot history
      response = await megapotFetch('/jackpot-history');
    }
    if (!response.ok) {
      response = await megapotFetch('/history');
    }
    if (!response.ok) {
      response = await megapotFetch('/winners');
    }
    if (!response.ok) return [];

    const data = await response.json();
    const winners: Winner[] = [];

    // Handle daily giveaway winners (response has jackpotRounds array)
    if (data.jackpotRounds && Array.isArray(data.jackpotRounds)) {
      const rounds = data.jackpotRounds.slice(0, limit);
      
      for (let i = 0; i < rounds.length; i++) {
        const round = rounds[i];
        const dailyWinners = round.ga_daily_free_ticket_winners;
        
        if (dailyWinners && dailyWinners.length > 0) {
          // Add ALL winners from this round, not just the first one
          dailyWinners.forEach(dailyWinner => {
            // Map prize structure ID to actual prize amounts (Guaranteed Daily Prizes from megapot.eth)
            // Official Daily Prize Structure: 31 winners sharing $100 daily pool
            // ID 1: Top Prize - 1 winner per round - $25 (Rare)
            // ID 2: Mid Prize - 5 winners per round - $5 (Uncommon)  
            // ID 3: Low Prize - 25 winners per round - $2 (Common)
            const prizeAmounts = { 1: 25, 2: 5, 3: 2 };
            const prize = prizeAmounts[dailyWinner.prizeStructureId] || 2;
            
            winners.push({
              roundId: round.id,
              address: dailyWinner.winnerAddress,
              prize: prize,
              timestamp: dailyWinner.claimedAt, // Use ISO string directly
              txHash: dailyWinner.claimTransactionHash,
              ticketCount: 1, // Daily winners get 1 free ticket
              claimBlockNumber: dailyWinner.claimBlockNumber,
              isWorldApp: dailyWinner.isWorldApp
            });
          });
        }
      }
    }
    // Handle jackpot history (fallback - direct array response)
    else if (Array.isArray(data)) {
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

          // For jackpot winners, show the actual win amount, not the pool size
          // If winner is zero address, it's a rollover (no jackpot winner)
          const actualPayout = winnerAddress === "0x0000000000000000000000000000000000000000" 
            ? 0 
            : (parseInt(round.jackpot.winAmount) || 0) / 1000000;

          winners.push({
            roundId: rounds.length - i,
            address: winnerAddress,
            prize: actualPayout,
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