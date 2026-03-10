"use client";

import { useEffect } from "react";
import { fetchFlowSettings } from "@/lib/api";
import { useSettingsStore } from "@/store/settingsStore";

export default function DefaultFlowBootstrap() {
  const defaultFlowName = useSettingsStore((s) => s.defaultFlowName);
  const setDefaultFlowShortcodes = useSettingsStore(
    (s) => s.setDefaultFlowShortcodes
  );

  useEffect(() => {
    if (!defaultFlowName) return;
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("ussd-auth-token")
        : null;
    if (!token) return;

    let isActive = true;
    const load = async () => {
      try {
        const data = await fetchFlowSettings(defaultFlowName);
        if (!isActive) return;
        const tele = String(data?.data?.shortcodes?.tele ?? "");
        const safari = String(data?.data?.shortcodes?.safari ?? "");
        setDefaultFlowShortcodes({ tele, safari });
      } catch {
        // Silent: settings may require auth or be unavailable during bootstrap.
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, [defaultFlowName, setDefaultFlowShortcodes]);

  return null;
}
