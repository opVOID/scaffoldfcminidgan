import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Initialize Farcaster SDK if in Farcaster context
if (typeof window !== 'undefined' && window.parent) {
  // Farcaster Frame SDK initialization
  try {
    // @ts-ignore - Farcaster SDK global
    if (window.sdk && window.sdk.actions) {
      window.sdk.actions.ready();
    }
  } catch (error) {
    console.log('Not in Farcaster context or SDK not available');
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);