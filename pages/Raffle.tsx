
import React, { useState, useEffect } from 'react';
import { Clock, Ticket, Trophy, Zap, Loader2, History, PlayCircle, Share2 } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { getRaffleStats, getUserRaffleData, claimDailyFreeTicket, prepareBuyTransaction, getRecentWinners, Winner } from '../services/megapot';
import { MEGAPOT_LOGO_URL, APP_URL } from '../constants';

const Raffle: React.FC = () => {
    const { wallet, connect } = useWallet();
    const [activeTab, setActiveTab] = useState<'play' | 'history'>('play');
    
    const [stats, setStats] = useState({ potSizeUSD: 0, timeLeftSeconds: 0, currentRoundId: 0, ticketCost: 1 });
    const [userData, setUserData] = useState({ tickets: 0, freeTicketClaimed: false, lastClaimTimestamp: 0 });
    const [winners, setWinners] = useState<Winner[]>([]);
    
    const [buyAmount, setBuyAmount] = useState(1);
    const [claiming, setClaiming] = useState(false);
    const [buying, setBuying] = useState(false);
    const [msg, setMsg] = useState('');

    // Countdown state for claim button
    const [claimCooldownTime, setClaimCooldownTime] = useState('');

    useEffect(() => {
        const init = async () => {
            const s = await getRaffleStats();
            setStats(prev => ({ ...prev, ...s }));
            
            const w = await getRecentWinners();
            setWinners(w);
            
            if (wallet.address) {
                const u = await getUserRaffleData(wallet.address);
                setUserData(u);
            }
        };
        init();
        
        const poll = setInterval(async () => {
             const s = await getRaffleStats();
             setStats(s);
        }, 30000);

        const timer = setInterval(() => {
            setStats(prev => ({ ...prev, timeLeftSeconds: Math.max(0, prev.timeLeftSeconds - 1) }));
        }, 1000);
        
        return () => {
            clearInterval(poll);
            clearInterval(timer);
        };
    }, [wallet.address]);

    // Effect for Claim Cooldown Timer
    useEffect(() => {
        const updateCooldown = () => {
            if (!userData.freeTicketClaimed) {
                setClaimCooldownTime('');
                return;
            }
            
            const now = Date.now();
            const nextClaim = userData.lastClaimTimestamp + (24 * 60 * 60 * 1000);
            const diff = nextClaim - now;
            
            if (diff <= 0) {
                // Cooldown over, allow claim again
                setUserData(prev => ({ ...prev, freeTicketClaimed: false }));
                setClaimCooldownTime('');
            } else {
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                setClaimCooldownTime(`${h}h ${m}m ${s}s`);
            }
        };

        const interval = setInterval(updateCooldown, 1000);
        updateCooldown(); // Initial call
        return () => clearInterval(interval);
    }, [userData.lastClaimTimestamp, userData.freeTicketClaimed]);


    const formatTime = (seconds: number) => {
        if (seconds <= 0 || isNaN(seconds)) return "DRAWING...";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h < 10 ? '0'+h : h}:${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const handleClaim = async () => {
        if (!wallet.connected || !wallet.address) return connect();
        
        setClaiming(true);
        
        // 1. Share Intent first
        const text = "I just grabbed a free ticket for the Phunks x Megapot Raffle! 🎲";
        const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(APP_URL)}`;
        window.open(shareUrl, '_blank');

        // 2. Claim after short delay
        setTimeout(async () => {
             const res = await claimDailyFreeTicket(wallet.address!);
             setClaiming(false);
             
             if (res.success) {
                 setUserData(prev => ({ 
                     ...prev, 
                     freeTicketClaimed: true, 
                     tickets: prev.tickets + 1,
                     lastClaimTimestamp: res.timestamp || Date.now()
                 }));
                 setMsg('Ticket Claimed!');
             } else {
                 setMsg(res.message || 'Failed to claim.');
             }
             setTimeout(() => setMsg(''), 3000);
        }, 2000);
    };

    const handleBuy = async () => {
        if (!wallet.connected || !wallet.address) return connect();
        setBuying(true);
        try {
            // Note: This needs ERC20 Approval first in a real scenario
            const txParams = prepareBuyTransaction(buyAmount, wallet.address, stats.ticketCost);
            if (txParams.data === "0x") {
                alert("USDC Approval required. Please use a full Web3 provider.");
                setBuying(false);
                return;
            }
            await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [txParams],
            });
            setMsg('Transaction Sent!');
        } catch (e: any) {
            console.error(e);
            setMsg('Transaction Cancelled');
        } finally {
            setBuying(false);
            setTimeout(() => setMsg(''), 3000);
        }
    };

    return (
        <div className="pt-20 pb-24 px-4 max-w-md mx-auto min-h-screen flex flex-col">
            {/* Branding Header */}
            <div className="text-center mb-6 relative">
                 <div className="inline-flex items-center justify-center mb-3">
                    <img src={MEGAPOT_LOGO_URL} alt="Megapot" className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(0,255,148,0.3)]" />
                 </div>
                 <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase leading-none">
                    PHUNKS <span className="text-neon">X</span> MEGAPOT
                 </h1>
                 <p className="text-xs text-gray-500 font-bold tracking-widest mt-1">OFFICIAL RAFFLE</p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex p-1 bg-gray-900 rounded-xl mb-6 border border-gray-800">
                <button 
                    onClick={() => setActiveTab('play')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'play' ? 'bg-neon text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    <PlayCircle size={14} /> Play
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'history' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    <History size={14} /> Winners
                </button>
            </div>

            {activeTab === 'play' ? (
                <>
                    {/* Pot Card */}
                    <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border border-gray-800 rounded-3xl p-6 mb-6 text-center relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-neon/5 rounded-bl-full transition-transform duration-700 group-hover:scale-110 blur-xl"></div>
                        
                        <div className="flex justify-center items-center gap-2 text-gray-400 font-mono text-[10px] mb-2 uppercase tracking-widest">
                            <Clock size={12} className="text-neon" />
                            <span>Closes in: <span className="text-white font-bold">{formatTime(stats.timeLeftSeconds)}</span></span>
                        </div>

                        <p className="text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] tracking-tighter mb-1">
                            {formatCurrency(stats.potSizeUSD)}
                        </p>
                        <p className="text-neon font-bold text-sm tracking-widest uppercase">USDC PRIZE POOL</p>

                        <div className="mt-4 flex justify-center gap-3">
                             <div className="bg-gray-900/50 border border-gray-800 px-3 py-1 rounded-full text-[10px] text-gray-400 font-mono">
                                Round #{stats.currentRoundId || '...'}
                             </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
                        {/* Free Ticket */}
                        <div className="p-5 border-b border-gray-800 bg-gradient-to-r from-yellow-900/10 to-transparent">
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="bg-yellow-500/20 p-1.5 rounded-lg text-yellow-400">
                                        <Zap size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white uppercase">Daily Free Ticket</h3>
                                        <p className="text-[10px] text-gray-400">Claim every 24h</p>
                                    </div>
                                </div>
                                {userData.freeTicketClaimed && (
                                    <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">CLAIMED</span>
                                )}
                            </div>
                            <button 
                                onClick={handleClaim}
                                disabled={!!claimCooldownTime || claiming}
                                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                    claimCooldownTime 
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    : 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-lg shadow-yellow-500/20'
                                }`}
                            >
                                {claiming ? (
                                    <Loader2 className="animate-spin" size={16} />
                                ) : claimCooldownTime ? (
                                    `NEXT FREE CLAIM: ${claimCooldownTime}`
                                ) : (
                                    <>
                                        <Share2 size={16} />
                                        Share Mini App to Claim Ticket
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Buy Tickets */}
                        <div className="p-5 bg-black/40">
                             <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="bg-purple-500/20 p-1.5 rounded-lg text-purple-400">
                                        <Ticket size={16} />
                                    </div>
                                    <h3 className="text-sm font-bold text-white uppercase">Buy Tickets</h3>
                                </div>
                                <span className="text-xs font-bold text-gray-400">$1.00 each</span>
                             </div>

                             <div className="flex items-center gap-2 mb-4">
                                <button onClick={() => setBuyAmount(Math.max(1, buyAmount - 1))} className="w-10 h-10 bg-gray-800 rounded-lg hover:bg-gray-700 text-white font-bold">-</button>
                                <div className="flex-1 h-10 bg-gray-900 rounded-lg flex items-center justify-center font-mono font-bold text-white border border-gray-800">
                                    {buyAmount}
                                </div>
                                <button onClick={() => setBuyAmount(buyAmount + 1)} className="w-10 h-10 bg-gray-800 rounded-lg hover:bg-gray-700 text-white font-bold">+</button>
                             </div>

                             <button 
                                onClick={handleBuy}
                                disabled={buying}
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl shadow-[0_4px_0_#4c1d95] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-2 text-sm tracking-wider uppercase"
                             >
                                {buying ? <Loader2 className="animate-spin" size={16} /> : `BUY FOR ${buyAmount * stats.ticketCost} USDC`}
                             </button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-[#111] border border-gray-800 rounded-2xl p-4 flex-1">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Recent Winners</h3>
                    <div className="space-y-3">
                        {winners.length > 0 ? winners.map((winner, idx) => (
                            <div key={idx} className="bg-black/40 p-3 rounded-xl border border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-yellow-500/10 text-yellow-500 p-2 rounded-lg">
                                        <Trophy size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white font-mono">
                                            {winner.address ? `${winner.address.substring(0,6)}...${winner.address.substring(winner.address.length - 4)}` : 'Unknown'}
                                        </p>
                                        <p className="text-[10px] text-gray-500">Round #{winner.roundId}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-neon">{formatCurrency(winner.prize)}</p>
                                    <p className="text-[10px] text-gray-500">{new Date(winner.timestamp).toLocaleDateString()}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-10 text-gray-500 text-xs">No winners loaded.</div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Powered By Footer */}
            <div className="mt-auto pt-8 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
                <a 
                    href="https://megapot.io" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-[0.2em] border-b border-transparent hover:border-white transition-all"
                >
                    POWERED BY MEGAPOT.IO
                </a>
            </div>

            {msg && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl border border-neon/50 text-xs font-bold animate-in fade-in slide-in-from-top-4 z-50 flex items-center gap-2">
                    <div className="w-2 h-2 bg-neon rounded-full animate-pulse"></div>
                    {msg}
                </div>
            )}
        </div>
    );
};

export default Raffle;
