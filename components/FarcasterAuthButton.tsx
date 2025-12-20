import React, { useCallback, useState } from 'react';
import { SignInButton } from '@farcaster/auth-kit';
import '@farcaster/auth-kit/styles.css';
import { useAuth } from '../contexts/AuthContext';

interface FarcasterAuthButtonProps {
  className?: string;
}

export const FarcasterAuthButton: React.FC<FarcasterAuthButtonProps> = ({ className = '' }) => {
  const [error, setError] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { user, setUser, signOut } = useAuth();

  const handleSuccess = useCallback(
    async (res: any) => {
      try {
        setIsConnecting(false);
        setError(false);

        const user = {
          id: String(res.fid),
          name: res.displayName || res.username || 'Unknown',
          username: res.username || 'unknown',
          pfpUrl: res.pfpUrl || '',
          fid: res.fid,
        };

        setUser(user);
        localStorage.setItem('farcaster_user', JSON.stringify(user));
        console.log('Successfully authenticated:', user);
      } catch (e) {
        console.error('Auth verification error:', e);
        setError(true);
        setIsConnecting(false);
      }
    },
    [setUser]
  );

  const handleSignOut = useCallback(() => {
    setIsConnecting(false);
    signOut();
    // Clear any cached auth state to allow fresh reconnection
    setTimeout(() => {
      localStorage.removeItem('farcaster_user');
      // Force a page refresh or clear any remaining auth state
      window.location.reload();
    }, 100);
  }, [signOut]);

  const handleSignIn = useCallback(() => {
    setIsConnecting(true);
    setError(false);
  }, []);

  return (
    <div className={`farcaster-auth-button ${className}`}>
      {user ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            {user.pfpUrl && (
              <img src={user.pfpUrl} alt={user.name} className="w-6 h-6 rounded-full" />
            )}
            <span className="text-sm text-gray-300">
              {user.name || user.username}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div>
          <SignInButton
            onSuccess={handleSuccess}
            onStatusResponse={(status: any) => {
              console.log('[AuthKit] status', status);
              if (status.state === 'pending') {
                setIsConnecting(true);
              }
            }}
            onError={(e: any) => {
              console.error('[AuthKit] error', e);
              setError(true);
              setIsConnecting(false);
            }}
            onSignOut={handleSignOut}
            debug
          />
          {isConnecting && (
            <div className="text-blue-400 text-sm mt-2">
              Connecting to Farcaster...
            </div>
          )}
          {error && (
            <div className="text-red-500 text-sm mt-2">
              Unable to sign in at this time. Please try again.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
