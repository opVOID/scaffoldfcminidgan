import { useState, useEffect, useCallback } from 'react';
import { WalletState } from '../types';
import { BASE_CHAIN_ID } from '../constants';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const useWallet = () => {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    chainId: null,
    connected: false,
  });

  const checkNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    const chainId = parseInt(await window.ethereum.request({ method: 'eth_chainId' }), 16);
    if (chainId !== BASE_CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${BASE_CHAIN_ID.toString(16)}` }],
        });
      } catch (error) {
        console.error("Failed to switch network:", error);
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert("Please install a wallet like MetaMask or Coinbase Wallet");
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainId = parseInt(await window.ethereum.request({ method: 'eth_chainId' }), 16);
      
      setWallet({
        address: accounts[0],
        chainId,
        connected: true,
      });
      
      await checkNetwork();
    } catch (error) {
      console.error("Connection error:", error);
    }
  }, [checkNetwork]);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        setWallet(prev => ({
          ...prev,
          address: accounts[0] || null,
          connected: accounts.length > 0
        }));
      });

      window.ethereum.on('chainChanged', (chainId: string) => {
        setWallet(prev => ({
          ...prev,
          chainId: parseInt(chainId, 16)
        }));
      });
    }
  }, []);

  return { wallet, connect };
};