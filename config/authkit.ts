import { AuthKitProvider } from '@farcaster/auth-kit';

export const authKitConfig = {
  rpcUrl: 'https://mainnet.optimism.io',
  domain: window.location.host,
  siweUri: window.location.origin,
};

export { AuthKitProvider };
