// Farcaster SDK Initialization Utility
declare global {
  interface Window {
    sdk?: any;
  }
}

export const initializeFarcasterSDK = () => {
  // Initialize Farcaster SDK when available
  if (window.sdk && window.sdk.actions && typeof window.sdk.actions.ready === 'function') {
    console.log('Initializing Farcaster SDK...');
    window.sdk.actions.ready();
    return true;
  }
  
  // If SDK not ready yet, try again after a delay
  if (window.sdk) {
    console.log('Farcaster SDK found but not ready, retrying...');
    setTimeout(() => {
      if (window.sdk?.actions?.ready) {
        console.log('Farcaster SDK ready on retry');
        window.sdk.actions.ready();
      }
    }, 1000);
  } else {
    console.log('Farcaster SDK not found');
  }
  
  return false;
};

// Auto-initialize when module loads
initializeFarcasterSDK();
