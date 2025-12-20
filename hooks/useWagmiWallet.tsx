import { useAccount, useConnect, useDisconnect, useWalletClient, useSwitchChain, useChainId } from 'wagmi';
import { base } from 'wagmi/chains';
import { useState, useCallback, useEffect } from 'react';

export interface WagmiWalletState {
  address: string | null;
  chainId: number | null;
  connected: boolean;
  providerName: string | null;
  connecting: boolean;
}

export const useWagmiWallet = () => {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();

  const [walletState, setWalletState] = useState<WagmiWalletState>({
    address: null,
    chainId: null,
    connected: false,
    providerName: null,
    connecting: false,
  });

  // Update wallet state when wagmi state changes
  useEffect(() => {
    setWalletState({
      address: address || null,
      chainId: chainId || null,
      connected: isConnected,
      providerName: isConnected ? getConnectorName(Array.from(connectors)) : null,
      connecting: isConnecting,
    });
  }, [address, chainId, isConnected, isConnecting, connectors]);

  const getConnectorName = (connectors: any[]): string => {
    // Check if we're connected via Farcaster
    const fc = window.farcaster || window.sdk || (window as any).frameSDK;
    if (fc && isConnected) {
      return 'Farcaster';
    }
    
    // Try to find connector by checking which one is currently connected
    const connectedConnector = connectors.find(c => {
      // Check if this connector has the current account
      if (c.id === 'injected' && (window as any).ethereum?.isMetaMask) return true;
      if (c.id === 'walletconnect') return true;
      if (c.id === 'farcaster') return true;
      return false;
    });
    
    // Return connector name or fallback
    if (connectedConnector?.name) return connectedConnector.name;
    if ((window as any).ethereum?.isMetaMask) return 'MetaMask';
    if ((window as any).coinbaseWalletExtension) return 'Coinbase';
    if ((window as any).walletlink) return 'WalletLink';
    if ((window as any).bitkeep) return 'BitKeep';
    if (window.ethereum?.isCoinbaseWallet) return 'Coinbase Wallet';
    if (window.walletlink) return 'WalletLink';
    if (window.bitkeep) return 'BitKeep';
    
    return 'Web3 Wallet';
  };

  const handleConnect = useCallback(async () => {
    try {
      const connectorsArray = Array.from(connectors);
      
      // Check if we're in Farcaster environment first
      const fc = window.farcaster || window.sdk || (window as any).frameSDK;
      
      if (fc) {
        // In Farcaster environment, try to auto-connect
        const farcasterConnector = connectorsArray.find(c => c.id === 'farcaster');
        if (farcasterConnector) {
          await connect({ connector: farcasterConnector });
          return;
        }
      }
      
      // Fallback to injected (MetaMask, etc.)
      const injectedConnector = connectorsArray.find(c => c.id === 'injected');
      if (injectedConnector) {
        await connect({ connector: injectedConnector });
        return;
      }
      
      // Try any available connector
      if (connectorsArray.length > 0) {
        await connect({ connector: connectorsArray[0] });
      }
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }, [connect, connectors]);

  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const ensureCorrectNetwork = useCallback(async () => {
    if (chainId !== base.id) {
      try {
        await switchChain({ chainId: base.id });
      } catch (error) {
        console.error('Failed to switch to Base network:', error);
        throw error;
      }
    }
  }, [chainId, switchChain]);

  const getAuthToken = useCallback(async (): Promise<string | null> => {
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

  return {
    wallet: walletState,
    connect: handleConnect,
    disconnect: handleDisconnect,
    getAuthToken,
    walletClient,
    ensureCorrectNetwork,
  };
};
