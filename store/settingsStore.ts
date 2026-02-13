"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type SettingsState = {
  // Default simulator phone number per flowName (client-only).
  defaultPhoneNumberByFlow: Record<string, string>;
  setDefaultPhoneNumber: (flowName: string, phoneNumber: string) => void;
  clearDefaultPhoneNumber: (flowName: string) => void;
  getDefaultPhoneNumber: (flowName: string) => string;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      defaultPhoneNumberByFlow: {},
      setDefaultPhoneNumber: (flowName, phoneNumber) =>
        set((state) => ({
          defaultPhoneNumberByFlow: {
            ...state.defaultPhoneNumberByFlow,
            [flowName]: phoneNumber,
          },
        })),
      clearDefaultPhoneNumber: (flowName) =>
        set((state) => {
          if (!state.defaultPhoneNumberByFlow[flowName]) return state;
          const next = { ...state.defaultPhoneNumberByFlow };
          delete next[flowName];
          return { defaultPhoneNumberByFlow: next };
        }),
      getDefaultPhoneNumber: (flowName) =>
        get().defaultPhoneNumberByFlow[flowName] ?? "",
    }),
    {
      name: "ussd-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        defaultPhoneNumberByFlow: state.defaultPhoneNumberByFlow,
      }),
    }
  )
);

