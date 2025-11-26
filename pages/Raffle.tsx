import React, { useState, useEffect } from 'react';
import { Clock, Ticket, Trophy, Zap, Loader2, History, PlayCircle, Share2, AlertCircle, CheckCircle } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { 
  getRaffleStats, 
  getUserRaffleData, 
  claimDailyFreeTicket, 
  prepareBuyTransaction, 
  prepareApproveTransaction,
  checkUSDCAllowance,
  getRecentWinners, 
  Winner,
  RaffleStats,
  UserRaffleStats
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
  const [buyAmount, setBuyAmount] = useState(1);
  const [claiming, setClaiming] = useState(false);
  const [buying, setBuying] = useState(false);
  const [approving, setApproving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error' | 'info'>('info');
  
  // 24h Countdown state
  const [claimCooldownTime, setClaimCooldownTime] = useState('');
  const [usdcAllowance, setUsdcAllowance] = useState(0);

  // Initialize data
  useEffect(() => {
    const init = async () => {
      try {
        const s = await getRaffleStats();
        setStats(s);
        
        const w = await getRecentWinners();
        setWinners(w);
        
        if (wallet.address && wallet.connected) {
          const u = await getUserRaffleData(wallet.address);
          setUserData(u);
          
          const allowance = await checkUSDCAllowance(wallet.address);
          setUsdcAllowance(allowance);
        }
      } catch (e) {
        console.error('Init error:', e);
      }
    };
    init();
    
    // Poll stats every 30s
    const poll = setInterval(async () => {
      const s = await getRaffleStats();
      setStats(s);
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
    if (!wallet.connected || !wallet.address) {
      connect();
      return;
    }
    
    setClaiming(true);
    
    // Open share intent
    const text = `I just grabbed a free ticket for the Phunks x Megapot Raffle! 🎲\n\nJoin me for a chance to win the $${Math.floor(stats.potSizeUSD).toLocaleString()} jackpot!`;
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
    if (!wallet.connected || !wallet.address) {
      connect();
      return;
    }
    
    setApproving(true);
    try {
      const txParams = prepareApproveTransaction(wallet.address, 1000); // Approve 1000 USDC
      await (window as any).ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });
      showMessage('Approval submitted! Please wait...', 'info');
      
      // Wait and check allowance
      setTimeout(async () => {
        const allowance = await checkUSDCAllowance(wallet.address!);
        setUsdcAllowance(allowance);
        setApproving(false);
        if (allowance > 0) {
          showMessage('USDC approved!', 'success');
        }
      }, 5000);
    } catch (e: any) {
      console.error(e);
      showMessage('Approval cancelled', 'error');
      setApproving(false);
    }
  };

  // Handle Ticket Purchase
  const handleBuy = async () => {
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
    
    setBuying(true);
    try {
      const txParams = prepareBuyTransaction(buyAmount, wallet.address, stats.ticketCost);
      await (window as any).ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });
      showMessage(`🎟️ ${buyAmount} ticket(s) purchased!`, 'success');
      
      // Refresh user data
      setTimeout(async () => {
        const u = await getUserRaffleData(wallet.address!);
        setUserData(u);
      }, 3000);
    } catch (e: any) {
      console.error(e);
      showMessage('Transaction cancelled', 'error');
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
          className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            activeTab === 'play' ? 'bg-neon text-black shadow-lg' : 'text-gray-500 hover:text-white'
          }`}
        >
          <PlayCircle size={14} /> Play
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            activeTab === 'history' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'
          }`}
        >
          <History size={14} /> Winners
        </button>
      </div>

      {activeTab === 'play' ? (
        <>
          {/* Pot Card */}
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 rounded-2xl p-6 mb-4 border border-yellow-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs text-yellow-300">
                <Clock size={14} />
                <span>Closes in: {formatTime(stats.timeLeftSeconds)}</span>
              </div>
              <div className="text-xs text-gray-400">
                {stats.ticketsSoldCount} tickets • {stats.activePlayers} players
              </div>
            </div>
            <div className="text-4xl font-black text-white mb-1">
              {formatCurrency(stats.potSizeUSD)}
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">
              USDC Prize Pool • Round #{stats.currentRoundId || '...'}
            </div>
          </div>

          {/* Your Tickets */}
          {wallet.connected && userData.tickets > 0 && (
            <div className="bg-purple-900/30 rounded-xl p-3 mb-4 border border-purple-500/30">
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-300">Your Tickets</span>
                <span className="text-lg font-bold text-white">{userData.tickets}</span>
              </div>
            </div>
          )}

          {/* Free Ticket Section */}
          <div className="bg-gray-900/50 rounded-xl p-4 mb-4 border border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap size={14} className="text-neon" /> Daily Free Ticket
                </h3>
                <p className="text-xs text-gray-500">Share to claim every 24h</p>
              </div>
              {userData.freeTicketClaimed && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle size={12} /> CLAIMED
                </span>
              )}
            </div>
            <button
              onClick={handleClaim}
              disabled={claiming || (userData.freeTicketClaimed && !!claimCooldownTime)}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                userData.freeTicketClaimed && claimCooldownTime
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-neon text-black hover:bg-neon/80'
              }`}
            >
              {claiming ? (
                <Loader2 className="animate-spin" size={16} />
              ) : claimCooldownTime ? (
                <>Already Checked In - Come Back In: {claimCooldownTime}</>
              ) : (
                <><Share2 size={14} /> Share Mini App to Claim Ticket</>
              )}
            </button>
          </div>

          {/* Buy Tickets Section */}
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Ticket size={14} className="text-purple-400" /> Buy Tickets
                </h3>
                <p className="text-xs text-gray-500">${stats.ticketCost.toFixed(2)} USDC each</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => setBuyAmount(Math.max(1, buyAmount - 1))}
                className="w-10 h-10 bg-gray-800 rounded-lg hover:bg-gray-700 text-white font-bold"
              >-</button>
              <span className="text-2xl font-bold text-white w-12 text-center">{buyAmount}</span>
              <button
                onClick={() => setBuyAmount(buyAmount + 1)}
                className="w-10 h-10 bg-gray-800 rounded-lg hover:bg-gray-700 text-white font-bold"
              >+</button>
            </div>
            
            {usdcAllowance < buyAmount * stats.ticketCost ? (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="w-full py-3 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
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
          </div>
        </>
      ) : (
        /* Winners Tab */
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Trophy size={14} className="text-yellow-400" /> Recent Winners
          </h3>
          {winners.length > 0 ? winners.map((winner, idx) => (
            <div key={idx} className="bg-gray-900/50 rounded-xl p-3 border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-mono text-white">
                    {winner.address ? `${winner.address.substring(0, 6)}...${winner.address.substring(winner.address.length - 4)}` : 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500">Round #{winner.roundId}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-neon">{formatCurrency(winner.prize)}</p>
                  <p className="text-xs text-gray-500">{new Date(winner.timestamp).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-8 text-gray-500">
              <Trophy size={32} className="mx-auto mb-2 opacity-50" />
              <p>No winners loaded yet</p>
            </div>
          )}
        </div>
      )}

      {/* Powered By Footer */}
      <div className="mt-6 text-center">
        <a
          href="https://megapot.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 hover:text-neon transition-colors"
        >
          POWERED BY MEGAPOT.IO
        </a>
      </div>

      {/* Message Toast */}
      {msg && (
        <div className={`fixed bottom-20 left-4 right-4 p-3 rounded-xl text-center text-sm font-bold flex items-center justify-center gap-2 ${
          msgType === 'success' ? 'bg-green-500/90 text-white' :
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
