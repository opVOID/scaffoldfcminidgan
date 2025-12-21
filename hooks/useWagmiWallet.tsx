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
    // Try Mini App SDK quickAuth methods first (preferred)
    if (window.sdk?.quickAuth?.getToken) {
      try {
        const token = await window.sdk.quickAuth.getToken();
        console.log('Got auth token via sdk.quickAuth.getToken:', token ? 'success' : 'failed');
        return token;
      } catch (error) {
        console.error("Failed to get auth token via sdk.quickAuth:", error);
      }
    }
    
    // Try alternative quickAuth methods
    const fc = window.farcaster || window.sdk || (window as any).frameSDK;
    if (fc?.quickAuth?.getToken) {
      try {
        const token = await fc.quickAuth.getToken();
        console.log('Got auth token via fc.quickAuth.getToken:', token ? 'success' : 'failed');
        return token;
      } catch (error) {
        console.error("Failed to get auth token via fc.quickAuth:", error);
      }
    }
    
    // Try direct auth methods
    if (window.sdk?.auth?.getToken) {
      try {
        const token = await window.sdk.auth.getToken();
        console.log('Got auth token via sdk.auth.getToken:', token ? 'success' : 'failed');
        return token;
      } catch (error) {
        console.error("Failed to get auth token via sdk.auth:", error);
      }
    }
    
    // Try signIn method to get a token
    if (window.sdk?.actions?.signIn) {
      try {
        const nonce = Math.random().toString(36).substring(7);
        const result = await window.sdk.actions.signIn({ nonce });
        console.log('Got auth token via signIn:', result ? 'success' : 'failed');
        
        // The result might contain a token or we need to verify it server-side
        if (result && result.token) {
          return result.token;
        }
        
        // If no token directly, try to get it from the auth result
        if (result && result.message && result.signature) {
          // We'll need to verify this server-side to get a proper token
          console.log('Got signIn result, will verify server-side');
          return 'signin_result';
        }
      } catch (error) {
        console.error("Failed to get auth token via signIn:", error);
      }
    }
    
    console.warn('No auth token method available. Mini App SDK state:', {
      hasFarcaster: !!window.farcaster,
      hasSDK: !!window.sdk,
      hasFrameSDK: !!(window as any).frameSDK,
      hasQuickAuth: !!window.sdk?.quickAuth,
      hasAuth: !!window.sdk?.auth,
      hasActions: !!window.sdk?.actions
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
