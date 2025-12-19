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
    // Try Farcaster v2 SDK provider first
    // Note: window.farcaster is often the SDK object, but the provider is deeper
    if (window.farcaster?.wallet?.ethereumProvider) return window.farcaster.wallet.ethereumProvider;
    if (window.farcaster?.ethereumProvider) return window.farcaster.ethereumProvider;
    if (window.farcaster) return window.farcaster;

    // Standard EIP-1193 providers
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
    if (window.farcaster?.wallet?.ethereumProvider === provider ||
      window.farcaster?.ethereumProvider === provider ||
      window.farcaster === provider) return 'Farcaster';
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
    console.log(`Attempting to connect with ${walletName}...`);

    try {
      // For Farcaster wallets, ensure ready() is called if available
      if (walletName === 'Farcaster') {
        if (typeof provider.ready === 'function') {
          await provider.ready();
        }
      }

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const chainIdHex = await provider.request({ method: 'eth_chainId' });
      const chainId = parseInt(chainIdHex, 16);

      setWallet({
        address: accounts[0],
        chainId,
        connected: true,
        providerName: walletName,
        provider: provider, // Store provider for direct usage
      });

      await checkNetwork(provider);
    } catch (error) {
      console.error("Connection error:", error);
      if (walletName === 'Farcaster') {
        alert("Failed to connect to Farcaster wallet. Please make sure you're in a Farcaster client.");
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
    const provider = getWalletProvider();
    if (provider && typeof provider.on === 'function') {
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

      // Check if already connected on mount
      const checkExistingConnection = async () => {
        try {
          const accounts = await provider.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            const chainIdHex = await provider.request({ method: 'eth_chainId' });
            const chainId = parseInt(chainIdHex, 16);
            const walletName = getWalletName(provider);

            console.log('Found existing connection:', accounts[0], 'via', walletName);
            setWallet({
              address: accounts[0],
              chainId,
              connected: true,
              providerName: walletName,
              provider: provider,
            });
          }
        } catch (error) {
          console.error('Failed to check existing connection:', error);
        }
      };

      checkExistingConnection();
    }
  }, []);

  return { wallet, connect, disconnect };
};