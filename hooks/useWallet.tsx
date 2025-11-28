import { useState, useEffect, useCallback } from 'react';
import { WalletState } from '../types';
import { BASE_CHAIN_ID } from '../constants';

declare global {
  interface Window {
    ethereum?: any;
    farcaster?: any;
    // Farcaster SDK
    sdk?: any;
    // Support for various wallet providers
    walletlink?: any;
    bitkeep?: any;
  }
}

export const useWallet = () => {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    chainId: null,
    connected: false,
    providerName: null,
  });

  const getWalletProvider = () => {
    // Try different wallet providers in order of preference
    if (window.farcaster) return window.farcaster;
    if (window.ethereum?.isMetaMask) return window.ethereum;
    if (window.ethereum?.isCoinbaseWallet) return window.ethereum;
    if (window.ethereum?.isWalletConnect) return window.ethereum;
    if (window.walletlink) return window.walletlink;
    if (window.bitkeep) return window.bitkeep;
    if (window.ethereum) return window.ethereum; // fallback to any available
    return null;
  };

  const getWalletName = (provider: any): string => {
    if (provider?.isMetaMask) return 'MetaMask';
    if (provider?.isCoinbaseWallet) return 'Coinbase Wallet';
    if (provider?.isWalletConnect) return 'WalletConnect';
    if (window.farcaster === provider) return 'Farcaster';
    if (window.walletlink === provider) return 'WalletLink';
    if (window.bitkeep === provider) return 'BitKeep';
    return 'Unknown Wallet';
  };

  const checkNetwork = useCallback(async (provider: any) => {
    if (!provider) return;
    const chainId = parseInt(await provider.request({ method: 'eth_chainId' }), 16);
    if (chainId !== BASE_CHAIN_ID) {
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${BASE_CHAIN_ID.toString(16)}` }],
        });
      } catch (error) {
        console.error("Failed to switch network:", error);
      }
    }
  }, []);

  const connect = useCallback(async () => {
    const provider = getWalletProvider();

    if (!provider) {
      alert("Please install a wallet like MetaMask, Coinbase Wallet, or connect via Farcaster");
      return;
    }

    const walletName = getWalletName(provider);

    try {
      // For Farcaster wallets, we need to be more explicit
      if (walletName === 'Farcaster') {
        // Farcaster might need explicit user interaction and ready() call
        if (typeof provider.ready === 'function') {
          await provider.ready();
        }
        await provider.request({ method: 'eth_requestAccounts' });
      }

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const chainId = parseInt(await provider.request({ method: 'eth_chainId' }), 16);

      setWallet({
        address: accounts[0],
        chainId,
        connected: true,
        providerName: walletName,
      });

      await checkNetwork(provider);
    } catch (error) {
      console.error("Connection error:", error);
      // More specific error handling for Farcaster
      if (walletName === 'Farcaster') {
        alert("Failed to connect to Farcaster wallet. Please make sure you're in a Farcaster client or have the wallet installed.");
      }
    }
  }, [checkNetwork]);

  useEffect(() => {
    const provider = getWalletProvider();
    if (provider) {
      provider.on('accountsChanged', (accounts: string[]) => {
        setWallet(prev => ({
          ...prev,
          address: accounts[0] || null,
          connected: accounts.length > 0
        }));
      });

      provider.on('chainChanged', (chainId: string) => {
        setWallet(prev => ({
          ...prev,
          chainId: parseInt(chainId, 16)
        }));
      });
    }
  }, []);

  return { wallet, connect };
};