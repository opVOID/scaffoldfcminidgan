import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { MEGAPOT_API_KEY } from './constants';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const apiHost = env.VITE_MEGAPOT_API_HOST || 'https://api.megapot.io';
    const apiBasePath = env.VITE_MEGAPOT_API_BASE_PATH || '/api/v1';
    const rpcHost = env.VITE_RPC_HOST || 'https://base.meowrpc.com';
    const rpcPath = env.VITE_RPC_PATH || '/';
    const rpcProxyPath = '/rpc';
    const basescanHost = env.VITE_BASESCAN_API_HOST || 'https://api.basescan.org';
    const basescanBasePath = env.VITE_BASESCAN_API_PATH || '/api';
    const basescanProxyPath = env.VITE_BASESCAN_API_BASE || '/basescan-api';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          [apiBasePath]: {
            target: apiHost,
            changeOrigin: true,
            secure: true,
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                proxyReq.setHeader('apikey', MEGAPOT_API_KEY);
                proxyReq.setHeader('x-api-key', MEGAPOT_API_KEY);
                proxyReq.removeHeader('origin');
              });
            }
          },
          [rpcProxyPath]: {
            target: rpcHost,
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(new RegExp(`^${rpcProxyPath}`), rpcPath || '/'),
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                proxyReq.removeHeader('origin');
              });
            }
          },
          [basescanProxyPath]: {
            target: basescanHost,
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(new RegExp(`^${basescanProxyPath}`), basescanBasePath || '/api'),
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                proxyReq.removeHeader('origin');
              });
            }
          }
        },
        allowedHosts: [
  'localhost',
  '.trycloudflare.com',
  '8f3439c8fccb.ngrok-free.app'
]
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
