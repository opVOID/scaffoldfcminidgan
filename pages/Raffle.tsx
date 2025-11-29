import React, { useState, useEffect } from 'react';
import { Clock, Ticket, Trophy, Zap, Loader2, History, PlayCircle, Share2, AlertCircle, CheckCircle, TrendingUp, Droplets, Settings, ArrowUp, ArrowDown, DollarSign } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import {
  getRaffleStats,
  getUserInfo,
  claimDailyFreeTicket,
  prepareBuyTransaction,
  prepareApproveTransaction,
  checkUSDCAllowance,
  getRecentWinners,
  waitForTransactionReceipt,
  getLpPoolStatus,
  getMinLpDeposit,
  getLpsInfo,
  getUsdcBalance,
  prepareLpDepositTransaction,
  prepareLpAdjustRiskTransaction,
  prepareLpWithdrawTransaction,
  Winner,
  RaffleStats,
  UserRaffleStats,
  LpPoolStatus,
  LpInfo
} from '../services/megapot';
import { MEGAPOT_LOGO_URL, APP_URL } from '../constants';

const Raffle: React.FC = () => {
  const { wallet, connect } = useWallet();
  const [activeTab, setActiveTab] = useState<'play' | 'liquidity'>('play');

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
  const [loadingWinners, setLoadingWinners] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [buyAmount, setBuyAmount] = useState(1);
  const [claiming, setClaiming] = useState(false);
  const [buying, setBuying] = useState(false);
  const [approving, setApproving] = useState(false);
  const [usdcAllowance, setUsdcAllowance] = useState(0);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error' | 'info'>('info');

  // Liquidity state
  const [lpPoolStatus, setLpPoolStatus] = useState<boolean>(false);
  const [lpInfo, setLpInfo] = useState<[bigint, bigint, bigint, boolean] | null>(null);
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [lpDepositAmount, setLpDepositAmount] = useState('');
  const [lpWithdrawAmount, setLpWithdrawAmount] = useState('');
  const [lpRiskPercentage, setLpRiskPercentage] = useState('');
  const [lpLoading, setLpLoading] = useState(false);
  const [lpDepositing, setLpDepositing] = useState(false);
  const [lpWithdrawing, setLpWithdrawing] = useState(false);
  const [lpAdjusting, setLpAdjusting] = useState(false);
  const [minLpDeposit, setMinLpDeposit] = useState(0);

  // 24h Countdown state
  const [claimCooldownTime, setClaimCooldownTime] = useState('');

  // Initialize basic data (runs once on mount)
  useEffect(() => {
    const initBasic = async () => {
      try {
        const s = await getRaffleStats();
        setStats(s);
        setLoadingStats(false);

        const w = await getRecentWinners();
        setWinners(w);
        setLoadingWinners(false);
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
        setUserData(u);

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

        // Load liquidity data with error handling
        try {
          const poolStatus = await getLpPoolStatus();
          console.log('LP Pool Status:', poolStatus);
          setLpPoolStatus(poolStatus);
        } catch (error) {
          console.error('Failed to load LP pool status:', error);
          setLpPoolStatus(false); // Default to closed
        }

        try {
          const lpUser = await getLpsInfo(wallet.address);
          console.log('LP User Info:', lpUser);
          setLpInfo(lpUser);
        } catch (error) {
          console.error('Failed to load LP user info:', error);
          setLpInfo(null); // Default to no LP data
        }

        const balance = await getUsdcBalance(wallet.address);
        setUsdcBalance(balance);

        const minDeposit = await getMinLpDeposit();
        setMinLpDeposit(minDeposit);

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

  // Poll stats and LP data every 30s
  useEffect(() => {
    const poll = setInterval(async () => {
      const s = await getRaffleStats();
      setStats(s);
      
      // Also poll LP data
      const poolStatus = await getLpPoolStatus();
      setLpPoolStatus(poolStatus);
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

    setClaiming(true);

    // Open share intent
    const jackpotValue = stats.potSizeUSD > 0 ? stats.potSizeUSD : 1000000; // Fallback to 1M if 0
    const text = `I just grabbed a free ticket for the Phunks x Megapot Raffle! 🎲\n\nJoin me for a chance to win the $${Math.floor(jackpotValue).toLocaleString()} jackpot!`;
    const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(APP_URL)}`;
    window.open(shareUrl, '_blank');

    // Claim after short delay
    setTimeout(async () => {
      const res = await claimDailyFreeTicket(wallet.address!);
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
      const txHash = await (window as any).ethereum.request({
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
      const txHash = await (window as any).ethereum.request({
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
      setUserData(u);
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
          onClick={() => setActiveTab('liquidity')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'liquidity' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'
            }`}
        >
          <Droplets size={14} /> Liquidity
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
                <p className="text-xs text-gray-400">Next Prize</p>
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
        {/* LP Pool Status */}
        <div className="bg-gradient-to-br from-purple-500/20 to-blue-600/20 rounded-2xl p-4 mb-4 border border-purple-500/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp size={14} className="text-purple-300" /> LP Pool Status
            </h3>
          </div>
          <div className="text-center mb-4">
            <p className="text-xs text-gray-400 mb-2">Pool Status</p>
            <p className={`text-2xl font-bold ${lpPoolStatus ? 'text-emerald-400' : 'text-red-400'}`}>
              {lpPoolStatus ? 'OPEN' : 'CLOSED'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {lpPoolStatus ? 'Liquidity deposits are currently allowed' : 'Liquidity deposits are currently disabled'}
            </p>
          </div>
        </div>

        {/* Your LP Position */}
        {wallet.connected && lpInfo && (
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <DollarSign size={14} className="text-green-300" /> Your LP Position
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Principal</p>
                <p className="text-lg font-bold text-white">{formatCurrency(Number(lpInfo[0]) / 1000000)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Position In Range</p>
                <p className="text-lg font-bold text-green-300">{formatCurrency(Number(lpInfo[1]) / 1000000)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Risk Percentage</p>
                <p className="text-lg font-bold text-orange-300">{Number(lpInfo[2])}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <p className="text-lg font-bold text-purple-300">{lpInfo[3] ? 'Active' : 'Inactive'}</p>
              </div>
            </div>
          </div>
        )}

        {/* LP Forms - only show if pool is open */}
        {lpPoolStatus && wallet.connected && (
          <>
            {/* LP Deposit */}
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <ArrowUp size={14} className="text-green-400" /> Deposit USDC
              </h3>
              <input
                type="number"
                placeholder="Amount in USDC"
                value={lpDepositAmount}
                onChange={(e) => setLpDepositAmount(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm mb-3 focus:border-purple-500 focus:outline-none"
              />
              <div className="text-xs text-gray-500 mb-3">
                USDC Balance: {formatCurrency(usdcBalance)}
              </div>
              <button
                onClick={async () => {
                  if (lpDepositing) return; // Prevent double clicks
                  if (!wallet.address) return;
                  
                  setLpDepositing(true);
                  try {
                    const amount = parseFloat(lpDepositAmount);
                    if (!amount || amount <= 0) {
                      showMessage('Please enter a valid amount', 'error');
                      return;
                    }
                    if (amount > usdcBalance) {
                      showMessage('Insufficient USDC balance', 'error');
                      return;
                    }
                    if (amount < minLpDeposit) {
                      showMessage(`Minimum deposit is ${formatCurrency(minLpDeposit)}`, 'error');
                      return;
                    }

                    const txParams = await prepareLpDepositTransaction(wallet.address, amount.toString());
                    const txHash = await (window as any).ethereum.request({
                      method: 'eth_sendTransaction',
                      params: [txParams],
                    });
                    
                    showMessage('Deposit submitted! Waiting for confirmation...', 'info');
                    const receipt = await waitForTransactionReceipt(txHash);
                    const success = receipt?.status === '0x1' || receipt?.status === 1;
                    
                    if (success) {
                      showMessage('USDC deposited to LP pool!', 'success');
                      // Refresh LP data
                      const poolStatus = await getLpPoolStatus();
                      setLpPoolStatus(poolStatus);
                      const lpUser = await getLpsInfo(wallet.address);
                      setLpInfo(lpUser);
                      const balance = await getUsdcBalance(wallet.address);
                      setUsdcBalance(balance);
                      setLpDepositAmount('');
                    } else {
                      throw new Error('Deposit transaction failed');
                    }
                  } catch (e: any) {
                    console.error(e);
                    showMessage(e.message || 'Deposit cancelled', 'error');
                  } finally {
                    setLpDepositing(false);
                  }
                }}
                disabled={lpDepositing}
                className="w-full py-3 rounded-xl font-bold text-sm bg-green-600 text-white hover:bg-green-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {lpDepositing ? <Loader2 className="animate-spin" size={16} /> : 'DEPOSIT'}
              </button>
            </div>

            {/* LP Withdraw */}
            {wallet.connected && lpInfo && Number(lpInfo[1]) > 0 && (
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <ArrowDown size={14} className="text-red-400" /> Withdraw USDC
                </h3>
                <input
                  type="number"
                  placeholder="LP token amount"
                  value={lpWithdrawAmount}
                  onChange={(e) => setLpWithdrawAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm mb-3 focus:border-purple-500 focus:outline-none"
                />
                <div className="text-xs text-gray-500 mb-3">
                  Available: {lpInfo ? formatCurrency(Number(lpInfo[1]) / 1000000) : '0'}
                </div>
                <button
                  onClick={async () => {
                    if (lpWithdrawing) return; // Prevent double clicks
                    if (!wallet.address) return;
                    
                    setLpWithdrawing(true);
                    try {
                      const amount = parseFloat(lpWithdrawAmount);
                      if (!amount || amount <= 0) {
                        showMessage('Please enter a valid amount', 'error');
                        return;
                      }
                      const availableLp = Number(lpInfo?.[1] || 0) / 1000000;
                      if (amount > availableLp) {
                        showMessage('Insufficient LP token balance', 'error');
                        return;
                      }

                      const txParams = await prepareLpWithdrawTransaction(wallet.address, amount.toString());
                      const txHash = await (window as any).ethereum.request({
                        method: 'eth_sendTransaction',
                        params: [txParams],
                      });
                      
                      showMessage('Withdrawal submitted! Waiting for confirmation...', 'info');
                      const receipt = await waitForTransactionReceipt(txHash);
                      const success = receipt?.status === '0x1' || receipt?.status === 1;
                      
                      if (success) {
                        showMessage('USDC withdrawn from LP pool!', 'success');
                        // Refresh LP data
                        const poolStatus = await getLpPoolStatus();
                        setLpPoolStatus(poolStatus);
                        const lpUser = await getLpsInfo(wallet.address);
                        setLpInfo(lpUser);
                        const balance = await getUsdcBalance(wallet.address);
                        setUsdcBalance(balance);
                        setLpWithdrawAmount('');
                      } else {
                        throw new Error('Withdrawal transaction failed');
                      }
                    } catch (e: any) {
                      console.error(e);
                      showMessage(e.message || 'Withdrawal cancelled', 'error');
                    } finally {
                      setLpWithdrawing(false);
                    }
                  }}
                  disabled={lpWithdrawing}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {lpWithdrawing ? <Loader2 className="animate-spin" size={16} /> : 'WITHDRAW'}
                </button>
              </div>
            )}

            {/* Risk Adjustment */}
            {wallet.connected && lpInfo && Number(lpInfo[0]) > 0 && (
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <Settings size={14} className="text-orange-400" /> Adjust Risk Level
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-gray-400">Low</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={lpRiskPercentage || (lpInfo ? Number(lpInfo[2]) : 0)}
                    onChange={(e) => setLpRiskPercentage(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-400">High</span>
                </div>
                <div className="text-center mb-3">
                  <span className="text-sm font-bold text-orange-300">{lpRiskPercentage || (lpInfo ? Number(lpInfo[2]) : 0)}%</span>
                </div>
                <button
                  onClick={async () => {
                    if (lpAdjusting) return; // Prevent double clicks
                    if (!wallet.address) return;
                    
                    setLpAdjusting(true);
                    try {
                      const riskPct = parseInt(lpRiskPercentage || (lpInfo ? lpInfo[2].toString() : '0'));
                      const txParams = prepareLpAdjustRiskTransaction(wallet.address, riskPct);
                      const txHash = await (window as any).ethereum.request({
                        method: 'eth_sendTransaction',
                        params: [txParams],
                      });
                      
                      showMessage('Risk adjustment submitted! Waiting for confirmation...', 'info');
                      const receipt = await waitForTransactionReceipt(txHash);
                      const success = receipt?.status === '0x1' || receipt?.status === 1;
                      
                      if (success) {
                        showMessage('Risk level adjusted!', 'success');
                        // Refresh LP data
                        const poolStatus = await getLpPoolStatus();
                        setLpPoolStatus(poolStatus);
                        const lpUser = await getLpsInfo(wallet.address);
                        setLpInfo(lpUser);
                      } else {
                        throw new Error('Risk adjustment transaction failed');
                      }
                    } catch (e: any) {
                      console.error(e);
                      showMessage(e.message || 'Risk adjustment cancelled', 'error');
                    } finally {
                      setLpAdjusting(false);
                    }
                  }}
                  disabled={lpAdjusting}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-orange-600 text-white hover:bg-orange-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {lpAdjusting ? <Loader2 className="animate-spin" size={16} /> : 'UPDATE RISK LEVEL'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-center mt-8 pt-4 border-t border-gray-800">
          <a
            href="https://megapot.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-neon transition-colors"
          >
            POWERED BY MEGAPOT.IO
          </a>
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
    </div>
  );
};

export default Raffle;
