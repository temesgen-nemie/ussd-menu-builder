"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFlowStore } from "@/store/flowStore";
import {
  fetchFlowSettings,
  updateFlowSettings,
  type FlowSettingsResponse,
} from "@/lib/api";
import { toast } from "sonner";
import { useSettingsStore } from "@/store/settingsStore";

type SettingsMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const parseSettingsResponse = (data: FlowSettingsResponse | undefined) => {
  const payload = data;
  return {
    baseUrl: payload?.data?.baseUrl ?? "",
    shortcodes: {
      tele: payload?.data?.shortcodes?.tele ?? "",
      safari: payload?.data?.shortcodes?.safari ?? "",
    },
    whiteListedPhones: Array.isArray(payload?.data?.whiteListedPhones)
      ? payload.data.whiteListedPhones
      : [],
  };
};

const phoneRegex = /^(\+251[79]\d{8}|0[79]\d{8})$/;
const settingsSchema = z.object({
  baseUrl: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^https?:\/\/[^\s]+$/i.test(value),
      "Base URL must start with http:// or https://"
    ),
  shortcodes: z.object({
    tele: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^\*\d+#$/.test(value),
        "Shortcode must look like *123#"
      ),
    safari: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^\*\d+#$/.test(value),
        "Shortcode must look like *123#"
      ),
  }),
  whiteListedPhones: z.array(
    z
      .string()
      .trim()
      .refine(
        (value) => phoneRegex.test(value),
        "Phone must be in format +2519xxxxxxxx or 09xxxxxxxx"
      )
  ),
});

export default function SettingsMenu({ open, onOpenChange }: SettingsMenuProps) {
  const nodes = useFlowStore((state) => state.nodes);
  const publishedGroupIds = useFlowStore((state) => state.publishedGroupIds);
  const { setDefaultPhoneNumber, clearDefaultPhoneNumber, getDefaultPhoneNumber } =
    useSettingsStore();
  const [selectedFlow, setSelectedFlow] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [shortcodes, setShortcodes] = useState({ tele: "", safari: "" });
  const [whiteListedPhones, setWhiteListedPhones] = useState<string[]>([]);
  const [whiteListedPhoneInput, setWhiteListedPhoneInput] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    baseUrl?: string;
    tele?: string;
    safari?: string;
    whiteListedPhones?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flowOptions = useMemo(() => {
    const groups = nodes.filter(
      (node) =>
        node.type === "group" &&
        !node.parentNode &&
        publishedGroupIds.includes(node.id)
    );
    const seen = new Set<string>();
    return groups
      .map((group) => {
        const children = nodes.filter((n) => n.parentNode === group.id);
        const startNode = children.find((n) => n.type === "start");
        const flowName = (startNode?.data as { flowName?: string } | undefined)?.flowName;
        if (!flowName || seen.has(flowName)) return null;
        seen.add(flowName);
        return { id: group.id, name: flowName };
      })
      .filter(Boolean) as { id: string; name: string }[];
  }, [nodes, publishedGroupIds]);

  useEffect(() => {
    if (!open) return;
    if (!selectedFlow && flowOptions.length > 0) {
      setSelectedFlow(flowOptions[0].name);
    }
  }, [flowOptions, open, selectedFlow]);

  useEffect(() => {
    if (!open || !selectedFlow) return;
    let isActive = true;
    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchFlowSettings(selectedFlow);
        if (!isActive) return;
        const parsed = parseSettingsResponse(data);
        setBaseUrl(String(parsed.baseUrl ?? ""));
        setShortcodes({
          tele: String(parsed.shortcodes.tele ?? ""),
          safari: String(parsed.shortcodes.safari ?? ""),
        });
        setWhiteListedPhones(
          parsed.whiteListedPhones
            .map((phone) => String(phone ?? "").trim())
            .filter(Boolean)
        );
        // Ensure default exists in the whitelist; if not, clear it.
        const currentDefault = getDefaultPhoneNumber(selectedFlow);
        if (currentDefault && !parsed.whiteListedPhones.includes(currentDefault)) {
          clearDefaultPhoneNumber(selectedFlow);
          // Keep global in sync if it pointed to the same value.
          if (getDefaultPhoneNumber("global") === currentDefault) {
            clearDefaultPhoneNumber("global");
          }
        }
        setWhiteListedPhoneInput("");
        setFieldErrors({});
      } catch (err) {
        if (!isActive) return;
        setBaseUrl("");
        setShortcodes({ tele: "", safari: "" });
        setWhiteListedPhones([]);
        setWhiteListedPhoneInput("");
        setFieldErrors({});
        setError(err instanceof Error ? err.message : "Unable to load settings.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadSettings();
    return () => {
      isActive = false;
    };
  }, [open, selectedFlow, clearDefaultPhoneNumber, getDefaultPhoneNumber]);

  const handleSave = async () => {
    if (!selectedFlow) {
      setError("Please select a flow.");
      return;
    }
    setError(null);
    const result = settingsSchema.safeParse({
      baseUrl,
      shortcodes,
      whiteListedPhones,
    });
    if (!result.success) {
      const nextErrors: {
        baseUrl?: string;
        tele?: string;
        safari?: string;
        whiteListedPhones?: string;
      } = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        if (path === "baseUrl") nextErrors.baseUrl = issue.message;
        if (path === "shortcodes.tele") nextErrors.tele = issue.message;
        if (path === "shortcodes.safari") nextErrors.safari = issue.message;
        if (path.startsWith("whiteListedPhones")) {
          nextErrors.whiteListedPhones = issue.message;
        }
      });
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});
    setIsSaving(true);
    setError(null);
    try {
      if (
        !result.data.baseUrl &&
        !result.data.shortcodes.tele &&
        !result.data.shortcodes.safari &&
        result.data.whiteListedPhones.length === 0
      ) {
        setError("Provide at least one value before saving.");
        return;
      }
      const payload = {
        flowName: selectedFlow,
        settings: {
          baseUrl: result.data.baseUrl,
        },
        shortcodes: {
          tele: result.data.shortcodes.tele,
          safari: result.data.shortcodes.safari,
        },
        whiteListedPhones: result.data.whiteListedPhones,
      };
      await updateFlowSettings(payload);
      toast.success("Settings updated.");
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to update settings.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const addWhiteListedPhone = () => {
    const normalized = whiteListedPhoneInput.replace(/\s+/g, "").trim();
    if (!normalized) return;
    if (!phoneRegex.test(normalized)) {
      setFieldErrors((prev) => ({
        ...prev,
        whiteListedPhones: "Phone must be in format +2519xxxxxxxx or 09xxxxxxxx",
      }));
      return;
    }
    setWhiteListedPhones((prev) => [...prev, normalized]);
    if (!getDefaultPhoneNumber(selectedFlow)) {
      setDefaultPhoneNumber(selectedFlow, normalized);
      setDefaultPhoneNumber("global", normalized);
    }
    setWhiteListedPhoneInput("");
    setFieldErrors((prev) => ({
      ...prev,
      whiteListedPhones: undefined,
    }));
  };

  const removeWhiteListedPhone = (index: number) => {
    setWhiteListedPhones((prev) => {
      const removed = prev[index];
      const next = prev.filter((_, idx) => idx !== index);
      const currentDefault = getDefaultPhoneNumber(selectedFlow);
      if (currentDefault === removed) {
        if (next[0]) setDefaultPhoneNumber(selectedFlow, next[0]);
        else clearDefaultPhoneNumber(selectedFlow);
        if (getDefaultPhoneNumber("global") === removed) {
          if (next[0]) setDefaultPhoneNumber("global", next[0]);
          else clearDefaultPhoneNumber("global");
        }
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Flow Settings</DialogTitle>
          <DialogDescription>
            Configure settings for a specific flow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Flow</label>
            <Select
              value={selectedFlow}
              onValueChange={(value) => {
                setSelectedFlow(value);
                setError(null);
              }}
            >
              <SelectTrigger className="cursor-pointer w-1/2">
                <SelectValue placeholder="Select a flow" />
              </SelectTrigger>
              <SelectContent>
                {flowOptions.map((flow) => (
                  <SelectItem key={flow.id} value={flow.name}>
                    {flow.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                BaseUrl
              </label>
              <Input
                value={baseUrl}
                onChange={(event) => {
                  setBaseUrl(event.target.value);
                  if (fieldErrors.baseUrl) {
                    setFieldErrors((prev) => ({ ...prev, baseUrl: undefined }));
                  }
                }}
                placeholder="e.g. https://api.example.com"
              />
              {fieldErrors.baseUrl && (
                <div className="text-[11px] text-destructive">
                  {fieldErrors.baseUrl}
                </div>
              )}
              {!fieldErrors.baseUrl && !baseUrl && (
                <div className="flex items-center gap-2 text-[11px] text-amber-600">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>Base URL is missing.</span>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Shortcode (tele)
              </label>
              <Input
                value={shortcodes.tele}
                onChange={(event) => {
                  setShortcodes((prev) => ({
                    ...prev,
                    tele: event.target.value,
                  }));
                  if (fieldErrors.tele) {
                    setFieldErrors((prev) => ({ ...prev, tele: undefined }));
                  }
                }}
              />
              {fieldErrors.tele && (
                <div className="text-[11px] text-destructive">
                  {fieldErrors.tele}
                </div>
              )}
              {!fieldErrors.tele && !shortcodes.tele && (
                <div className="flex items-center gap-2 text-[11px] text-amber-600">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>Short code for EthioTelecom is missing, so EthioTelecom USSD won&apos;t be available.</span>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Shortcode (safari)
              </label>
              <Input
                value={shortcodes.safari}
                onChange={(event) => {
                  setShortcodes((prev) => ({
                    ...prev,
                    safari: event.target.value,
                  }));
                  if (fieldErrors.safari) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      safari: undefined,
                    }));
                  }
                }}
                placeholder=""
              />
              {fieldErrors.safari && (
                <div className="text-[11px] text-destructive">
                  {fieldErrors.safari}
                </div>
              )}
              {!fieldErrors.safari && !shortcodes.safari && (
                <div className="flex items-center gap-2 text-[11px] text-amber-600">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>Short code for Safaricom is missing, so Safaricom USSD won&apos;t be available.</span>
                </div>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Whitelisted Phones
              </label>
              <div className="flex gap-2">
                <Input
                  value={whiteListedPhoneInput}
                  onChange={(event) => {
                    setWhiteListedPhoneInput(event.target.value);
                    if (fieldErrors.whiteListedPhones) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        whiteListedPhones: undefined,
                      }));
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addWhiteListedPhone();
                    }
                  }}
                  placeholder="e.g. +2519xxxxxxxx or 09xxxxxxxx"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={addWhiteListedPhone}
                >
                  Add
                </Button>
              </div>
              {whiteListedPhones.length > 0 ? (
                <div className="flex flex-wrap gap-2 rounded-md border border-border bg-muted/20 p-2">
                  {whiteListedPhones.map((phone, index) => (
                    <div
                      key={`${phone}-${index}`}
                      className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                    >
                      <span>{phone}</span>
                      <button
                        type="button"
                        className={`cursor-pointer rounded-full border px-2 text-[10px] leading-none ${
                          getDefaultPhoneNumber(selectedFlow) === phone
                            ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                            : "border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
                        }`}
                        onClick={() => {
                          const currentDefault = getDefaultPhoneNumber(selectedFlow);
                          if (currentDefault === phone) {
                            clearDefaultPhoneNumber(selectedFlow);
                            if (getDefaultPhoneNumber("global") === phone) {
                              clearDefaultPhoneNumber("global");
                            }
                          } else {
                            setDefaultPhoneNumber(selectedFlow, phone);
                            setDefaultPhoneNumber("global", phone);
                          }
                        }}
                        aria-label={`Set ${phone} as default`}
                      >
                        {getDefaultPhoneNumber(selectedFlow) === phone
                          ? "Default"
                          : "Set default"}
                      </button>
                      <button
                        type="button"
                        className="cursor-pointer rounded-full bg-indigo-100 px-1 text-[10px] leading-none text-indigo-700 hover:bg-indigo-200"
                        onClick={() => removeWhiteListedPhone(index)}
                        aria-label={`Remove ${phone}`}
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground">
                  No whitelisted phones added.
                </div>
              )}
              {fieldErrors.whiteListedPhones && (
                <div className="text-[11px] text-destructive">
                  {fieldErrors.whiteListedPhones}
                </div>
              )}
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
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="cursor-pointer"
          >
            {isSaving ? "Saving..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
