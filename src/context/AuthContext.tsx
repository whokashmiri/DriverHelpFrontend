import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getMe, login as loginApi, logout as logoutApi } from "../api/authApi";

import type { AuthUser, LoginPayload } from "../types/auth";

import { connectSocket, disconnectSocket } from "../socket/socket";

type AuthContextValue = {
  user: AuthUser | null;

  isAuthenticated: boolean;

  isLoading: boolean;

  login: (payload: LoginPayload) => Promise<AuthUser>;

  logout: () => Promise<void>;

  refreshUser: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await getMe();

      setUser(response.user);

      void connectSocket().catch((error) => {
        console.warn("[Socket] Initial connection failed:", error);
      });

      return response.user;
    } catch (error) {
      console.log("[Auth] Session restore failed:", error);

      setUser(null);

      disconnectSocket();

      return null;
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      console.log("[Auth] initialize start");

      try {
        await refreshUser();

        console.log("[Auth] refresh finished");
      } catch (error) {
        console.error("[Auth] initialization error", error);
      } finally {
        console.log("[Auth] loading false");

        setIsLoading(false);
      }
    };

    void initializeAuth();
  }, [refreshUser]);

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await loginApi(payload);

    setUser(response.user);

    void connectSocket().catch((error) => {
      console.warn("[Socket] Initial connection failed:", error);
    });

    return response.user;
  }, []);

  const logout = useCallback(async () => {
    disconnectSocket();

    await logoutApi();

    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,

      isAuthenticated: Boolean(user),

      isLoading,

      login,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
