"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type PersistedSimulatorMessage = {
  content: string;
  type: "user" | "system";
  timestampMs: number;
  isOverLimit?: boolean;
  originalLength?: number;
  serviceType?: string;
};

export type ReplayTrailStep = {
  input: string;
  expectedResponse: string;
  responseServiceType: string;
  timestampMs: number;
};

export type PersistedSimulatorSession = {
  phoneNumber: string;
  shortCode: string;
  sequenceNumber: number | null;
  messages: PersistedSimulatorMessage[];
  replayTrail: ReplayTrailStep[];
  lastUpdatedAtMs: number;
};

type SimulatorStoreState = {
  lastSession: PersistedSimulatorSession | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  saveSession: (session: PersistedSimulatorSession) => void;
  clearSession: () => void;
};

export const useSimulatorStore = create<SimulatorStoreState>()(
  persist(
    (set) => ({
      lastSession: null,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      saveSession: (session) => set({ lastSession: session }),
      clearSession: () => set({ lastSession: null }),
    }),
    {
      name: "ussd-simulator-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        lastSession: state.lastSession,
      }),
      onRehydrateStorage: (state) => {
        return () => state?.setHasHydrated(true);
      },
    }
  )
);
