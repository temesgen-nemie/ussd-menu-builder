"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type StoredResponse = {
  status: number | null;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  error: string | null;
};

type ActionRequestState = {
  curlTextByNodeId: Record<string, string>;
  responsesByNodeId: Record<string, StoredResponse>;
  setCurlText: (nodeId: string, value: string) => void;
  setResponse: (nodeId: string, response: StoredResponse) => void;
  updateResponse: (nodeId: string, patch: Partial<StoredResponse>) => void;
  clearResponse: (nodeId: string) => void;
};

const emptyResponse: StoredResponse = {
  status: null,
  statusText: "",
  headers: {},
  body: "",
  error: null,
};

export const useActionRequestStore = create<ActionRequestState>()(
  persist(
    (set, get) => ({
      curlTextByNodeId: {},
      responsesByNodeId: {},
      setCurlText: (nodeId, value) =>
        set((state) => ({
          curlTextByNodeId: {
            ...state.curlTextByNodeId,
            [nodeId]: value,
          },
        })),
      setResponse: (nodeId, response) =>
        set((state) => ({
          responsesByNodeId: {
            ...state.responsesByNodeId,
            [nodeId]: response,
          },
        })),
      updateResponse: (nodeId, patch) => {
        const current =
          get().responsesByNodeId[nodeId] ?? { ...emptyResponse };
        set((state) => ({
          responsesByNodeId: {
            ...state.responsesByNodeId,
            [nodeId]: { ...current, ...patch },
          },
        }));
      },
      clearResponse: (nodeId) =>
        set((state) => {
          if (!state.responsesByNodeId[nodeId]) return state;
          const next = { ...state.responsesByNodeId };
          delete next[nodeId];
          return { responsesByNodeId: next };
        }),
    }),
    {
      name: "ussd-action-requests",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        curlTextByNodeId: state.curlTextByNodeId,
        responsesByNodeId: state.responsesByNodeId,
      }),
    }
  )
);
