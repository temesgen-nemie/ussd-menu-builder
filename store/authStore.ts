"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getCurrentUser, login, type AuthUser } from "@/lib/api";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  clearError: () => void;
  loginUser: (username: string, password: string) => Promise<void>;
  fetchMe: () => Promise<void>;
  logout: () => void;
};

const AUTH_TOKEN_KEY = "ussd-auth-token";

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      setToken: (token) => {
        if (typeof window !== "undefined") {
          if (token) {
            window.localStorage.setItem(AUTH_TOKEN_KEY, token);
          } else {
            window.localStorage.removeItem(AUTH_TOKEN_KEY);
          }
        }
        set({
          token,
          isAuthenticated: Boolean(token),
        });
      },
      setUser: (user) => set({ user }),
      clearError: () => set({ error: null }),
      loginUser: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await login({ username, password });
          set({
            token: response.sessionId,
            user: response.user,
            isAuthenticated: true,
          });
          if (typeof window !== "undefined") {
            window.localStorage.setItem(AUTH_TOKEN_KEY, response.sessionId);
          }
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Login failed",
            isAuthenticated: false,
          });
        } finally {
          set({ isLoading: false });
        }
      },
      fetchMe: async () => {
        const token =
          get().token ||
          (typeof window !== "undefined"
            ? window.localStorage.getItem(AUTH_TOKEN_KEY)
            : null);
        if (!token) {
          set({ user: null, isAuthenticated: false });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const response = await getCurrentUser();
          set({
            user: response.user,
            isAuthenticated: true,
            token,
          });
        } catch (err) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: err instanceof Error ? err.message : "Failed to fetch user",
          });
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(AUTH_TOKEN_KEY);
          }
        } finally {
          set({ isLoading: false });
        }
      },
      logout: () => {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(AUTH_TOKEN_KEY);
        }
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },
    }),
    {
      name: "ussd-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
