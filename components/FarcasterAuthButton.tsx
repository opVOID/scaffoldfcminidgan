import React, { useCallback, useState } from 'react';
import { SignInButton } from '@farcaster/auth-kit';
import '@farcaster/auth-kit/styles.css';
import { useAuth } from '../contexts/AuthContext';

interface FarcasterAuthButtonProps {
  className?: string;
}

export const FarcasterAuthButton: React.FC<FarcasterAuthButtonProps> = ({ className = '' }) => {
  const [error, setError] = useState(false);
  const { setUser, signOut } = useAuth();

  const handleSuccess = useCallback(
    async (res: any) => {
      try {
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
      }
    },
    [setUser]
  );

  const handleSignOut = useCallback(() => {
    signOut();
  }, [signOut]);

  return (
    <div className={`farcaster-auth-button ${className}`}>
      <SignInButton
        onSuccess={handleSuccess}
        onStatusResponse={(status: any) => {
          console.log('[AuthKit] status', status);
        }}
        onError={(e: any) => {
          console.error('[AuthKit] error', e);
          setError(true);
        }}
        onSignOut={handleSignOut}
        debug
      />
      {error && (
        <div className="text-red-500 text-sm mt-2">
          Unable to sign in at this time. Please try again.
        </div>
      )}
    </div>
  );
};
