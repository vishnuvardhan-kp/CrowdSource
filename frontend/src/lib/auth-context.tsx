"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface OrganizationMembershipInfo {
  id: string;
  organization_id: string;
  organization_name: string | null;
  organization_type: string | null;
  organization_role: "ADMIN" | "MEMBER";
  membership_status: "PENDING" | "ACTIVE" | "INACTIVE" | "REVOKED";
  created_at: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  is_active?: boolean;
  district_id?: string | null;
  district?: string | null;
  state?: string | null;
  jurisdiction_scope?: string | null;
  districtRef?: {
    id: string;
    name: string;
    state: string;
    code?: string;
  } | null;
  primaryOrganization?: {
    id: string;
    name: string;
    organization_type: string;
    district: string;
    state: string;
  } | null;
  memberships: OrganizationMembershipInfo[];
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  const fetchProfile = useCallback(async (authToken: string): Promise<UserProfile | null> => {
    try {
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const profileData = await res.json();
        setUser(profileData);
        return profileData;
      } else if (res.status === 401 || res.status === 403) {
        // Token confirmed invalid or expired
        localStorage.removeItem("samadhan_token");
        setToken(null);
        setUser(null);
        return null;
      } else {
        // Transient server error (500, 502, 503) - keep token
        return null;
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    const savedToken = typeof window !== "undefined" ? localStorage.getItem("samadhan_token") : null;
    if (savedToken) {
      setToken(savedToken);
      fetchProfile(savedToken);
    } else {
      setLoading(false);
    }
  }, [fetchProfile]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: UserProfile }> => {
    try {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = Array.isArray(data.message) ? data.message.join(", ") : data.message || "Login failed";
        return { success: false, error: errorMsg };
      }

      localStorage.setItem("samadhan_token", data.accessToken);
      setToken(data.accessToken);
      const userProfile = await fetchProfile(data.accessToken);

      return { success: true, user: userProfile || undefined };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error during login" };
    }
  };

  const register = async (data: { name: string; email: string; password: string; phone?: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${apiUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await res.json();

      if (!res.ok) {
        const errorMsg = Array.isArray(resData.message) ? resData.message.join(", ") : resData.message || "Registration failed";
        return { success: false, error: errorMsg };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error during registration" };
    }
  };

  const logout = () => {
    localStorage.removeItem("samadhan_token");
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchProfile(token);
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
