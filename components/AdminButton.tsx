import React, { useState } from 'react';
import { Settings, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { useReferralRewards } from '../hooks/useReferralRewards';
import { WalletState } from '../types';

interface AdminButtonProps {
  wallet: WalletState;
}

const AdminButton: React.FC<AdminButtonProps> = ({ wallet }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const { referralReward, withdrawReferralRewards } = useReferralRewards(wallet.address);

  const handleWithdraw = async () => {
    if (referralReward.isLoading) return;
    
    const amount = parseFloat(referralReward.amount);
    if (amount <= 0) {
      alert('No referral rewards available to withdraw');
      return;
    }

    const confirmed = window.confirm(
      `Withdraw $${referralReward.amount} USDC in referral rewards?\n\n` +
      'This will transfer the funds to your connected wallet.'
    );

    if (confirmed) {
      await withdrawReferralRewards();
      setShowDropdown(false);
    }
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (num === 0) return '0.00';
    if (num < 0.01) return '< $0.01';
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 rounded-md font-bold text-sm transition-all bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white border border-gray-600"
        title="Admin Panel - Referral Rewards"
      >
        <Settings size={16} />
        <span className="hidden sm:inline">ADMIN</span>
      </button>

      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={20} className="text-green-400" />
                <h3 className="font-bold text-white">Referral Rewards</h3>
              </div>
              
              {!wallet.connected ? (
                <div className="flex items-center gap-2 text-yellow-400 text-sm">
                  <AlertCircle size={16} />
                  <span>Connect wallet to view rewards</span>
                </div>
              ) : referralReward.error ? (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle size={16} />
                  <span>{referralReward.error}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Available Rewards:</span>
                    <div className="flex items-center gap-2">
                      {referralReward.isLoading ? (
                        <div className="w-16 h-4 bg-gray-700 rounded animate-pulse" />
                      ) : (
                        <span className="font-bold text-green-400">
                          {formatAmount(referralReward.amount)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    <div>• Referral Wallet: 0x5872...5e1B</div>
                    <div>• Contract: 0xbEDd...51B95</div>
                    <div>• 10% of ticket purchases</div>
                  </div>

                  <button
                    onClick={handleWithdraw}
                    disabled={referralReward.isLoading || parseFloat(referralReward.amount) <= 0}
                    className="w-full py-2 px-4 bg-green-600 text-white font-bold text-sm rounded-md transition-all hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {referralReward.isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : parseFloat(referralReward.amount) > 0 ? (
                      <>
                        <CheckCircle size={16} />
                        Withdraw {formatAmount(referralReward.amount)}
                      </>
                    ) : (
                      <>
                        <AlertCircle size={16} />
                        No Rewards Available
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="p-3 bg-gray-800 border-t border-gray-700">
              <div className="text-xs text-gray-400">
                <div className="font-semibold mb-1">Summary:</div>
                <ul className="space-y-1">
                  <li>• This wallet acts as the referrer for Megapot ticket purchases</li>
                  <li>• Earns 10% commission on all referred ticket sales</li>
                  <li>• Rewards are claimable immediately via contract</li>
                  <li>• Withdrawals go directly to your connected wallet</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminButton;
