
import { UserData, FarcasterProfile, UserSettings } from '../types';
import { KV_REST_API_URL, KV_REST_API_TOKEN } from '../constants';
import { fetchFarcasterProfile } from './farcaster';

const defaultData: UserData = {
  lastCheckIn: 0,
  streak: 0,
  xp: 0
};


const defaultSettings: UserSettings = {
  newMints: true,
  airdrops: true,
  updates: false
};

// Helper to make KV requests
export async function kvRequest(command: string, args: any[] = []) {
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    console.error("Missing KV Env Variables");
    return null;
  }
  try {
    const response = await fetch(`${KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([command, ...args])
    });
    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error("KV Error:", error);
    return null;
  }
}

export async function kvSet(key: string, value: any) {
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) return null;
  try {
    const setRes = await fetch(`${KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(["SET", key, JSON.stringify(value)])
    });

    return await setRes.json();
  } catch (error) {
    console.error("KV Set Error:", error);
    return null;
  }
}

export async function kvGet(key: string) {
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) return null;
  try {
    const response = await fetch(`${KV_REST_API_URL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(["GET", key])
    });
    const data = await response.json();
    const result = data.result;
    if (!result) return null;
    return JSON.parse(result);
  } catch (error) {
    console.error("KV Get Error:", error);
    return null;
  }
}

export const getUserData = async (address: string): Promise<UserData> => {
  if (!address) return defaultData;
  const data = await kvGet(`user:${address.toLowerCase()}:data`);
  return data || defaultData;
};

export const checkInUser = async (address: string): Promise<{ success: boolean, data: UserData, message: string }> => {
  let userData = await getUserData(address);
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  // Try to fetch/update Farcaster Profile if missing
  if (!userData.farcaster) {
    const profile = await fetchFarcasterProfile(address);
    if (profile) {
      userData.farcaster = profile;
    }
  }

  // Check if 24h passed
  if (now - userData.lastCheckIn < oneDay) {
    const hoursLeft = Math.ceil((userData.lastCheckIn + oneDay - now) / (60 * 60 * 1000));
    return { success: false, data: userData, message: `Wait ${hoursLeft}h for cooldown` };
  }

  // Logic for streak
  if (now - userData.lastCheckIn > oneDay * 2) {
    userData.streak = 1; // Reset streak if missed a day (over 48h)
  } else {
    userData.streak += 1;
  }

  userData.lastCheckIn = now;
  userData.xp += 50; // Base XP for check-in

  await kvSet(`user:${address.toLowerCase()}:data`, userData);

  return { success: true, data: userData, message: "Checked in! +50 XP" };
};

export const rewardUserShare = async (address: string): Promise<{ success: boolean, xpAdded: number }> => {
  if (!address) return { success: false, xpAdded: 0 };

  let userData = await getUserData(address);
  userData.xp += 1;

  await kvSet(`user:${address.toLowerCase()}:data`, userData);
  return { success: true, xpAdded: 1 };
};

export const getSettings = async (address: string): Promise<UserSettings> => {
  if (!address) return defaultSettings;
  const settings = await kvGet(`user:${address.toLowerCase()}:settings`);
  return settings || defaultSettings;
};

export const saveSettings = async (address: string, settings: UserSettings): Promise<boolean> => {
  if (!address) return false;
  const res = await kvSet(`user:${address.toLowerCase()}:settings`, settings);
  return !!res;
};


export const updateLeaderboard = async (address: string, score: number) => {
  if (!address) return;
  // Use ZADD to update the score in the sorted set "leaderboard"
  // Normalize to lowercase to prevent duplicates
  await kvRequest("ZADD", ["leaderboard", score, address.toLowerCase()]);
};

export const getLeaderboard = async (limit: number = 50): Promise<{ address: string, score: number }[]> => {
  // Use ZREVRANGE to get top scores (highest first)
  // Fetch slightly more to account for potential duplicates we'll filter out
  const fetchLimit = limit + 10;
  const result = await kvRequest("ZREVRANGE", ["leaderboard", 0, fetchLimit - 1, "WITHSCORES"]);

  if (!result || !Array.isArray(result)) return [];

  // Result comes back as [address, score, address, score...]
  const leaderBoard: { address: string, score: number }[] = [];
  const seenAddresses = new Set<string>();

  for (let i = 0; i < result.length; i += 2) {
    const rawAddress = result[i];
    const score = parseInt(result[i + 1]);
    const normalizedAddress = rawAddress.toLowerCase();

    if (!seenAddresses.has(normalizedAddress)) {
      seenAddresses.add(normalizedAddress);
      leaderBoard.push({
        address: normalizedAddress, // Return normalized address
        score: score
      });
    }
  }

  return leaderBoard.slice(0, limit);
};

export const calculateTotalScore = (userData: UserData, nftCount: number, animatedCount: number) => {
  return userData.xp + (nftCount * 1) + (animatedCount * 4);
};

// --- MINTING LOGIC (Redis Backed) ---

export interface MintedToken {
  id: string;
  owner: string;
  timestamp: number;
}

export const getTotalMinted = async (): Promise<number> => {
  const total = await kvGet('total_minted');
  return total ? parseInt(total) : 0;
};

export const getToken = async (tokenId: string): Promise<MintedToken | null> => {
  return await kvGet(`token:${tokenId}`);
};

export const getTokensByOwner = async (owner: string): Promise<MintedToken[]> => {
  if (!owner) return [];
  const tokenIds = await kvRequest("LRANGE", [`user:${owner.toLowerCase()}:tokens`, 0, -1]);
  if (!tokenIds || !Array.isArray(tokenIds)) return [];

  const tokens: MintedToken[] = [];
  for (const id of tokenIds) {
    const token = await getToken(id);
    if (token) tokens.push(token);
  }
  return tokens;
};

export const mintToken = async (owner: string, quantity: number = 1): Promise<{ success: boolean, tokens: MintedToken[], error?: string }> => {
  if (!owner) return { success: false, tokens: [], error: "Owner required" };

  const tokens: MintedToken[] = [];

  for (let i = 0; i < quantity; i++) {
    const newIdRes = await kvRequest("INCR", ["total_minted"]);
    if (newIdRes === null) return { success: false, tokens: [], error: "Database error (INCR)" };

    const newTokenId = newIdRes.toString();
    const newToken: MintedToken = {
      id: newTokenId,
      owner,
      timestamp: Date.now()
    };

    // Save Token Data
    await kvSet(`token:${newTokenId}`, newToken);

    // Add to User's Collection (List of IDs)
    await kvRequest("RPUSH", [`user:${owner.toLowerCase()}:tokens`, newTokenId]);

    tokens.push(newToken);
  }

  return { success: true, tokens };
};
