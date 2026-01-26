"use client";

import { v4 as uuidv4 } from "uuid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bolt, Menu, MessageSquare, PlayCircle, BarChart3, FileUp, ShieldCheck, QrCode } from "lucide-react";
import { useFlowStore } from "../store/flowStore";
import { useSettingsStore } from "../store/settingsStore";
import { ModeToggle } from "./ModeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ResizablePhoneEmulator from "./ResizablePhoneEmulator";
import LogsModal from "./logs/LogsModal";
import AuditModal from "./audit/AuditModal";
import { fetchSettings, saveSettings, SettingsPayload } from "../lib/api";

export default function NodePalette() {
  const { addNode, rfInstance, nodes, currentSubflowId, importSubflow } = useFlowStore();
  const {
    endpoints: cachedEndpoints,
    lastFetched,
    setEndpoints,
    setLastFetched,
  } = useSettingsStore();
  const [paramOpen, setParamOpen] = useState(false);
  const [paramLoading, setParamLoading] = useState(false);
  const [paramSaving, setParamSaving] = useState(false);
  const [paramError, setParamError] = useState<string | null>(null);
  const [endpoints, setLocalEndpoints] = useState<string[]>([]);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrBaseUrl, setQrBaseUrl] = useState("");
  const [qrUrl, setQrUrl] = useState("");

  const isStale = useMemo(() => {
    if (!lastFetched) return true;
    return Date.now() - lastFetched > 5 * 60 * 1000;
  }, [lastFetched]);

  const hasStart = nodes.some(
    (n) =>
      n.type === "start" &&
      (n.parentNode || null) === (currentSubflowId || null)
  );

  // Return a position centered in the current viewport
  const getCenteredPosition = useCallback(() => {
    if (rfInstance) {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      const position = rfInstance.project({
        x: centerX,
        y: centerY,
      });

      return {
        x: position.x + (Math.random() * 40 - 20),
        y: position.y + (Math.random() * 40 - 20),
      };
    }

    const x = Math.floor(Math.random() * 800) - 400;
    const y = Math.floor(Math.random() * 600) - 300;
    return { x, y };
  }, [rfInstance]);

  const handleAddNode = useCallback(
    (type: "prompt" | "action" | "start") => {
      if (type === "start" && hasStart) return;
      const data =
        type === "prompt"
          ? { message: "", routingMode: "linear" }
          : type === "action"
          ? { endpoint: "" }
          : { flowName: "", entryNode: "" };

      addNode({
        id: uuidv4(),
        type,
        position: getCenteredPosition(),
        data,
        parentNode: currentSubflowId ?? undefined,
      });
    },
    [addNode, currentSubflowId, getCenteredPosition, hasStart]
  );

  const handleDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    nodeType: "prompt" | "action" | "start"
  ) => {
    if (nodeType === "start" && hasStart) return;
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  useEffect(() => {
    if (!paramOpen) return;
    let isActive = true;
    setParamLoading(true);
    setParamError(null);

    const initialEndpoints =
      cachedEndpoints.length > 0 ? cachedEndpoints : [""];
    setLocalEndpoints(initialEndpoints);

    if (!isStale) {
      setParamLoading(false);
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
        setParamError(
          err instanceof Error ? err.message : "Unable to load settings."
        );
      } finally {
        if (isActive) setParamLoading(false);
      }
    };

    loadSettings();
    return () => {
      isActive = false;
    };
  }, [cachedEndpoints, isStale, paramOpen, setEndpoints, setLastFetched]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (qrBaseUrl) return;
    const defaults = ["http://172.21.220.1:3000", "http://localhost:3000"];
    const match = defaults.find((url) => url === window.location.origin);
    setQrBaseUrl(match ?? defaults[0]);
  }, [qrBaseUrl]);

  useEffect(() => {
    if (!qrOpen) return;
    if (!qrBaseUrl) return;
    const cleanedBase = qrBaseUrl.replace(/\/$/, "");
    setQrUrl(`${cleanedBase}/phone`);
  }, [qrBaseUrl, qrOpen]);

  const handleSaveSettings = useCallback(async () => {
    setParamSaving(true);
    setParamError(null);
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
      setParamOpen(false);
    } catch (err) {
      setParamError(
        err instanceof Error ? err.message : "Unable to save settings."
      );
    } finally {
      setParamSaving(false);
    }
  }, [endpoints, setEndpoints, setLastFetched]);

  return (
    <nav className="sticky top-0 z-50 w-full bg-card/95 text-card-foreground border-b border-border shadow-sm backdrop-blur">
      <div className="flex items-center justify-between px-6 py-2">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Nodes
          </span>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
              draggable
              onDragStart={(e) => handleDragStart(e, "prompt")}
              onClick={() => handleAddNode("prompt")}
            >
              <span className="rounded-sm bg-indigo-700 p-1">
                <MessageSquare className="h-4 w-4 text-white" />
              </span>
              Prompt
            </button>
            <button
              className="flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
              draggable
              onDragStart={(e) => handleDragStart(e, "action")}
              onClick={() => handleAddNode("action")}
            >
              <span className="rounded-sm bg-emerald-700 p-1">
                <Bolt className="h-4 w-4 text-white" />
              </span>
              Action
            </button>
            <button
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                hasStart
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              draggable={!hasStart}
              onDragStart={(e) => handleDragStart(e, "start")}
              onClick={() => handleAddNode("start")}
              disabled={hasStart}
            >
              <span
                className={`rounded-sm p-1 ${
                  hasStart ? "bg-muted-foreground/30" : "bg-blue-700"
                }`}
              >
                <PlayCircle className="h-4 w-4 text-white" />
              </span>
              Start
            </button>
            <div className="h-6 w-px bg-border mx-1" />
            <div className="relative group">
              <input
                type="file"
                accept=".json"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const text = event.target?.result;
                    if (typeof text === "string") {
                      importSubflow(text, getCenteredPosition());
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = ""; // Reset
                }}
              />
              <button className="flex items-center gap-2 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-all shadow-sm group-hover:shadow group-active:scale-95">
                <span className="rounded-sm bg-amber-700 p-1">
                  <FileUp className="h-4 w-4 text-white" />
                </span>
                Import
              </button>
            </div>
          </div>
        </div>

        {/* Center - USSD Simulator Button */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
          <button
            onClick={() => setSimulatorOpen(true)}
            className="flex items-center gap-2 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:from-purple-700 hover:to-indigo-700 cursor-pointer shadow-md hover:shadow-lg transition-all"
          >
            <span className="rounded-sm bg-purple-700 p-1">
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </span>
            USSD Simulator
          </button>
          <button
            onClick={() => setLogsOpen(true)}
            className="flex items-center gap-2 rounded-md bg-gradient-to-r from-indigo-500/80 via-purple-500/80 to-violet-500/80 px-4 py-1.5 text-xs font-semibold text-white/90 shadow-sm shadow-indigo-200/30 backdrop-blur hover:from-indigo-500 hover:via-purple-500 hover:to-violet-500 transition-all cursor-pointer"
          >
            <span className="rounded-sm bg-white/20 p-1">
              <BarChart3 className="h-4 w-4 text-white" />
            </span>
            Logs
          </button>
          <button
            onClick={() => setAuditOpen(true)}
            className="flex items-center gap-2 rounded-md bg-gradient-to-r from-emerald-500/80 via-teal-500/80 to-cyan-500/80 px-4 py-1.5 text-xs font-semibold text-white/90 shadow-sm shadow-emerald-200/30 backdrop-blur hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500 transition-all cursor-pointer"
          >
            <span className="rounded-sm bg-white/20 p-1">
              <ShieldCheck className="h-4 w-4 text-white" />
            </span>
            Audit Events
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setQrOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm hover:bg-muted"
            aria-label="Open QR scan"
          >
            <QrCode className="h-4 w-4" />
          </button>
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm hover:bg-muted"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => setParamOpen(true)}>
                Parameter Context
              </DropdownMenuItem>
              <DropdownMenuItem>Controller Settings</DropdownMenuItem>
              <DropdownMenuItem>Other</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={paramOpen} onOpenChange={setParamOpen}>
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
                      onChange={(event) => {
                        const next = [...endpoints];
                        next[index] = event.target.value;
                        setLocalEndpoints(next);
                      }}
                      placeholder="https://api.example.com"
                    />
                    {endpoints.length > 1 && (
                      <button
                        type="button"
                        className="text-xs text-red-500 hover:text-red-600"
                        onClick={() => {
                          const next = endpoints.filter(
                            (_, idx) => idx !== index
                          );
                          setLocalEndpoints(next.length > 0 ? next : [""]);
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="text-xs text-indigo-600 hover:text-indigo-700"
                  onClick={() => setLocalEndpoints([...endpoints, ""])}
                >
                  + Add endpoint
                </button>
              </div>
            </div>

            {paramLoading && (
              <div className="text-xs text-muted-foreground">
                Loading settings...
              </div>
            )}
            {paramError && (
              <div className="text-xs text-destructive">{paramError}</div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              onClick={handleSaveSettings}
              disabled={paramSaving}
            >
              {paramSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan to open USSD</DialogTitle>
            <DialogDescription>
              Scan this QR code with your phone to open the USSD session page.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            <div className="flex w-full items-center justify-center gap-2">
              {["http://172.21.220.1:3000", "http://localhost:3000"].map(
                (url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setQrBaseUrl(url)}
                    className={`rounded-full px-3 py-1 text-[10px] font-semibold transition-colors ${
                      qrBaseUrl === url
                        ? "bg-indigo-600 text-white"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {url.includes("localhost") ? "Localhost" : "LAN IP"}
                  </button>
                )
              )}
            </div>
            <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
              {qrUrl ? (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    qrUrl
                  )}`}
                  alt="USSD QR Code"
                  className="h-[220px] w-[220px]"
                />
              ) : (
                <div className="flex h-[220px] w-[220px] items-center justify-center text-xs text-muted-foreground">
                  Generating QR...
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              This opens a mobile web page that mimics the native USSD overlay.
            </p>
            {qrUrl && (
              <p className="break-all text-[10px] text-muted-foreground text-center">
                {qrUrl}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* USSD Simulator */}
      <ResizablePhoneEmulator
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
      />
      <LogsModal open={logsOpen} onOpenChange={setLogsOpen} />
      <AuditModal open={auditOpen} onOpenChange={setAuditOpen} />
    </nav>
  );
}
