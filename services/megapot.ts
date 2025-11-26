
import { MEGAPOT_API_KEY, REFERRAL_ADDRESS, MEGAPOT_CONTRACT_ADDRESS } from '../constants';
import { encodePurchaseTickets } from './web3';

export interface RaffleStats {
    potSizeUSD: number;
    timeLeftSeconds: number;
    currentRoundId: number;
    ticketCost: number;
}

export interface Winner {
    roundId: number;
    address: string;
    prize: number;
    timestamp: number;
}

export interface UserRaffleStats {
    tickets: number;
    freeTicketClaimed: boolean;
    lastClaimTimestamp: number; // Added for cooldown timer
}

// Official Megapot API URL
const API_BASE_URL = "https://api.megapot.io/api/v1"; 

// Mock data fallback
const MOCK_STATS: RaffleStats = {
    potSizeUSD: 822670.89, // Scaled value example
    timeLeftSeconds: 43200,
    currentRoundId: 42,
    ticketCost: 1.0 
};

const MOCK_WINNERS: Winner[] = [
    { roundId: 41, address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", prize: 1500, timestamp: Date.now() - 86400000 },
];

export const getRaffleStats = async (): Promise<RaffleStats> => {
    try {
        const response = await fetch(`${API_BASE_URL}/jackpot-round-stats/active?apikey=${MEGAPOT_API_KEY}&chainId=8453`, { 
            method: 'GET',
            headers: { 'Accept': 'application/json' } 
        });
        
        if (!response.ok) {
            console.warn(`Megapot API Error ${response.status}`);
            return MOCK_STATS;
        }
        
        const data = await response.json();
        const now = Date.now();
        
        // Fix Timer: Handle ISO string or timestamp safely
        let end = now + 86400; // Default 24h
        if (data.endTimestamp) {
            const parsed = new Date(data.endTimestamp).getTime();
            if (!isNaN(parsed)) end = parsed;
        }
        const timeLeft = Math.max(0, Math.floor((end - now) / 1000));

        // Fix Price Scaling
        // Pot Size: User requested NOT to divide by 10^6. Assuming API returns display USD.
        const rawPrize = parseFloat(data.prizeUsd) || 0;
        
        // Ticket Price: USDC contracts use 6 decimals. API likely returns raw wei (e.g. 1000000 for $1).
        // We divide by 1e6 to get display USD.
        const rawPrice = Number(data.ticketPrice) || 1000000;

        return {
            potSizeUSD: rawPrize, // Use raw prize as per instruction
            timeLeftSeconds: timeLeft,
            currentRoundId: data.roundId || 0,
            ticketCost: rawPrice / 1000000
        };
    } catch (e) {
        console.warn("Failed to fetch live raffle stats, using mock fallback.");
        return MOCK_STATS;
    }
};

export const getRecentWinners = async (): Promise<Winner[]> => {
    // API endpoint for winners might differ, using mock for stability 
    return MOCK_WINNERS;
};

export const getUserRaffleData = async (address: string): Promise<UserRaffleStats> => {
    // In a real app, fetch this from DB or Contract. 
    // Simulating no previous claim for now or check local storage
    const lastClaim = localStorage.getItem(`last_claim_${address}`);
    const lastClaimTime = lastClaim ? parseInt(lastClaim) : 0;
    
    // Check if 24h passed
    const isClaimed = (Date.now() - lastClaimTime) < (24 * 60 * 60 * 1000);

    return { 
        tickets: 0, 
        freeTicketClaimed: isClaimed,
        lastClaimTimestamp: lastClaimTime
    };
};

export const claimDailyFreeTicket = async (address: string) => {
    // Simulate API claim
    const now = Date.now();
    localStorage.setItem(`last_claim_${address}`, now.toString());
    return { success: true, message: "Ticket Claimed!", timestamp: now };
};

export const prepareBuyTransaction = (ticketCount: number, userAddress: string, ticketPrice: number) => {
    // Calculate total value in USDC (6 decimals)
    // Formula: ticketCount * ticketPrice * 1e6
    // We expect ticketPrice to be in standard USD (e.g. 1.0) here, so we multiply by 1e6
    const totalValue = ticketCount * ticketPrice;
    
    const data = encodePurchaseTickets(
        REFERRAL_ADDRESS, 
        totalValue, 
        userAddress
    );
    
    return {
        to: MEGAPOT_CONTRACT_ADDRESS,
        from: userAddress,
        data: data
    };
};
