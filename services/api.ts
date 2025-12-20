
import { UserData, UserSettings } from '../types';

const defaultData: UserData = {
    lastCheckIn: 0,
    streak: 0,
    xp: 0
};

export const getUserData = async (address: string): Promise<UserData> => {
    if (!address) return defaultData;
    try {
        const response = await fetch(`/api/user/data?address=${address}`);
        if (!response.ok) return defaultData;
        return await response.json();
    } catch (error) {
        console.error("Fetch User Data Error:", error);
        return defaultData;
    }
};

export const checkInUser = async (address: string, token: string): Promise<{ success: boolean, data: UserData, message: string }> => {
    try {
        const response = await fetch('/api/user/check-in', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ address })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Check-in failed');
        }

        return await response.json();
    } catch (error: any) {
        console.error("Check-in Error:", error);
        return { success: false, data: defaultData, message: error.message };
    }
};

export const getLeaderboard = async (limit: number = 50): Promise<{ address: string, score: number }[]> => {
    try {
        const response = await fetch(`/api/leaderboard?limit=${limit}`);
        if (!response.ok) {
            console.error('Leaderboard API response not ok:', response.status, response.statusText);
            return [];
        }
        const data = await response.json();
        console.log('Leaderboard data loaded:', data.length, 'entries');
        return data;
    } catch (error) {
        console.error("Fetch Leaderboard Error:", error);
        return [];
    }
};

export const updateLeaderboard = async (address: string, score: number, token?: string) => {
    if (!address || !token) return;
    try {
        await fetch('/api/leaderboard', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ address, score })
        });
    } catch (error) {
        console.error("Update Leaderboard Error:", error);
    }
};

export const rewardUserShare = async (address: string, token: string): Promise<{ success: boolean, xpAdded: number }> => {
    try {
        const response = await fetch('/api/user/reward', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ address })
        });
        if (!response.ok) return { success: false, xpAdded: 0 };
        return await response.json();
    } catch (error) {
        console.error("Reward User Share Error:", error);
        return { success: false, xpAdded: 0 };
    }
};
