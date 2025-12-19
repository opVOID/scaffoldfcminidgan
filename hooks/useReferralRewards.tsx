import { useState, useEffect, useCallback } from 'react';
import { ReferralReward } from '../types';
import { MEGAPOT_CONTRACT_ADDRESS, REFERRAL_ADDRESS, RPC_URL } from '../constants';

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Function to get function selector (browser compatible)
const getFunctionSelector = (functionSignature: string): string => {
  // Correct function selectors from BaseScan contract read page
  const selectors: { [key: string]: string } = {
    'referralFeesClaimable(address)': '630f0b1c', // From BaseScan: 0x630f0b1c
    'withdrawReferralFees()': '89cb31ca'         // From original code, may need verification
  };
  
  return selectors[functionSignature] || '00000000';
};

export const useReferralRewards = (userAddress: string | null) => {
  const [referralReward, setReferralReward] = useState<ReferralReward>({
    amount: '0',
    isLoading: false,
    error: null,
  });

  const getProvider = () => {
    if (window.ethereum) {
      return window.ethereum;
    }
    // Fallback to RPC for read calls
    return {
      request: async ({ method, params }: any) => {
        if (method === 'eth_call') {
          const response = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_call',
              params: params,
              id: 1
            })
          });
          const data = await response.json();
          return data.result;
        }
        throw new Error('Method not supported');
      }
    };
  };

  const fetchReferralBalance = useCallback(async () => {
    if (!userAddress) return;

    setReferralReward((prev: ReferralReward) => ({ ...prev, isLoading: true, error: null }));

    try {
      const provider = getProvider();
      
      // Create call data for referralFeesClaimable function
      const functionSignature = 'referralFeesClaimable(address)';
      const selector = getFunctionSelector(functionSignature);
      const cleanAddress = userAddress.slice(2).toLowerCase().padStart(64, '0');
      const callData = '0x' + selector + cleanAddress;

      const result = await provider.request({
        method: 'eth_call',
        params: [
          {
            to: MEGAPOT_CONTRACT_ADDRESS,
            data: callData
          },
          'latest'
        ]
      });

      // Convert hex result to decimal (szabo units, 6 decimals)
      const amountHex = result;
      const amountWei = parseInt(amountHex, 16);
      const amountUSD = amountWei / 1_000_000; // Convert from szabo to USDC

      setReferralReward({
        amount: amountUSD.toFixed(6),
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching referral balance:', error);
      setReferralReward((prev: ReferralReward) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to fetch referral balance',
      }));
    }
  }, [userAddress]);

  const withdrawReferralRewards = useCallback(async () => {
    if (!userAddress || !window.ethereum) {
      alert('Please connect your wallet first');
      return;
    }

    const amount = parseFloat(referralReward.amount);
    if (amount <= 0) {
      alert('No referral rewards available to withdraw');
      return;
    }

    setReferralReward((prev: ReferralReward) => ({ ...prev, isLoading: true, error: null }));

    try {
      const provider = window.ethereum;
      
      // Create transaction data for withdrawReferralFees function
      const functionSignature = 'withdrawReferralFees()';
      const selector = getFunctionSelector(functionSignature);
      const txData = '0x' + selector;

      const txParams = {
        to: MEGAPOT_CONTRACT_ADDRESS,
        from: userAddress,
        data: txData,
      };

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      });

      console.log('Withdrawal transaction sent:', txHash);
      alert(`Withdrawal transaction sent! Hash: ${txHash}`);

      // Refresh balance after withdrawal
      setTimeout(fetchReferralBalance, 2000);
    } catch (error) {
      console.error('Error withdrawing referral rewards:', error);
      setReferralReward((prev: ReferralReward) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to withdraw referral rewards',
      }));
      alert('Failed to withdraw referral rewards. Please try again.');
    }
  }, [userAddress, referralReward.amount, fetchReferralBalance]);

  useEffect(() => {
    if (userAddress) {
      fetchReferralBalance();
    }
  }, [userAddress, fetchReferralBalance]);

  return {
    referralReward,
    fetchReferralBalance,
    withdrawReferralRewards,
  };
};
