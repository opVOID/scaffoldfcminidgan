/**
 * Environment configuration
 * This file centralizes all environment variables and provides type safety
 */

// Server-side environment variables (not exposed to client)
const serverEnv = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  // Add other server-only environment variables here
} as const;

// Client-side environment variables (exposed to the browser)
const clientEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  NEXT_PUBLIC_APP_DOMAIN: process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost',
  NEXT_PUBLIC_NEYNAR_API_KEY: process.env.NEXT_PUBLIC_NEYNAR_API_KEY,
  // Add other public environment variables here
} as const;

// Type-safe environment variables
export const env = {
  ...serverEnv,
  ...clientEnv,
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
} as const;

// Type definitions for environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Server-side
      NODE_ENV: 'development' | 'production' | 'test';
      PORT?: string;
      NEXTAUTH_SECRET?: string;
      NEXTAUTH_URL?: string;
      
      // Client-side (prefixed with NEXT_PUBLIC_)
      NEXT_PUBLIC_APP_URL?: string;
      NEXT_PUBLIC_APP_DOMAIN?: string;
      NEXT_PUBLIC_NEYNAR_API_KEY?: string;
    }
  }
}

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_APP_DOMAIN',
  'NEXT_PUBLIC_NEYNAR_API_KEY',
] as const;

// Check for missing required environment variables
if (process.env.NODE_ENV !== 'test') {
  const missingVars = requiredEnvVars.filter(
    (key) => !process.env[key] && !process.env[`NEXT_PUBLIC_${key}`]
  );

  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars.join(', '));
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}
