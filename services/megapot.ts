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

export interface FreeClaimResult {
  success: boolean;
  message: string;
  timestamp?: number;
  entryId?: number;
  nextEligibleAt?: number;
  currentRoundId?: number;
}

// ============== API CONFIG ==============
const API_BASE_URL = "https://api.megapot.io/api/v1";

const megapotFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'apikey': MEGAPOT_API_KEY,
    const response = await megapotFetch('/jackpot-history');
    if(!response.ok) return [];

    const data = await response.json();
    const winners: Winner[] = [];

    if(Array.isArray(data)) {
      for (const round of data.slice(0, limit)) {
    if (round.jackpot && round.jackpot.winAmount) {
      let winnerAddress = "0x0000000000000000000000000000000000000000";
      if (round.ticketPurchases?.length > 0) {
        const lastPurchase = round.ticketPurchases[round.ticketPurchases.length - 1];
        winnerAddress = lastPurchase?.recipient || lastPurchase?.buyer || winnerAddress;
      }

      winners.push({
        roundId: round.jackpot.blockNumberEnd || 0,
        address: winnerAddress,
        prize: (parseInt(round.jackpot.winAmount) || 0) / 1000000,
        timestamp: parseInt(round.jackpot.time) * 1000,
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

// ============== USER DATA ==============
export const getUserRaffleData = async (address: string): Promise<UserRaffleStats> => {
  const addr = address.toLowerCase();

  try {
    // 1. Check free ticket eligibility
    const eligibilityRes = await megapotFetch(`/giveaways/daily-ticket-pool/${addr}`);
    let freeTicketClaimed = false;
    let nextEligibleAt = 0;

    if (eligibilityRes.ok) {
      const eligibility = await eligibilityRes.json();
      freeTicketClaimed = !eligibility.eligible;
      if (eligibility.nextEligibleAt) {
        nextEligibleAt = new Date(eligibility.nextEligibleAt).getTime();
      }
    }

    // 2. Get ticket purchases
    let tickets = 0;
    let ticketsBps = 0;
    try {
      const purchaseRes = await megapotFetch(`/ticket-purchases/${addr}`);
      if (purchaseRes.ok) {
        const purchases = await purchaseRes.json();
        if (Array.isArray(purchases)) {
          purchases.forEach((p: any) => {
            tickets += p.ticketsPurchased || 0;
            ticketsBps += p.ticketsPurchasedTotalBps || 0;
          });
        }
      }
    } catch (e) { /* ignore */ }

    // 3. Get localStorage timestamp for 24h timer
    const lastClaim = localStorage.getItem(`megapot_claim_${addr}`);
    const lastClaimTimestamp = lastClaim ? parseInt(lastClaim) : 0;

    if (freeTicketClaimed && !nextEligibleAt && lastClaimTimestamp) {
      nextEligibleAt = lastClaimTimestamp + (24 * 60 * 60 * 1000);
    }

    return {
      tickets,
      ticketsBps,
      freeTicketClaimed,
      lastClaimTimestamp,
      nextEligibleAt,
      winningsClaimable: 0
    };
  } catch (e) {
    console.error("getUserRaffleData error:", e);
    const lastClaim = localStorage.getItem(`megapot_claim_${addr}`);
    const lastClaimTimestamp = lastClaim ? parseInt(lastClaim) : 0;
    const isClaimed = lastClaimTimestamp > 0 && (Date.now() - lastClaimTimestamp) < (24 * 60 * 60 * 1000);

    return {
      tickets: 0,
      ticketsBps: 0,
      freeTicketClaimed: isClaimed,
      lastClaimTimestamp,
      nextEligibleAt: isClaimed ? lastClaimTimestamp + (24 * 60 * 60 * 1000) : 0,
      winningsClaimable: 0
    };
  }
};

// ============== FREE TICKET CLAIM (Giveaway API) ==============
export const claimDailyFreeTicket = async (address: string): Promise<FreeClaimResult> => {
  const addr = address.toLowerCase();

  try {
    const response = await megapotFetch(`/giveaways/daily-ticket-pool/${addr}`, {
      method: 'POST',
      body: JSON.stringify({ refBypass: false })
    });

    const data = await response.json();

    if (!response.ok || !data.eligible) {
      const nextEligible = data.nextEligibleAt
        ? new Date(data.nextEligibleAt).getTime()
        : Date.now() + (6 * 60 * 60 * 1000);

      return {
        success: false,
        message: data.error || 'Not eligible yet. Try again later.',
        nextEligibleAt: nextEligible,
        currentRoundId: data.currentRoundId
      };
    }

    const now = Date.now();
    localStorage.setItem(`megapot_claim_${addr}`, now.toString());

    return {
      success: true,
      message: 'Free ticket claimed!',
      timestamp: now,
      entryId: data.entryId,
      currentRoundId: data.currentRoundId,
      nextEligibleAt: now + (24 * 60 * 60 * 1000)
    };
  } catch (e) {
    console.error("claimDailyFreeTicket error:", e);
    return {
      success: false,
      message: 'Network error. Please try again.'
    };
  }
};

// ============== TICKET PURCHASE (On-Chain) ==============
export const encodePurchaseTickets = (
  referrer: string,
  valueUSDC: number,
  recipient: string
): string => {
  // purchaseTickets(address referrer, uint256 value, address recipient)
  const selector = "0x7d9a7a4c";

  const cleanReferrer = referrer.replace('0x', '').toLowerCase().padStart(64, '0');
  const cleanRecipient = recipient.replace('0x', '').toLowerCase().padStart(64, '0');

  const rawValue = Math.floor(valueUSDC * 1000000);
  const hexValue = rawValue.toString(16).padStart(64, '0');

  return `${selector}${cleanReferrer}${hexValue}${cleanRecipient}`;
};

export const prepareBuyTransaction = (
  ticketCount: number,
  userAddress: string,
  ticketPrice: number = 1
) => {
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

// ============== USDC APPROVAL ==============
export const encodeApprove = (spender: string, amount: number): string => {
  // approve(address spender, uint256 amount)
  const selector = "0x095ea7b3";
  const cleanSpender = spender.replace('0x', '').toLowerCase().padStart(64, '0');
  const rawAmount = Math.floor(amount * 1000000);
  const hexAmount = rawAmount.toString(16).padStart(64, '0');
  return `${selector}${cleanSpender}${hexAmount}`;
};

export const prepareApproveTransaction = (
  userAddress: string,
  amount: number
) => {
  const data = encodeApprove(MEGAPOT_CONTRACT_ADDRESS, amount);

  return {
    to: USDC_CONTRACT_ADDRESS,
    from: userAddress,
    data: data,
    value: '0x0'
  };
};

// ============== HELPER: Check USDC Allowance ==============
export const checkUSDCAllowance = async (
  userAddress: string
): Promise<number> => {
  try {
    // allowance(address owner, address spender)
    const selector = "0xdd62ed3e";
    const owner = userAddress.replace('0x', '').toLowerCase().padStart(64, '0');
    const spender = MEGAPOT_CONTRACT_ADDRESS.replace('0x', '').toLowerCase().padStart(64, '0');
    const data = `${selector}${owner}${spender}`;

    const response = await fetch('https://base.llamarpc.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: USDC_CONTRACT_ADDRESS, data }, 'latest']
      })
    });

    const result = await response.json();
    if (result.result) {
      return parseInt(result.result, 16) / 1000000;
    }
    return 0;
  } catch (e) {
    console.error("checkUSDCAllowance error:", e);
    return 0;
  }
};

// Backward compatibility
export const getUserInfo = getUserRaffleData;
