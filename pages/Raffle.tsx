import React, { useState, useEffect } from 'react';
import { Clock, Ticket, Trophy, Zap, Loader2, History, PlayCircle, Share2, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import {
  getRaffleStats,
  getUserInfo,
  claimDailyFreeTicket,
  checkDailyTicketEligibility,
  prepareBuyTransaction,
  prepareApproveTransaction,
  checkUSDCAllowance,
  getRecentWinners,
  getJackpotWinners,
  waitForTransactionReceipt,
  getUsdcBalance,
  getOverallStats,
  getHistoricalJackpotWinners,
  Winner,
  RaffleStats,
  UserRaffleStats,
  OverallStats,
  HistoricalJackpotWinner
} from '../services/megapot';
import { MEGAPOT_LOGO_URL, APP_URL } from '../constants';

const Raffle: React.FC = () => {
  const { wallet, connect } = useWallet();
  const [activeTab, setActiveTab] = useState<'play' | 'history'>('play');

  // Stats state
  const [stats, setStats] = useState<RaffleStats>({
    potSizeUSD: 0,
    timeLeftSeconds: 0,
    currentRoundId: 0,
    ticketCost: 1,
    ticketsSoldCount: 0,
    oddsPerTicket: '0',
    activePlayers: 0,
    feeBps: 3000,
    referralFeeBps: 1000,
    endTimestamp: Date.now() + 86400000
  });

  // User state
  const [userData, setUserData] = useState<UserRaffleStats>({
    tickets: 0,
    ticketsBps: 0,
    freeTicketClaimed: false,
    lastClaimTimestamp: 0,
    winningsClaimable: 0
  });

  const [winners, setWinners] = useState<Winner[]>([]);
  const [jackpotWinners, setJackpotWinners] = useState<Winner[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [historicalJackpotWinners, setHistoricalJackpotWinners] = useState<HistoricalJackpotWinner[]>([]);
  const [loadingWinners, setLoadingWinners] = useState(true);
  const [loadingJackpotWinners, setLoadingJackpotWinners] = useState(true);
  const [loadingOverallStats, setLoadingOverallStats] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [buyAmount, setBuyAmount] = useState(1);
  const [claiming, setClaiming] = useState(false);
  const [buying, setBuying] = useState(false);
  const [approving, setApproving] = useState(false);
  const [usdcAllowance, setUsdcAllowance] = useState(0);
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error' | 'info'>('info');

  // 24h Countdown state
  const [claimCooldownTime, setClaimCooldownTime] = useState('');

  // History expansion state
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Helper functions for history display
  const toggleDayExpansion = (date: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const groupWinnersByDate = (winners: Winner[]) => {
    const grouped: { [date: string]: Winner[] } = {};

    winners.forEach(winner => {
      const date = new Date(winner.timestamp).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(winner);
    });

    return grouped;
  };

  // Detect chain using isWorldApp field from API (reliable method)
  // isWorldApp: true = World chain, false = Base chain
  const getChainInfo = (isWorldApp?: boolean) => {
    if (isWorldApp === true) {
      return { name: 'World', explorer: 'worldscan.org' };
    } else {
      return { name: 'Base', explorer: 'basescan.org' };
    }
  };

  // Initialize basic data (runs once on mount)
  useEffect(() => {
    const initBasic = async () => {
      try {
        const s = await getRaffleStats();
        if (s) {
          setStats(s);
        } else {
          // Set default values when API fails
          setStats({
            potSizeUSD: 0,
            timeLeftSeconds: 0,
            currentRoundId: 0,
            ticketCost: 1,
            ticketsSoldCount: 0,
            oddsPerTicket: '0',
            activePlayers: 0,
            feeBps: 3000,
            referralFeeBps: 1000,
            endTimestamp: Date.now() + 86400000
          });
        }
        setLoadingStats(false);

        const w = await getRecentWinners();
        setWinners(w);
        setLoadingWinners(false);

        // Also fetch jackpot winners
        const jw = await getJackpotWinners();
        setJackpotWinners(jw);
        setLoadingJackpotWinners(false);

        // Fetch overall statistics
        const os = await getOverallStats();
        setOverallStats(os);
        setLoadingOverallStats(false);

        // Fetch historical jackpot winners
        const hjw = await getHistoricalJackpotWinners(15);
        setHistoricalJackpotWinners(hjw);
      } catch (e) {
        console.error('Basic init error:', e);
      }
    };
    initBasic();
  }, []);

  // Initialize wallet-dependent data (runs when wallet connects)
  useEffect(() => {
    if (!wallet.address || !wallet.connected) {
      console.log('Wallet not connected, skipping wallet-dependent init');
      return;
    }

    const initWalletData = async () => {
      try {
        console.log('Initializing wallet data for:', wallet.address);

        // Wait a moment for wallet to be fully ready
        await new Promise(resolve => setTimeout(resolve, 500));

        const u = await getUserInfo(wallet.address);
        if (u) {
          setUserData(u);
        } else {
          // Set default values when API fails
          setUserData({
            tickets: 0,
            ticketsBps: 0,
            freeTicketClaimed: false,
            lastClaimTimestamp: 0,
            winningsClaimable: 0
          });
        }

        // Check allowance with retry mechanism
        let allowance = 0;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          try {
            allowance = await checkUSDCAllowance(wallet.address);
            console.log(`Attempt ${attempts + 1} - Initial allowance:`, allowance);
            if (allowance > 0) break; // Got valid allowance, no need to retry
            attempts++;
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between retries
            }
          } catch (error) {
            console.error(`Attempt ${attempts + 1} - Failed to check allowance:`, error);
            attempts++;
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        setUsdcAllowance(allowance);
        console.log('Final allowance set:', allowance);

        // Get USDC balance
        const balance = await getUsdcBalance(wallet.address);
        setUsdcBalance(balance);

        // Final allowance check after 2 seconds to ensure it's correct
        setTimeout(async () => {
          try {
            const finalAllowance = await checkUSDCAllowance(wallet.address);
            console.log('Final allowance check after 2s:', finalAllowance);
            if (finalAllowance !== allowance) {
              console.log('Updating allowance from', allowance, 'to', finalAllowance);
              setUsdcAllowance(finalAllowance);
            }
          } catch (error) {
            console.error('Failed final allowance check:', error);
          }
        }, 2000);
      } catch (e) {
        console.error('Wallet data init error:', e);
      }
    };

    initWalletData();
  }, [wallet.address, wallet.connected]);

  // Poll stats every 30s
  useEffect(() => {
    const poll = setInterval(async () => {
      const s = await getRaffleStats();
      if (s) {
        setStats(s);
      }
    }, 30000);

    // Countdown timer every 1s
    const timer = setInterval(() => {
      setStats(prev => ({
        ...prev,
        timeLeftSeconds: Math.max(0, prev.timeLeftSeconds - 1)
      }));
    }, 1000);

    return () => {
      clearInterval(poll);
      clearInterval(timer);
    };
  }, [wallet.address, wallet.connected]);

  // 24h Claim Cooldown Timer
  useEffect(() => {
    const updateCooldown = () => {
      if (!userData.freeTicketClaimed || !userData.lastClaimTimestamp) {
        setClaimCooldownTime('');
        return;
      }

      const now = Date.now();
      const nextClaim = userData.nextEligibleAt || (userData.lastClaimTimestamp + (24 * 60 * 60 * 1000));
      const diff = nextClaim - now;

      if (diff <= 0) {
        setUserData(prev => ({ ...prev, freeTicketClaimed: false }));
        setClaimCooldownTime('');
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setClaimCooldownTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    };

    const interval = setInterval(updateCooldown, 1000);
    updateCooldown();
    return () => clearInterval(interval);
  }, [userData.lastClaimTimestamp, userData.freeTicketClaimed, userData.nextEligibleAt]);

  // Helpers
  const formatTime = (seconds: number) => {
    if (seconds <= 0 || isNaN(seconds)) return "DRAWING...";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 4000);
  };

  // Handle Free Ticket Claim
  const handleClaim = async () => {
    if (claiming) return; // Prevent double clicks
    if (!wallet.connected || !wallet.address) {
      connect();
      return;
    }

    // Check eligibility first
    const eligibilityCheck = await checkDailyTicketEligibility(wallet.address);
    if (!eligibilityCheck.success) {
      showMessage(eligibilityCheck.message || 'Not eligible for free ticket', 'error');
      return;
    }

    setClaiming(true);

    // Open share intent
    const jackpotValue = stats.potSizeUSD > 0 ? stats.potSizeUSD : 1000000; // Fallback to 1M if 0
    const text = `I just grabbed a free ticket for the Phunks x Megapot Raffle! 🎲\n\nJoin me for a chance to win the $${Math.floor(jackpotValue).toLocaleString()} jackpot!`;
    const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(APP_URL)}`;
    window.open(shareUrl, '_blank');

    // Claim after short delay with referrer for referral rewards
    setTimeout(async () => {
      // Pass referrer address for referral rewards (using wallet address as self-referrer for now)
      const referrerAddress = wallet.address; // TODO: Get actual referrer from URL params or storage
      const res = await claimDailyFreeTicket(wallet.address!, referrerAddress);
      setClaiming(false);

      if (res.success) {
        setUserData(prev => ({
          ...prev,
          freeTicketClaimed: true,
          tickets: prev.tickets + 1,
          lastClaimTimestamp: res.timestamp || Date.now(),
          nextEligibleAt: res.nextEligibleAt
        }));
        showMessage('🎉 Free ticket claimed!', 'success');
      } else {
        showMessage(res.message || 'Failed to claim', 'error');
      }
    }, 2000);
  };

  // Handle USDC Approval
  const handleApprove = async () => {
    if (approving) return; // Prevent double clicks
    if (!wallet.connected || !wallet.address) {
      connect();
      return;
    }

    setApproving(true);
    try {
      const totalCost = buyAmount * stats.ticketCost;
      const txParams = prepareApproveTransaction(wallet.address, totalCost); // Approve only the amount needed
      const txHash = await wallet.provider.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      showMessage('Approval submitted! Waiting for confirmation...', 'info');
      const receipt = await waitForTransactionReceipt(txHash);
      const success = receipt?.status === '0x1' || receipt?.status === 1;
      if (!success) {
        throw new Error('Approval transaction failed');
      }

      // Refresh allowance after approval
      const allowance = await checkUSDCAllowance(wallet.address);
      setUsdcAllowance(allowance);
      showMessage('USDC approved!', 'success');
    } catch (e: any) {
      console.error(e);
      showMessage(e.message || 'Approval cancelled', 'error');
    } finally {
      setApproving(false);
    }
  };

  // Handle Ticket Purchase
  const handleBuy = async () => {
    if (buying) return; // Prevent double clicks
    if (!wallet.connected || !wallet.address) {
      connect();
      return;
    }

    const totalCost = buyAmount * stats.ticketCost;

    // Check allowance
    if (usdcAllowance < totalCost) {
      showMessage('Please approve USDC first', 'error');
      return;
    }

    // Check USDC balance
    if (usdcBalance < totalCost) {
      showMessage(`Insufficient USDC balance. You need $${totalCost.toFixed(2)} but have $${usdcBalance.toFixed(2)}`, 'error');
      return;
    }

    setBuying(true);
    try {
      const txParams = prepareBuyTransaction(buyAmount, wallet.address);
      const txHash = await wallet.provider.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      showMessage('Purchase submitted! Waiting for confirmation...', 'info');
      const receipt = await waitForTransactionReceipt(txHash);
      const success = receipt?.status === '0x1' || receipt?.status === 1;
      if (!success) {
        throw new Error('Purchase transaction failed');
      }

      showMessage(`🎟️ ${buyAmount} ticket(s) purchased!`, 'success');
      const u = await getUserInfo(wallet.address);
      if (u) {
        setUserData(u);
      }
      const allowance = await checkUSDCAllowance(wallet.address);
      setUsdcAllowance(allowance);
    } catch (e: any) {
      console.error(e);
      showMessage(e.message || 'Transaction cancelled', 'error');
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="p-4 pb-24 max-w-md mx-auto">
      {/* Branding Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src={MEGAPOT_LOGO_URL} alt="Megapot" className="w-8 h-8" />
          <span className="text-sm text-gray-400">Megapot</span>
        </div>
        <h1 className="text-2xl font-black text-white">PHUNKS  X  MEGAPOT</h1>
        <p className="text-xs text-neon uppercase tracking-widest">Official Raffle</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-4 bg-gray-900/50 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('play')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'play' ? 'bg-neon text-black shadow-lg' : 'text-gray-500 hover:text-white'
            }`}
        >
          <PlayCircle size={14} /> Play
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'history' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'
            }`}
        >
          <History size={14} /> History
        </button>
      </div>

      {activeTab === 'play' ? (
        <div>
          {/* Pot Card */}
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 rounded-2xl p-6 mb-4 border border-yellow-500/30">
            {loadingStats ? (
              <div className="text-center py-8 text-gray-400">
                <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                <p className="text-sm font-mono">Fetching Data...</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs text-yellow-300">
                    <Trophy size={12} />
                    <span>PRIZE POOL</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock size={12} />
                    <span>{formatTime(stats.timeLeftSeconds)}</span>
                  </div>
                </div>
                <div className="text-center mb-4">
                  <p className="text-4xl font-black text-white mb-1">{formatCurrency(stats.potSizeUSD)}</p>
                  <p className="text-xs text-gray-400">Jackpot Amount</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-white">{stats.ticketsSoldCount}</p>
                    <p className="text-xs text-gray-400">Tickets</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-purple-300">{stats.activePlayers}</p>
                    <p className="text-xs text-gray-400">Players</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-300">{stats.ticketCost.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">Cost</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Free Daily Ticket */}
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-xl p-4 border border-green-500/30">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Zap size={14} className="text-green-300" /> Daily Free Ticket
            </h3>
            <div className="text-center">
              {!wallet.connected ? (
                <button
                  onClick={connect}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-green-600 text-white hover:bg-green-500 transition-all flex items-center justify-center gap-2"
                >
                  CONNECT TO CLAIM
                </button>
              ) : userData.freeTicketClaimed ? (
                <div className="space-y-2">
                  <div className="text-green-300 text-sm font-bold">✓ Free Ticket Claimed!</div>
                  {claimCooldownTime && (
                    <div className="text-xs text-gray-400">
                      Next free ticket in: {claimCooldownTime}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-green-600 text-white hover:bg-green-500 transition-all flex items-center justify-center gap-2"
                >
                  {claiming ? <Loader2 className="animate-spin" size={16} /> : 'Share Miniapp to claim free Ticket'}
                </button>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center">
              Share on Farcaster to claim your daily free ticket
            </div>
          </div>

          {/* Buy Tickets Card */}
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Ticket size={14} className="text-purple-300" /> Buy Tickets
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setBuyAmount(Math.max(1, buyAmount - 1))}
                className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-white flex items-center justify-center"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                value={buyAmount}
                onChange={(e) => setBuyAmount(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 text-center bg-gray-800 border border-gray-700 rounded-lg text-white px-2 py-1"
              />
              <button
                onClick={() => setBuyAmount(buyAmount + 1)}
                className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-white flex items-center justify-center"
              >
                +
              </button>
            </div>
            <div className="text-center mb-3">
              <p className="text-xs text-gray-400">Total Cost</p>
              <p className="text-lg font-bold text-white">{formatCurrency(buyAmount * stats.ticketCost)}</p>
            </div>
            {wallet.connected ? (
              <>
                {usdcAllowance < buyAmount * stats.ticketCost ? (
                  <button
                    onClick={handleApprove}
                    disabled={approving}
                    className="w-full py-3 rounded-xl font-bold text-sm bg-yellow-600 text-white hover:bg-yellow-500 transition-all flex items-center justify-center gap-2"
                  >
                    {approving ? <Loader2 className="animate-spin" size={16} /> : 'APPROVE USDC'}
                  </button>
                ) : (
                  <button
                    onClick={handleBuy}
                    disabled={buying}
                    className="w-full py-3 rounded-xl font-bold text-sm bg-purple-600 text-white hover:bg-purple-500 transition-all flex items-center justify-center gap-2"
                  >
                    {buying ? <Loader2 className="animate-spin" size={16} /> : `BUY FOR $${(buyAmount * stats.ticketCost).toFixed(2)} USDC`}
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={connect}
                className="w-full py-3 rounded-xl font-bold text-sm bg-gray-600 text-white hover:bg-gray-500 transition-all"
              >
                CONNECT WALLET
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Daily Prize Winners */}
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-2xl p-4 mb-4 border border-green-500/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap size={14} className="text-green-300" /> Daily Prize Winners
              </h3>
              <span className="text-xs text-green-300 font-mono">$25/$5/$2 Prizes</span>
            </div>

            {loadingWinners ? (
              <div className="text-center py-6 text-gray-400">
                <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                <p className="text-xs font-mono">Loading Daily Winners...</p>
              </div>
            ) : winners.length > 0 ? (
              <div className="space-y-3">
                {Object.entries(groupWinnersByDate(winners)).map(([date, dayWinners]) => {
                  const isExpanded = expandedDays.has(date);
                  const totalPrize = dayWinners.reduce((sum, w) => sum + w.prize, 0);

                  // Get round IDs for this day
                  const roundIds = [...new Set(dayWinners.map(w => w.roundId))];
                  const roundRange = roundIds.length === 1
                    ? `Round ${roundIds[0]}`
                    : `Rounds ${Math.min(...roundIds)}-${Math.max(...roundIds)}`;

                  return (
                    <div key={date} className="bg-gray-900/50 rounded-lg border border-gray-800">
                      {/* Day Header - Clickable */}
                      <button
                        onClick={() => toggleDayExpansion(date)}
                        className="w-full p-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-blue-300">{roundRange}</span>
                          <span className="text-xs font-bold text-yellow-300">{date}</span>
                          <span className="text-xs text-gray-400">{dayWinners.length} winners</span>
                          <span className="text-xs font-bold text-green-300">${totalPrize}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {isExpanded ? 'Click to collapse' : 'Click to expand'}
                          </span>
                          <History size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {/* Expanded Winners List */}
                      {isExpanded && (
                        <div className="border-t border-gray-800">
                          {dayWinners.map((winner, index) => (
                            <div key={`${winner.address}-${index}`} className="p-3 border-b border-gray-800 last:border-b-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-yellow-300">#{winner.roundId}</span>
                                  <span className="text-xs text-gray-300 font-mono">
                                    {winner.address.slice(0, 6)}...{winner.address.slice(-4)}
                                  </span>
                                  <span className="text-sm font-bold text-green-300">
                                    ${winner.prize}
                                  </span>
                                </div>
                                {winner.txHash && (() => {
                                  const chainInfo = getChainInfo(winner.isWorldApp);
                                  return (
                                    <a
                                      href={`https://${chainInfo.explorer}/tx/${winner.txHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                      title={`View on ${chainInfo.name}`}
                                    >
                                      {chainInfo.name} →
                                    </a>
                                  );
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <p className="text-xs">No daily winners yet</p>
              </div>
            )}
          </div>

          {/* Overall Statistics */}
          <div className="bg-gradient-to-br from-purple-500/20 to-blue-600/20 rounded-2xl p-4 mb-4 border border-purple-500/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp size={14} className="text-purple-300" /> Overall Statistics
              </h3>
              <span className="text-xs text-purple-300 font-mono">Since July 2024</span>
            </div>

            {loadingOverallStats ? (
              <div className="text-center py-6 text-gray-400">
                <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                <p className="text-xs font-mono">Loading Overall Stats...</p>
              </div>
            ) : overallStats ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                  <div className="text-center">
                    <p className="text-lg font-bold text-yellow-300">
                      ${overallStats.totalPrizePool.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">Total Prizes</p>
                  </div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-300">
                      {overallStats.totalWinners}
                    </p>
                    <p className="text-xs text-gray-400">Jackpot Winners</p>
                  </div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-300">
                      {overallStats.uniquePlayers.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">Unique Players</p>
                  </div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                  <div className="text-center">
                    <p className="text-lg font-bold text-purple-300">
                      {overallStats.totalTickets.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">Tickets Sold</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <p className="text-xs">Statistics temporarily unavailable</p>
              </div>
            )}
          </div>

          {/* How to Play */}
          <div className="bg-gray-900/50 rounded-2xl p-4 mb-4 border border-gray-800">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Zap size={14} className="text-purple-300" /> How to Play
            </h3>
            <div className="space-y-2 text-xs text-gray-300">
              <div className="flex items-start gap-2">
                <span className="text-purple-300">1.</span>
                <span>Connect your wallet and get a free daily ticket</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-300">2.</span>
                <span>Buy more tickets to increase your chances</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-300">3.</span>
                <span>Winner is drawn when timer expires</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-300">4.</span>
                <span>Prize pool grows with more participants</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Toast */}
      {msg && (
        <div className={`fixed bottom-20 left-4 right-4 p-3 rounded-xl text-center text-sm font-bold flex items-center justify-center gap-2 ${msgType === 'success' ? 'bg-green-500/90 text-white' :
          msgType === 'error' ? 'bg-red-500/90 text-white' :
            'bg-gray-800 text-white'
          }`}>
          {msgType === 'success' && <CheckCircle size={16} />}
          {msgType === 'error' && <AlertCircle size={16} />}
          {msg}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-800">
        <div className="text-center">
          <a
            href="https://megapot.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
          >
            Powered by Megapot.io
          </a>
        </div>
      </div>
    </div>
  );
};

export default Raffle;
