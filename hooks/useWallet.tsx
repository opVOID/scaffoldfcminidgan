import { useState, useEffect, useCallback } from 'react';
import { WalletState } from '../types';
import { BASE_CHAIN_ID } from '../constants';

declare global {
  interface Window {
    ethereum?: any;
    farcaster?: any;
    sdk?: any;
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
    console.log("getWalletProvider called", {
      isSDKLoaded: sdkState?.isLoaded,
      hasActions: !!sdkState?.actions,
      hasEthereum: !!window.ethereum
    });

    // Priority 1: Neynar SDK ethereum provider
    if (sdkState?.isLoaded && sdkState?.actions) {
      console.log("Checking Neynar SDK actions...");
      
      // The Neynar SDK provides ethereum provider through the context
      // Check if we can get it through the SDK
      if (sdkState.actions.context?.client?.wallet) {
        console.log("Found wallet in context.client.wallet");
        return sdkState.actions.context.client.wallet;
      }
      
      // Try direct ethereum provider
      if (sdkState.actions.ethereum) {
        console.log("Found ethereum provider in actions");
        return sdkState.actions.ethereum;
      }
    }

    // Priority 2: Check global SDK instances
    const globalSDK = window.sdk || window.farcaster || (window as any).frameSDK;
    if (globalSDK) {
      console.log("Found global SDK:", globalSDK);
      
      if (globalSDK.wallet?.ethereumProvider) {
        console.log("Using globalSDK.wallet.ethereumProvider");
        return globalSDK.wallet.ethereumProvider;
      }
      
      if (globalSDK.ethereumProvider) {
        console.log("Using globalSDK.ethereumProvider");
        return globalSDK.ethereumProvider;
      }
      
      if (typeof globalSDK.request === 'function') {
        console.log("Using globalSDK as provider");
        return globalSDK;
      }
    }

    // Priority 3: Standard EIP-1193 providers (for desktop browser fallback)
    if (window.ethereum) {
      console.log("Using window.ethereum");
      return window.ethereum;
    }

    if (window.walletlink) {
      console.log("Using walletlink");
      return window.walletlink;
    }
    
    if (window.bitkeep) {
      console.log("Using bitkeep");
      return window.bitkeep;
    }

    console.warn("No provider found");
    return null;
  };

  const getWalletName = (provider: any): string => {
    if (provider?.isMetaMask) return 'MetaMask';
    if (provider?.isCoinbaseWallet) return 'Coinbase Wallet';
    if (provider?.isWalletConnect) return 'WalletConnect';

    // Check if it's from Neynar/Farcaster SDK
    if (sdkState?.isLoaded) {
      const sdkProvider = sdkState.actions?.context?.client?.wallet || 
                         sdkState.actions?.ethereum;
      if (sdkProvider === provider) {
        return 'Farcaster';
      }
    }

    const globalSDK = window.sdk || window.farcaster || (window as any).frameSDK;
    if (globalSDK?.wallet?.ethereumProvider === provider ||
        globalSDK?.ethereumProvider === provider ||
        globalSDK === provider) {
      return 'Farcaster';
    }

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
          if (switchError.code === 4902) {
            console.log("Network needs to be added to wallet");
          }
        }
      }
    } catch (error) {
      console.error("Failed to check/switch network:", error);
    }
  }, []);

  const connect = useCallback(async () => {
    console.log("Connect called, SDK state:", {
      isLoaded: sdkState?.isLoaded,
      hasActions: !!sdkState?.actions
    });

    const provider = getWalletProvider();

    if (!provider) {
      const diagnostics = {
        sdkLoaded: !!sdkState?.isLoaded,
        hasActions: !!sdkState?.actions,
        hasGlobalSDK: !!(window.sdk || window.farcaster || (window as any).frameSDK),
        hasEthereum: !!window.ethereum,
      };
      
      console.error("No Web3 provider found", diagnostics);
      
      alert(
        `Wallet not detected.\n\n` +
        `SDK Loaded: ${diagnostics.sdkLoaded}\n` +
        `Has Actions: ${diagnostics.hasActions}\n` +
        `Global SDK: ${diagnostics.hasGlobalSDK}\n` +
        `Window Ethereum: ${diagnostics.hasEthereum}\n\n` +
        `Please use a desktop browser with MetaMask or open this within Farcaster.`
      );
      return;
    }

    const walletName = getWalletName(provider);
    console.log(`Attempting to connect to ${walletName}...`);

    try {
      // For Farcaster, make sure SDK is ready
      if (walletName === 'Farcaster') {
        if (sdkState?.actions?.ready && !sdkState.actions._readyCalled) {
          console.log("Calling SDK ready()...");
          await sdkState.actions.ready();
        }
      }

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const chainIdHex = await provider.request({ method: 'eth_chainId' });
      const chainId = parseInt(chainIdHex, 16);

      console.log("Connected:", { accounts, chainId, walletName });

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
      alert(
        `Failed to connect to ${walletName}.\n\n` +
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
        `If using Farcaster, ensure you're in the Warpcast app.`
      );
    }
  }, [checkNetwork, sdkState]);

  const disconnect = useCallback(() => {
    console.log("Disconnecting wallet");
    setWallet({
      address: null,
      chainId: null,
      connected: false,
      providerName: null,
    });
  }, []);

  // Auto-detect and setup provider
  useEffect(() => {
    let checkInterval: any;
    let attempts = 0;
    const maxAttempts = 20; // Increased from 10

    const setupProvider = async (provider: any) => {
      if (!provider || typeof provider.request !== 'function') {
        console.log("Provider not valid for setup");
        return false;
      }

      try {
        // Check if already connected
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
          console.log('Accounts changed:', accounts);
          setWallet(prev => ({
            ...prev,
            address: accounts[0] || null,
            connected: accounts.length > 0,
            provider: provider
          }));
        });

        provider.on('chainChanged', (chainId: string) => {
          console.log('Chain changed:', chainId);
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
      attempts++;
      console.log(`Provider check attempt ${attempts}/${maxAttempts}`);
      
      const provider = getWalletProvider();
      if (provider) {
        console.log("Provider found on attempt", attempts);
        const success = await setupProvider(provider);
        if (success) {
          clearInterval(checkInterval);
        }
      }

      if (attempts >= maxAttempts) {
        console.log("Max attempts reached, stopping checks");
        clearInterval(checkInterval);
      }
    };

    // Wait a bit before starting checks to let SDK initialize
    const startDelay = setTimeout(() => {
      runCheck();
      checkInterval = setInterval(runCheck, 500);
    }, 100);

    return () => {
      clearTimeout(startDelay);
      clearInterval(checkInterval);
    };
  }, [sdkState?.isLoaded]);

  const getAuthToken = useCallback(async () => {
    const globalSDK = window.sdk || window.farcaster;
    if (globalSDK?.quickAuth?.getToken) {
      try {
        const token = await globalSDK.quickAuth.getToken();
        return token;
      } catch (error) {
        console.error("Failed to get Farcaster auth token:", error);
        return null;
      }
    }
    return null;
  }, []);

  return { wallet, connect, disconnect, getAuthToken };
};