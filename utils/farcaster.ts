

import { ethers } from "ethers";
import { sdk } from "@farcaster/miniapp-sdk";

const isInMiniApp = await sdk.isInMiniApp();
if (window.sdk?.actions?.ready) {
  window.sdk.actions.ready();
}

declare global {
  interface Window {
    sdk?: any;
  }
}

export const initializeFarcasterSDK = async (): Promise<void> => {
  const inIFrame = window.self !== window.top; 
  try {
    if (inIFrame && window.sdk?.actions && typeof window.sdk.actions.ready === "function") {
      // Try initializing Farcaster SDK
      console.log("Attempting to initialize Farcaster SDK...");
      await handleFarcasterSignIn();
    } else {

      console.log("Not in iframe or Farcaster SDK unavailable. Using fallback...");
      await initiateWalletConnect();
    }
  } catch (error) {
    console.error("Error during Sign-In Flow: ", error);
    throw new Error("Failure during authentication. Please reload and try again.");
  }
};


const handleFarcasterSignIn = async (): Promise<void> => {
  try {
    // Farcaster SDK ready action
    console.log("Initializing Farcaster SDK...");
    window.sdk?.actions?.ready();

    // Optional SDK custom connect flow (if applicable)
    if (typeof window.sdk?.actions?.connect === "function") {
      const response = await window.sdk.actions.connect();
      console.log("Farcaster: Connected Successfully", response);
    }
  } catch (error) {
    console.error("Farcaster SDK Initialization Failed: ", error);
    throw new Error("Farcaster sign-in failed. Please try again.");
  }
};

// WalletConnect Fallback
const initiateWalletConnect = async (): Promise<void> => {
  try {
    console.log("Initializing WalletConnect...");

    // Note: WalletConnect provider setup is commented out since the import was removed
    // You can uncomment and configure this if needed
    /*
    const provider = new WalletConnectProvider({
      infuraId: "YOUR_INFURA_PROJECT_ID", // Replace this with your Infura Project ID
    });

    // Enable session (popup will appear to user)
    await provider.enable();

    // Wrap the provider with ethers.js
    const web3Provider = new ethers.BrowserProvider(provider);
    */

    // Placeholder for WalletConnect functionality
    console.log("WalletConnect not configured - please implement if needed");
    return;
  } catch (error) {
    console.error("Wallet Connect Failed: ", error);
    throw new Error("Wallet connection failed. Please ensure your wallet is set up correctly.");
  }
};

// Auto-Initialize Authentication Flow
initializeFarcasterSDK();