
import React, { useState, useEffect } from 'react';
import { WalletState, UserData, FarcasterProfile } from '../types';
import { Flame, Clock, ExternalLink } from 'lucide-react';
import { checkInUser, getUserData, getLeaderboard, updateLeaderboard } from '../services/api';
import { calculateTotalScore } from '../services/db';
import { fetchUserNFTs } from '../services/web3';
import { fetchFarcasterProfile } from '../services/farcaster';

interface LeaderboardProps {
  wallet: WalletState;
  onConnect: () => void;
  getAuthToken: () => Promise<string | null>;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ wallet, onConnect, getAuthToken }) => {
  const [userData, setUserData] = useState<UserData>({ lastCheckIn: 0, streak: 0, xp: 0 });
  const [nftCount, setNftCount] = useState(0);
  const [animatedCount, setAnimatedCount] = useState(0);
  const [leaderboardData, setLeaderboardData] = useState<{ address: string, score: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkInMsg, setCheckInMsg] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  // Timer state
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isCooldown, setIsCooldown] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (wallet.address && wallet.connected) {
        setLoading(true);
        // Load DB Data
        const dbData = await getUserData(wallet.address);

        // Try to fetch latest Farcaster data if missing
        if (!dbData.farcaster) {
          const fcProfile = await fetchFarcasterProfile(wallet.address);
          if (fcProfile) dbData.farcaster = fcProfile;
        }

        setUserData(dbData);

        // Load Web3 Data for Points
        const nfts = await fetchUserNFTs(wallet.address);
        setNftCount(nfts.length);
        const animated = nfts.filter(n => n.isAnimated).length;
        setAnimatedCount(animated);
        setLoading(false);
      }
    };
    loadData();
  }, [wallet.address, wallet.connected]);

  // Timer Effect
  useEffect(() => {
    const updateTimer = () => {
      if (userData.lastCheckIn === 0) {
        setTimeLeft('');
        setIsCooldown(false);
        return;
      }

      const now = Date.now();
      const nextCheckIn = userData.lastCheckIn + (24 * 60 * 60 * 1000);
      const diff = nextCheckIn - now;

      if (diff <= 0) {
        setTimeLeft('');
        setIsCooldown(false);
      } else {
        setIsCooldown(true);
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${h}h:${m < 10 ? '0' + m : m}m:${s < 10 ? '0' + s : s}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [userData.lastCheckIn]);

  const handleCheckIn = async () => {
    if (!wallet.connected || !wallet.address) {
      onConnect();
      return;
    }

    setCheckingIn(true);
    const token = await getAuthToken();
    if (!token) {
      setCheckInMsg("Auth token failed");
      setCheckingIn(false);
      return;
    }
    const result = await checkInUser(wallet.address, token);
    setUserData(result.data);
    setCheckInMsg(result.message);
    setCheckingIn(false);

    setTimeout(() => setCheckInMsg(''), 3000);
  };

  const totalScore = calculateTotalScore(userData, nftCount, animatedCount);

  // Fetch Leaderboard Function
  const fetchLB = async () => {
    try {
      setLoading(true);
      const data = await getLeaderboard(50);
      setLeaderboardData(data);
      console.log('Leaderboard updated with', data.length, 'entries');
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial Fetch & Interval
  useEffect(() => {
    fetchLB();
    const interval = setInterval(fetchLB, 30000);
    return () => clearInterval(interval);
  }, []);

  // Reactive Update: Whenever totalScore changes, update DB AND refresh list
  useEffect(() => {
    if (wallet.connected && wallet.address && totalScore > 0) {
      // 1. Update the global store
      getAuthToken().then(token => {
        if (!token) return;
        updateLeaderboard(wallet.address!, totalScore, token).then(() => {
          // 2. Immediately refresh the list to show the new score
          fetchLB();
        });
      }).catch(console.error);
    }
  }, [totalScore, wallet.connected, wallet.address]);

  // Helper for rank icon
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <span className="text-2xl">🏆</span>;
      case 2: return <span className="text-2xl">🥈</span>;
      case 3: return <span className="text-2xl">🥉</span>;
      default: return <span className="text-gray-500 font-bold">#{rank}</span>;
    }
  };

  return (
    <div className="pt-20 pb-24 px-4 max-w-md mx-auto min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-8 tracking-tighter text-white">Leaderboard</h1>

      {/* Daily Check-in Card */}
      <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 mb-6 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-900/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110 duration-500"></div>

        <div className="flex justify-between items-start mb-4 relative z-10">
          <div>
            <h2 className="text-xl font-bold text-white">Daily Check-in</h2>
            <p className="text-gray-400 text-xs mt-1 font-mono">Earn +50 XP every 24h</p>
          </div>
          <div className="flex items-center gap-1 bg-[#2D1B4E] border border-purple-500/30 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(147,51,234,0.15)]">
            <span className="text-purple-300 text-xs font-bold uppercase tracking-wider">Streak: {wallet.connected ? userData.streak : 0}</span>
            <Flame size={12} className="text-orange-500 fill-orange-500" />
          </div>
        </div>

        <button
          className={`w-full py-4 rounded-xl font-bold text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 ${wallet.connected && !checkingIn && !isCooldown
            ? 'bg-purple-700 hover:bg-purple-600 text-white shadow-[0_4px_0_#3b0764] active:shadow-none active:translate-y-[4px]'
            : 'bg-[#1F2937] text-gray-400 cursor-not-allowed'
            }`}
          onClick={handleCheckIn}
          disabled={checkingIn || isCooldown}
        >
          {checkingIn ? (
            'CHECKING IN...'
          ) : isCooldown ? (
            <>
              <Clock size={16} /> Next: {timeLeft}
            </>
          ) : checkInMsg ? (
            checkInMsg
          ) : wallet.connected ? (
            'CHECK IN NOW'
          ) : (
            'Connect Wallet to Check In'
          )}
        </button>
      </div>

      {/* User Stats Card */}
      {wallet.connected && (
        <div className="bg-[#0a0a0a] border border-neon/20 rounded-2xl p-4 mb-6 grid grid-cols-3 gap-2 text-center">
          <div className="p-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">XP</p>
            <p className="text-xl font-bold text-white">{userData.xp}</p>
          </div>
          <div className="p-2 border-l border-gray-800">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">NFTs</p>
            <p className="text-xl font-bold text-white">{loading ? '...' : nftCount}</p>
          </div>
          <div className="p-2 border-l border-gray-800">
            <p className="text-[10px] text-neon uppercase tracking-widest mb-1 font-bold">Total</p>
            <p className="text-xl font-bold text-neon">{loading ? '...' : totalScore}</p>
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 min-h-[300px] flex flex-col items-center text-center relative overflow-hidden">
        <div className="w-full space-y-3 z-10">
          <div className="flex justify-between items-center text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 px-2">
            <span>Rank</span>
            <span>Score</span>
          </div>

          {leaderboardData.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto w-full px-2 custom-scrollbar">
              {leaderboardData.map((entry, index) => {
                const isCurrentUser = wallet.address?.toLowerCase() === entry.address.toLowerCase();
                const rank = index + 1;

                return (
                  <div key={entry.address} className={`flex items-center justify-between p-3 rounded-lg border ${isCurrentUser ? 'bg-neon/10 border-neon/50' : 'bg-[#1a1a1a] border-gray-800'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 flex justify-center font-bold text-gray-300">
                        {getRankIcon(rank)}
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-mono ${isCurrentUser ? 'text-white font-bold' : 'text-gray-300'}`}>
                          {entry.address.substring(0, 6)}...{entry.address.substring(38)}
                          {isCurrentUser && <span className="ml-2 text-[10px] bg-neon text-black px-1 rounded">YOU</span>}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-mono font-bold ${isCurrentUser ? 'text-neon' : 'text-gray-400'}`}>{entry.score} Pts</span>
                  </div>
                );
              })}
            </div>
          ) : loading ? (
            <div className="py-8 text-center text-gray-500">
              <p>Loading leaderboard...</p>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <p>No leaderboard data available</p>
              <p className="text-xs mt-2">Check back later or connect your wallet</p>
            </div>
          )}
        </div>

        {/* Decorative grid background */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>
      </div>
    </div>
  );
};

export default Leaderboard;
