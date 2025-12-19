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
    // Try Farcaster v2 SDK provider first (both common global names)
    const fc = window.farcaster || window.sdk;

    if (fc?.wallet?.ethereumProvider) return fc.wallet.ethereumProvider;
    if (fc?.ethereumProvider) return fc.ethereumProvider;

    // Check if the farcaster/sdk object itself is a provider
    if (fc && typeof fc.request === 'function') return fc;

    // Standard EIP-1193 providers
    if (window.ethereum?.isMetaMask) return window.ethereum;
    if (window.ethereum?.isCoinbaseWallet) return window.ethereum;
    if (window.ethereum?.isWalletConnect) return window.ethereum;
    if (window.walletlink) return window.walletlink;
    if (window.bitkeep) return window.bitkeep;

    // Detect mobile injected providers that might be under window.ethereum
    if (window.ethereum) return window.ethereum;

    return null;
  };

  const getWalletName = (provider: any): string => {
    if (provider?.isMetaMask) return 'MetaMask';
    if (provider?.isCoinbaseWallet) return 'Coinbase Wallet';
    if (provider?.isWalletConnect) return 'WalletConnect';

    const fc = window.farcaster || window.sdk;
    if (fc?.wallet?.ethereumProvider === provider ||
      fc?.ethereumProvider === provider ||
      fc === provider) return 'Farcaster';

    if (window.walletlink === provider) return 'WalletLink';
    if (window.bitkeep === provider) return 'BitKeep';
    return 'Web3 Wallet';
  };

  const checkNetwork = useCallback(async (provider: any) => {
    if (!provider || typeof provider.request !== 'function') return;
    try {
      const chainId = parseInt(await provider.request({ method: 'eth_chainId' }), 16);
      if (chainId !== BASE_CHAIN_ID) {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${BASE_CHAIN_ID.toString(16)}` }],
        });
      }
    } catch (error) {
      console.error("Failed to check/switch network:", error);
    }
  }, []);

  const connect = useCallback(async () => {
    const provider = getWalletProvider();

    if (!provider) {
      console.warn("No Web3 provider found");
      alert("Please install a wallet like MetaMask, Coinbase Wallet, or connect via Farcaster");
      return;
    }

    const walletName = getWalletName(provider);
    console.log(`Connecting to ${walletName}...`);

    try {
      // For Farcaster wallets, ensure ready() is called if available
      if (walletName === 'Farcaster' && typeof provider.ready === 'function') {
        await provider.ready();
      }

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const chainIdHex = await provider.request({ method: 'eth_chainId' });
      const chainId = parseInt(chainIdHex, 16);

      if (accounts && accounts.length > 0) {
        setWallet({
          address: accounts[0],
          chainId,
          connected: true,
          providerName: walletName,
          provider: provider,
        });

        await checkNetwork(provider);
      }
    } catch (error) {
      console.error("Connection error:", error);
      if (walletName === 'Farcaster') {
        alert("Failed to connect to Farcaster wallet.");
      }
    }
  }, [checkNetwork]);

  const disconnect = useCallback(() => {
    setWallet({
      address: null,
      chainId: null,
      connected: false,
      providerName: null,
    });
  }, []);

  useEffect(() => {
    let checkInterval: any;
    let attempts = 0;
    const maxAttempts = 10;

    const setupProvider = async (provider: any) => {
      if (!provider || typeof provider.request !== 'function') return false;

      // Check if already connected
      try {
        const accounts = await provider.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          const chainIdHex = await provider.request({ method: 'eth_chainId' });
          const chainId = parseInt(chainIdHex, 16);
          const walletName = getWalletName(provider);

          console.log('Auto-connected to:', accounts[0], 'via', walletName);
          setWallet({
            address: accounts[0],
            chainId,
            connected: true,
            providerName: walletName,
            provider: provider,
          });
        }
      } catch (e) {
        console.warn('Silent connect check failed:', e);
      }

      // Set up listeners
      if (typeof provider.on === 'function') {
        provider.on('accountsChanged', (accounts: string[]) => {
          setWallet(prev => ({
            ...prev,
            address: accounts[0] || null,
            connected: accounts.length > 0,
            provider: provider
          }));
        });

        provider.on('chainChanged', (chainId: string) => {
          setWallet(prev => ({
            ...prev,
            chainId: parseInt(chainId, 16),
            provider: provider
          }));
        });
      }
      return true;
    };

    const runCheck = async () => {
      const provider = getWalletProvider();
      if (provider) {
        const success = await setupProvider(provider);
        if (success) {
          clearInterval(checkInterval);
        }
      }

      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
      }
    };

    // Run immediately and then poll every 500ms for 5s to catch late injection
    runCheck();
    checkInterval = setInterval(runCheck, 500);

    return () => clearInterval(checkInterval);
  }, []);

  return { wallet, connect, disconnect };
};