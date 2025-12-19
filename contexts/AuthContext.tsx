import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthUser {
  id: string;
  name: string;
  username: string;
  pfpUrl: string;
  fid: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  signOut: () => void;
  setUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUserState] = useState<AuthUser | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('farcaster_user');
    if (savedUser) {
      setUserState(JSON.parse(savedUser));
    }
  }, []);

  const setUser = (nextUser: AuthUser) => {
    setUserState(nextUser);
    localStorage.setItem('farcaster_user', JSON.stringify(nextUser));
  };

  const signOut = () => {
    setUserState(null);
    localStorage.removeItem('farcaster_user');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    signOut,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
