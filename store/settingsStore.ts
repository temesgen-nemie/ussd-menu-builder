import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type SettingsState = {
  endpoints: string[];
  lastFetched: number | null;
  setEndpoints: (endpoints: string[]) => void;
  setLastFetched: (timestamp: number | null) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      endpoints: [],
      lastFetched: null,
      setEndpoints: (endpoints) => set({ endpoints }),
      setLastFetched: (timestamp) => set({ lastFetched: timestamp }),
    }),
    {
      name: "ussd-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        endpoints: state.endpoints,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
