import { createConfig, http, fallback } from 'wagmi';
import { base, mainnet } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';
import { createConnector } from 'wagmi';

// Farcaster connector for in-app wallet
const farcasterConnector = createConnector((config) => ({
  id: 'farcaster',
  name: 'Farcaster',
  type: 'injected',
  connect: async () => {
    // Try to get Farcaster SDK provider - check multiple possible locations
    const fc = window.farcaster || window.sdk || (window as any).frameSDK;
    
    // In Farcaster frames, try to auto-connect without requesting accounts
    if (fc) {
      // Check if already connected by trying to get accounts first
      let accounts = [];
      let chainId = base.id; // Default to Base chain
      
      // Try different provider locations for existing accounts
      if (fc?.wallet?.ethProvider && typeof fc.wallet.ethProvider.request === 'function') {
        try {
          accounts = await fc.wallet.ethProvider.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            const chainIdHex = await fc.wallet.ethProvider.request({ method: 'eth_chainId' });
            chainId = parseInt(chainIdHex, 16) as typeof base.id;
          }
        } catch (error) {
          console.warn('Farcaster wallet.ethProvider accounts check failed:', error);
        }
      }
      
      if (accounts.length === 0 && fc?.wallet?.provider && typeof fc.wallet.provider.request === 'function') {
        try {
          accounts = await fc.wallet.provider.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            const chainIdHex = await fc.wallet.provider.request({ method: 'eth_chainId' });
            chainId = parseInt(chainIdHex, 16) as typeof base.id;
          }
        } catch (error) {
          console.warn('Farcaster wallet.provider accounts check failed:', error);
        }
      }
      
      if (accounts.length === 0 && fc?.ethereumProvider && typeof fc.ethereumProvider.request === 'function') {
        try {
          accounts = await fc.ethereumProvider.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            const chainIdHex = await fc.ethereumProvider.request({ method: 'eth_chainId' });
            chainId = parseInt(chainIdHex, 16) as typeof base.id;
          }
        } catch (error) {
          console.warn('Farcaster ethereumProvider accounts check failed:', error);
        }
      }
      
      // If we have accounts, return them
      if (accounts && accounts.length > 0) {
        return {
          accounts: accounts.map((address: string) => ({ address })),
          chainId: chainId
        };
      }
      
      // If no accounts found, try to request them (for manual connection)
      if (fc?.wallet?.ethProvider && typeof fc.wallet.ethProvider.request === 'function') {
        try {
          const requestedAccounts = await fc.wallet.ethProvider.request({ method: 'eth_requestAccounts' });
          const chainIdHex = await fc.wallet.ethProvider.request({ method: 'eth_chainId' });
          const requestedChainId = parseInt(chainIdHex, 16) as typeof base.id;
          
          return {
            accounts: requestedAccounts.map((address: string) => ({ address })),
            chainId: requestedChainId
          };
        } catch (error) {
          console.warn('Farcaster wallet.ethProvider request failed:', error);
        }
      }
      
      // If we're in Farcaster but can't connect to wallet, return a mock connection
      console.warn('In Farcaster environment but no wallet provider available, returning mock connection');
      return {
        accounts: [{ address: '0x0000000000000000000000000000000000000000' }],
        chainId: base.id
      };
    }
    
    throw new Error('Farcaster wallet not found');
  },
  disconnect: async () => {
    // Farcaster wallets typically don't support manual disconnect
  },
  getAccounts: async () => {
    const fc = window.farcaster || window.sdk || (window as any).frameSDK;
    
    if (fc?.wallet?.ethProvider && typeof fc.wallet.ethProvider.request === 'function') {
      try {
        const accounts = await fc.wallet.ethProvider.request({ method: 'eth_accounts' });
        return accounts.map((address: string) => ({ address }));
      } catch (error) {
        console.warn('Farcaster wallet.ethProvider getAccounts failed:', error);
      }
    }
    
    if (fc?.wallet?.provider && typeof fc.wallet.provider.request === 'function') {
      try {
        const accounts = await fc.wallet.provider.request({ method: 'eth_accounts' });
        return accounts.map((address: string) => ({ address }));
      } catch (error) {
        console.warn('Farcaster wallet.provider getAccounts failed:', error);
      }
    }
    
    if (fc?.ethereumProvider && typeof fc.ethereumProvider.request === 'function') {
      try {
        const accounts = await fc.ethereumProvider.request({ method: 'eth_accounts' });
        return accounts.map((address: string) => ({ address }));
      } catch (error) {
        console.warn('Farcaster ethereumProvider getAccounts failed:', error);
      }
    }
    
    if ((window as any).sdkState?.actions && typeof (window as any).sdkState.actions.request === 'function') {
      try {
        const actions = (window as any).sdkState.actions;
        const accounts = await actions.request({ method: 'eth_accounts' });
        return accounts.map((address: string) => ({ address }));
      } catch (error) {
        console.warn('Farcaster sdkState.actions getAccounts failed:', error);
      }
    }
    
    return [];
  },
  getChainId: async () => {
    const fc = window.farcaster || window.sdk || (window as any).frameSDK;
    
    if (fc?.wallet?.ethProvider && typeof fc.wallet.ethProvider.request === 'function') {
      try {
        const chainIdHex = await fc.wallet.ethProvider.request({ method: 'eth_chainId' });
        return parseInt(chainIdHex, 16) as typeof base.id;
      } catch (error) {
        console.warn('Farcaster wallet.ethProvider getChainId failed:', error);
      }
    }
    
    if (fc?.wallet?.provider && typeof fc.wallet.provider.request === 'function') {
      try {
        const chainIdHex = await fc.wallet.provider.request({ method: 'eth_chainId' });
        return parseInt(chainIdHex, 16) as typeof base.id;
      } catch (error) {
        console.warn('Farcaster wallet.provider getChainId failed:', error);
      }
    }
    
    if (fc?.ethereumProvider && typeof fc.ethereumProvider.request === 'function') {
      try {
        const chainIdHex = await fc.ethereumProvider.request({ method: 'eth_chainId' });
        return parseInt(chainIdHex, 16) as typeof base.id;
      } catch (error) {
        console.warn('Farcaster ethereumProvider getChainId failed:', error);
      }
    }
    
    if ((window as any).sdkState?.actions && typeof (window as any).sdkState.actions.request === 'function') {
      try {
        const actions = (window as any).sdkState.actions;
        const chainIdHex = await actions.request({ method: 'eth_chainId' });
        return parseInt(chainIdHex, 16) as typeof base.id;
      } catch (error) {
        console.warn('Farcaster sdkState.actions getChainId failed:', error);
      }
    }
    
    return base.id;
  },
  isAuthorized: async function() {
    const fc = window.farcaster || window.sdk || (window as any).frameSDK;
    if (fc) return true;
    
    try {
      const accounts = await this.getAccounts();
      return accounts.length > 0;
    } catch {
      return false;
    }
  },
  switchChain: async ({ chainId }: { chainId: number }) => {
    // Farcaster wallets typically don't support chain switching
    throw new Error('Chain switching not supported in Farcaster');
  },
  // Event handlers are optional for basic functionality
  onAccountsChanged: undefined,
  onChainChanged: undefined,
  onConnect: undefined,
  onDisconnect: undefined,
  getProvider: () => {
    // Return the Farcaster provider if available
    const fc = window.farcaster || window.sdk || (window as any).frameSDK;
    
    if (fc?.wallet?.ethProvider) return fc.wallet.ethProvider;
    if (fc?.wallet?.provider) return fc.wallet.provider;
    if (fc?.ethereumProvider) return fc.ethereumProvider;
    if ((window as any).sdkState?.actions) return (window as any).sdkState.actions;
    
    return undefined;
  },
}));

export const config = createConfig({
  chains: [base, mainnet],
  connectors: [
    farcasterConnector,
    injected(),
    walletConnect({ 
      projectId: process.env.VITE_WALLETCONNECT_PROJECT_ID || 'default-project-id'
    }),
  ],
  transports: {
    [base.id]: fallback([http('https://base-rpc.publicnode.com')]),
    [mainnet.id]: fallback([http('https://eth-mainnet.publicnode.com')]),
  },
});

declare global {
  interface Window {
    farcaster?: any;
    sdk?: any;
    frameSDK?: any;
    sdkState?: any;
  }
}
