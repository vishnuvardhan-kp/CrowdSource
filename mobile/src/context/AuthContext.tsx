import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { authApi } from '../api/auth';
import { setApiAuthToken } from '../api/client';
import { storage } from '../utils/storage';
import { config } from '../constants/config';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const initAuth = useCallback(async () => {
    setLoading(true);
    try {
      const savedToken = await storage.getItem(config.storageKeys.authToken);
      if (savedToken) {
        setToken(savedToken);
        setApiAuthToken(savedToken);

        try {
          const profile = await authApi.getMe();
          setUser(profile);
          await storage.setItem(config.storageKeys.userProfile, JSON.stringify(profile));
        } catch {
          // Token expired or invalid
          await storage.removeItem(config.storageKeys.authToken);
          await storage.removeItem(config.storageKeys.userProfile);
          setToken(null);
          setApiAuthToken(null);
          setUser(null);
        }
      }
    } catch {
      // Storage read error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authApi.login(email.trim(), password);
      const jwtToken = res.accessToken || res.access_token;
      if (!jwtToken) {
        throw new Error('No access token returned from server.');
      }

      await storage.setItem(config.storageKeys.authToken, jwtToken);
      if (res.user) {
        await storage.setItem(config.storageKeys.userProfile, JSON.stringify(res.user));
        setUser(res.user);
      }

      setToken(jwtToken);
      setApiAuthToken(jwtToken);

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Login failed. Please verify your credentials.',
      };
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authApi.register({
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
        phone: data.phone?.trim() || undefined,
      });

      const jwtToken = res.accessToken || res.access_token;
      if (jwtToken) {
        await storage.setItem(config.storageKeys.authToken, jwtToken);
        setToken(jwtToken);
        setApiAuthToken(jwtToken);
      }

      if (res.user) {
        await storage.setItem(config.storageKeys.userProfile, JSON.stringify(res.user));
        setUser(res.user);
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Registration failed. Please check the provided details.',
      };
    }
  };

  const logout = async (): Promise<void> => {
    await storage.removeItem(config.storageKeys.authToken);
    await storage.removeItem(config.storageKeys.userProfile);
    setToken(null);
    setApiAuthToken(null);
    setUser(null);
  };

  const refreshProfile = async (): Promise<void> => {
    try {
      const profile = await authApi.getMe();
      setUser(profile);
      await storage.setItem(config.storageKeys.userProfile, JSON.stringify(profile));
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
