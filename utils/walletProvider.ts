/**
 * Wallet Provider Utility
 * Handles multiple wallet extension conflicts and provides a unified interface
 */

interface WalletProvider {
  name: string;
  isAvailable: () => boolean;
  getProvider: () => any;
  isConnected: () => boolean;
}

// List of wallet providers in order of preference
const walletProviders: WalletProvider[] = [
  {
    name: 'MetaMask',
    isAvailable: () => typeof window !== 'undefined' && !!(window as any).ethereum?.isMetaMask,
    getProvider: () => (window as any).ethereum,
    isConnected: () => !!(window as any).ethereum?.isConnected?.()
  },
  {
    name: 'Coinbase Wallet',
    isAvailable: () => typeof window !== 'undefined' && !!(window as any).ethereum?.isCoinbaseWallet,
    getProvider: () => (window as any).ethereum,
    isConnected: () => !!(window as any).ethereum?.isConnected?.()
  },
  {
    name: 'WalletConnect',
    isAvailable: () => typeof window !== 'undefined' && !!(window as any).walletConnect,
    getProvider: () => (window as any).walletConnect,
    isConnected: () => false // WalletConnect needs manual connection
  },
  {
    name: 'Generic Ethereum',
    isAvailable: () => typeof window !== 'undefined' && !!(window as any).ethereum,
    getProvider: () => (window as any).ethereum,
    isConnected: () => !!(window as any).ethereum?.isConnected?.()
  }
];

/**
 * Get the best available wallet provider
 */
export const getWalletProvider = (): WalletProvider | null => {
  for (const provider of walletProviders) {
    try {
      if (provider.isAvailable()) {
        console.log(`[WALLET] Found available provider: ${provider.name}`);
        return provider;
      }
    } catch (error) {
      console.warn(`[WALLET] Error checking ${provider.name}:`, error);
    }
  }
  
  console.log('[WALLET] No wallet providers available');
  return null;
};

/**
 * Initialize wallet provider with conflict resolution
 */
export const initializeWalletProvider = async (): Promise<any> => {
  console.log('[WALLET] Initializing wallet provider...');
  
  // Check if we're in a Farcaster environment first
  const isFarcasterEnv = !!(
    window.farcaster || 
    window.sdk || 
    (window as any).frameSDK ||
    window.location?.search?.includes('farcaster')
  );
  
  if (isFarcasterEnv) {
    console.log('[WALLET] Farcaster environment detected, skipping wallet initialization');
    return null;
  }
  
  const provider = getWalletProvider();
  
  if (!provider) {
    console.log('[WALLET] No wallet provider found');
    return null;
  }
  
  try {
    const walletProvider = provider.getProvider();
    
    // Handle provider conflicts by checking if it's already initialized
    if (walletProvider && typeof walletProvider.request === 'function') {
      // Test if provider is responsive
      try {
        await walletProvider.request({ method: 'eth_chainId' });
        console.log(`[WALLET] ${provider.name} provider is responsive`);
        return walletProvider;
      } catch (testError) {
        console.warn(`[WALLET] ${provider.name} provider test failed:`, testError);
      }
    }
    
    return walletProvider;
  } catch (error) {
    console.error(`[WALLET] Error initializing ${provider.name}:`, error);
    return null;
  }
};

/**
 * Safely get the Ethereum provider with fallback
 */
export const getEthereumProvider = (): any => {
  try {
    // First try to get the preferred provider
    const provider = getWalletProvider();
    if (provider) {
      return provider.getProvider();
    }
    
    // Fallback to any available ethereum provider
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      return (window as any).ethereum;
    }
    
    return null;
  } catch (error) {
    console.error('[WALLET] Error getting ethereum provider:', error);
    return null;
  }
};

/**
 * Check if any wallet is connected
 */
export const isWalletConnected = (): boolean => {
  const provider = getWalletProvider();
  return provider ? provider.isConnected() : false;
};

/**
 * Get wallet information
 */
export const getWalletInfo = () => {
  const provider = getWalletProvider();
  if (!provider) {
    return {
      name: 'None',
      connected: false,
      available: false
    };
  }
  
  return {
    name: provider.name,
    connected: provider.isConnected(),
    available: provider.isAvailable()
  };
};

// Type declarations for window object
declare global {
  interface Window {
    ethereum?: any;
    walletConnect?: any;
    farcaster?: any;
    sdk?: any;
    frameSDK?: any;
  }
}

export default {
  getWalletProvider,
  initializeWalletProvider,
  getEthereumProvider,
  isWalletConnected,
  getWalletInfo
};
