
import { UserData, FarcasterProfile } from '../types';
import { KV_REST_API_URL, KV_REST_API_TOKEN } from '../constants';
import { fetchFarcasterProfile } from './farcaster';

const defaultData: UserData = {
  lastCheckIn: 0,
  streak: 0,
  xp: 0
};

export interface UserSettings {
  newMints: boolean;
  airdrops: boolean;
  updates: boolean;
}

const defaultSettings: UserSettings = {
  newMints: true,
  airdrops: true,
  updates: false
};

// Helper to make KV requests
async function kvRequest(command: string, args: any[] = []) {
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

async function kvSet(key: string, value: any) {
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

async function kvGet(key: string) {
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

export const calculateTotalScore = (userData: UserData, nftCount: number, animatedCount: number) => {
  return userData.xp + (nftCount * 1) + (animatedCount * 4);
};

export const testConnection = async () => {
    if (!KV_REST_API_URL || !KV_REST_API_TOKEN) return { success: false, error: "Missing Env Vars" };
    const res = await kvSet('test_connection', { status: 'ok', timestamp: Date.now() });
    return { success: !!res, error: res ? null : "Failed to write" };
}
