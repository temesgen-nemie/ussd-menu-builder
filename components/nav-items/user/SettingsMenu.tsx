"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettingsStore } from "@/store/settingsStore";
import { fetchSettings, saveSettings, SettingsPayload } from "@/lib/api";

type SettingsMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function SettingsMenu({ open, onOpenChange }: SettingsMenuProps) {
  const {
    endpoints: cachedEndpoints,
    lastFetched,
    setEndpoints,
    setLastFetched,
  } = useSettingsStore();
  const [endpoints, setLocalEndpoints] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStale = useMemo(() => {
    if (!lastFetched) return true;
    return Date.now() - lastFetched > 5 * 60 * 1000;
  }, [lastFetched]);

  useEffect(() => {
    if (!open) return;
    let isActive = true;
    setIsLoading(true);
    setError(null);

    const initialEndpoints =
      cachedEndpoints.length > 0 ? cachedEndpoints : [""];
    setLocalEndpoints(initialEndpoints);

    if (!isStale) {
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }

    const loadSettings = async () => {
      try {
        const data = await fetchSettings();
        const settings =
          (data.settings as Record<string, unknown> | undefined) ?? data;

        if (!isActive) return;
        const rawEndpoints = Array.isArray(settings.endpoints)
          ? settings.endpoints
          : settings.baseUrl
          ? [settings.baseUrl]
          : [];
        const normalizedEndpoints = (rawEndpoints as unknown[])
          .map((value: unknown) => String(value))
          .filter((value) => value.trim() !== "");
        const fallbackEndpoints =
          normalizedEndpoints.length > 0 ? normalizedEndpoints : [""];

        setEndpoints(normalizedEndpoints);
        setLastFetched(Date.now());
        setLocalEndpoints(fallbackEndpoints);
      } catch (err) {
        if (!isActive) return;
        setError(
          err instanceof Error ? err.message : "Unable to load settings."
        );
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadSettings();
    return () => {
      isActive = false;
    };
  }, [cachedEndpoints, isStale, open, setEndpoints, setLastFetched]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setError(null);
    const cleanedEndpoints = endpoints
      .map((value) => value.trim())
      .filter((value) => value !== "");

    const settingsPayload: SettingsPayload = {
      endpoints: cleanedEndpoints,
    };

    try {
      await saveSettings(settingsPayload);
      setEndpoints(cleanedEndpoints);
      setLastFetched(Date.now());
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save settings."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Parameter Context</DialogTitle>
            <DialogDescription>
              Configure shared values used across API requests.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                API endpoints
              </label>
              <div className="space-y-2">
                {endpoints.map((endpoint, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={endpoint}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        setLocalEndpoints((prev) => {
                          const next = [...prev];
                          next[index] = event.target.value;
                          return next;
                        })
                      }
                      placeholder="https://api.example.com"
                    />
                    {endpoints.length > 1 && (
                      <button
                        type="button"
                        className="text-xs text-red-500 hover:text-red-600"
                        onClick={() =>
                          setLocalEndpoints((prev) => {
                            const next = prev.filter((_, idx) => idx !== index);
                            return next.length > 0 ? next : [""];
                          })
                        }
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="text-xs text-indigo-600 hover:text-indigo-700"
                  onClick={() =>
                    setLocalEndpoints((prev) => [...prev, ""])
                  }
                >
                  + Add endpoint
                </button>
              </div>
            </div>

            {isLoading && (
              <div className="text-xs text-muted-foreground">
                Loading settings...
              </div>
            )}
            {error && <div className="text-xs text-destructive">{error}</div>}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
