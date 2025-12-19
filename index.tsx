import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MiniAppProvider } from '@neynar/react';
import { AuthKitProvider } from '@farcaster/auth-kit';



const config = {
  rpcUrl: 'https://mainnet.optimism.io',
  domain: 'localhost',
  siweUri: 'http://localhost:5173/login',
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <MiniAppProvider>
      <AuthKitProvider config={config}>
        <App />
      </AuthKitProvider>
    </MiniAppProvider>
  </React.StrictMode>
);