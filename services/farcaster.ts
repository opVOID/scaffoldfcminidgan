
import { FarcasterProfile } from '../types';
import { NEYNAR_API_KEY } from '../constants';

// Cache to prevent spamming API
const profileCache: Record<string, FarcasterProfile | null> = {};

export const fetchFarcasterProfile = async (address: string): Promise<FarcasterProfile | undefined> => {
  if (!NEYNAR_API_KEY || !address) return undefined;
  
  const addr = address.toLowerCase();
  if (profileCache[addr] !== undefined) {
      return profileCache[addr] || undefined;
  }

  try {
    const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${addr}`;
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY
      }
    });

    if (!response.ok) {
        console.warn("Neynar API error:", response.status);
        profileCache[addr] = null;
        return undefined;
    }

    const data = await response.json();
    const user = data[addr]?.[0];

    if (!user) {
        profileCache[addr] = null;
        return undefined;
    }

    const profile: FarcasterProfile = {
      username: user.username,
      fid: user.fid,
      pfp: user.pfp_url
    };

    profileCache[addr] = profile;
    return profile;

  } catch (error) {
    console.error("Error fetching Farcaster profile:", error);
    return undefined;
  }
};
