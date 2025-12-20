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

export const useWallet = (sdkState?: { isLoaded: boolean; actions: any }) => {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    chainId: null,
    connected: false,
    providerName: null,
  });

  const getWalletProvider = () => {
    // Try Farcaster v2 SDK provider
    // Check various common global names for the SDK
    const fc = window.farcaster || window.sdk || (window as any).frameSDK || sdkState?.actions;

    if (fc) {
      console.log("Farcaster SDK detected:", fc);
      
      // Try Neynar SDK wallet provider first (from documentation)
      if (fc.wallet?.ethProvider && typeof fc.wallet.ethProvider.request === 'function') {
        console.log("Using fc.wallet.ethProvider (Neynar SDK)");
        return fc.wallet.ethProvider;
      }
      if (fc.wallet?.provider && typeof fc.wallet.provider.request === 'function') {
        console.log("Using fc.wallet.provider");
        return fc.wallet.provider;
      }
      if (fc.ethereumProvider && typeof fc.ethereumProvider.request === 'function') {
        console.log("Using fc.ethereumProvider");
        return fc.ethereumProvider;
      }
      // For direct SDK access, try the global sdk
      if (window.sdk?.wallet?.ethProvider && typeof window.sdk.wallet.ethProvider.request === 'function') {
        console.log("Using window.sdk.wallet.ethProvider");
        return window.sdk.wallet.ethProvider;
      }
      if (typeof fc.request === 'function') {
        console.log("Using fc object as provider");
        return fc;
      }
      
      // If we have Farcaster SDK but no valid provider, create a wrapper
      if (sdkState?.actions && typeof sdkState.actions.request === 'function') {
        console.log("Using sdkState.actions as provider");
        return sdkState.actions;
      }
    }

    // Standard EIP-1193 providers
    if (window.ethereum && typeof window.ethereum.request === 'function') {
      // If we are in Farcaster, window.ethereum might be the right one too
      return window.ethereum;
    }

    if (window.walletlink && typeof window.walletlink.request === 'function') return window.walletlink;
    if (window.bitkeep && typeof window.bitkeep.request === 'function') return window.bitkeep;

    return null;
  };

  const getWalletName = (provider: any): string => {
    if (provider?.isMetaMask) return 'MetaMask';
    if (provider?.isCoinbaseWallet) return 'Coinbase Wallet';
    if (provider?.isWalletConnect) return 'WalletConnect';

    const fc = window.farcaster || window.sdk || (window as any).frameSDK || sdkState?.actions;
    if (fc?.wallet?.ethProvider === provider ||
      fc?.wallet?.provider === provider ||
      fc?.ethereumProvider === provider ||
      fc === provider ||
      window.sdk?.wallet?.ethProvider === provider ||
      sdkState?.actions === provider) return 'Farcaster';

    if (window.walletlink === provider) return 'WalletLink';
    if (window.bitkeep === provider) return 'BitKeep';
    return 'Web3 Wallet';
  };

  const checkNetwork = useCallback(async (provider: any) => {
    if (!provider || typeof provider.request !== 'function') return;
    try {
      const chainIdHex = await provider.request({ method: 'eth_chainId' });
      const chainId = parseInt(chainIdHex, 16);
      if (chainId !== BASE_CHAIN_ID) {
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${BASE_CHAIN_ID.toString(16)}` }],
          });
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to the wallet.
          if (switchError.code === 4902) {
            console.log("Adding network to wallet...");
          }
        }
      }
    } catch (error) {
      console.error("Failed to check/switch network:", error);
    }
  }, []);

  const connect = useCallback(async () => {
    const provider = getWalletProvider();

    if (!provider) {
      const diagnostics = `FC: ${!!(window.farcaster || window.sdk || (window as any).frameSDK)}, NeynarLoaded: ${!!sdkState?.isLoaded}, Actions: ${!!sdkState?.actions}, SDK_Wallet: ${!!window.sdk?.wallet}, ETH: ${!!window.ethereum}`;
      console.warn("No Web3 provider found", diagnostics);
      alert(`Wallet not detected. ${diagnostics}\nPlease use a desktop browser with MetaMask or open this within Farcaster.`);
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
        alert("Failed to connect to Farcaster wallet. Check if you are in the Warpcast app.");
      }
    }
  }, [checkNetwork, sdkState]);

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

    const checkFarcasterWallet = async () => {
      // Check if we're in a Farcaster mini-app with wallet already connected
      if (sdkState?.isLoaded && sdkState?.actions) {
        console.log('Checking Farcaster mini-app wallet...');
        
        // Try to get the wallet provider from Farcaster SDK
        const provider = getWalletProvider();
        
        if (provider) {
          console.log('Farcaster wallet provider found, checking connection...');
          const success = await setupProvider(provider);
          if (success) {
            clearInterval(checkInterval);
            return;
          }
        }
        
        // If no provider found but we're in Farcaster, set as connected anyway
        // since Farcaster mobile apps have wallets connected by default
        console.log('In Farcaster mini-app, setting wallet as connected');
        setWallet({
          address: 'Farcaster Wallet', // Placeholder address
          chainId: 8453, // Base chain ID
          connected: true,
          providerName: 'Farcaster',
          provider: sdkState.actions,
        });
        clearInterval(checkInterval);
        return;
      }
    };

    const runCheck = async () => {
      // First check if we're in Farcaster mini-app
      if (sdkState?.isLoaded) {
        await checkFarcasterWallet();
      } else {
        // Standard wallet detection for non-Farcaster environments
        const provider = getWalletProvider();
        if (provider) {
          const success = await setupProvider(provider);
          if (success) {
            clearInterval(checkInterval);
          }
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
  }, [sdkState?.isLoaded, sdkState?.actions]);

  const getAuthToken = useCallback(async () => {
    // Try multiple methods to get auth token
    const fc = window.farcaster || window.sdk || (window as any).frameSDK;
    
    if (fc?.quickAuth?.getToken) {
      try {
        const token = await fc.quickAuth.getToken();
        console.log('Got auth token via quickAuth.getToken:', token ? 'success' : 'failed');
        return token;
      } catch (error) {
        console.error("Failed to get Farcaster auth token via quickAuth:", error);
      }
    }
    
    // Try alternative methods
    if (fc?.auth?.getToken) {
      try {
        const token = await fc.auth.getToken();
        console.log('Got auth token via auth.getToken:', token ? 'success' : 'failed');
        return token;
      } catch (error) {
        console.error("Failed to get Farcaster auth token via auth:", error);
      }
    }
    
    // Try direct SDK methods
    if (window.sdk?.auth?.getToken) {
      try {
        const token = await window.sdk.auth.getToken();
        console.log('Got auth token via window.sdk.auth.getToken:', token ? 'success' : 'failed');
        return token;
      } catch (error) {
        console.error("Failed to get auth token via window.sdk.auth:", error);
      }
    }
    
    // Try frame SDK methods
    if ((window as any).frameSDK?.actions?.getUserInfo) {
      try {
        const userInfo = await (window as any).frameSDK.actions.getUserInfo();
        const token = userInfo?.token;
        console.log('Got auth token via frameSDK.getUserInfo:', token ? 'success' : 'failed');
        return token;
      } catch (error) {
        console.error("Failed to get auth token via frameSDK:", error);
      }
    }
    
    console.warn('No auth token method available. Farcaster SDK state:', {
      hasFarcaster: !!window.farcaster,
      hasSDK: !!window.sdk,
      hasFrameSDK: !!(window as any).frameSDK,
      hasQuickAuth: !!fc?.quickAuth,
      hasAuth: !!fc?.auth
    });
    
    return null;
  }, []);

  return { wallet, connect, disconnect, getAuthToken };
};