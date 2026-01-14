"use client";

import { v4 as uuidv4 } from "uuid";
import { useCallback, useEffect, useState } from "react";
import { Bolt, Menu, MessageSquare, PlayCircle } from "lucide-react";
import { useFlowStore } from "../store/flowStore";
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
import { Input } from "@/components/ui/input";
import ResizablePhoneEmulator from "./ResizablePhoneEmulator";
import { fetchSettings, saveSettings, SettingsPayload } from "../lib/api";

export default function NodePalette() {
  const { addNode, rfInstance, nodes, currentSubflowId } = useFlowStore();
  const [paramOpen, setParamOpen] = useState(false);
  const [paramFetched, setParamFetched] = useState(false);
  const [paramLoading, setParamLoading] = useState(false);
  const [paramSaving, setParamSaving] = useState(false);
  const [paramError, setParamError] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [storageTime, setStorageTime] = useState("");
  const [simulatorOpen, setSimulatorOpen] = useState(false);

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
          ? { message: "" }
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
    if (!paramOpen || paramFetched) return;
    let isActive = true;
    setParamLoading(true);
    setParamError(null);

    const loadSettings = async () => {
      try {
        const data = await fetchSettings();
        const settings =
          (data.settings as Record<string, unknown> | undefined) ?? data;

        if (!isActive) return;
        setBaseUrl(String(settings.baseUrl ?? ""));
        setShortCode(String(settings.shortCode ?? ""));
        const timeValue = settings.storageTime ?? settings.timeoutMs ?? "";
        setStorageTime(timeValue === "" ? "" : String(timeValue));
        setParamFetched(true);
      } catch (err) {
        if (!isActive) return;
        setParamError(err instanceof Error ? err.message : "Unable to load settings.");
      } finally {
        if (isActive) setParamLoading(false);
      }
    };

    loadSettings();
    return () => {
      isActive = false;
    };
  }, [paramOpen, paramFetched]);

  const handleSaveSettings = useCallback(async () => {
    setParamSaving(true);
    setParamError(null);
    const storageTimeValue =
      storageTime.trim() === "" ? null : Number(storageTime);
    
    const settingsPayload: SettingsPayload = {
      baseUrl: baseUrl.trim(),
      shortCode: shortCode.trim(),
      ...(storageTimeValue !== null && !Number.isNaN(storageTimeValue) && { storageTime: storageTimeValue }),
    };

    try {
      await saveSettings(settingsPayload);
      setParamOpen(false);
    } catch (err) {
      setParamError(err instanceof Error ? err.message : "Unable to save settings.");
    } finally {
      setParamSaving(false);
    }
  }, [baseUrl, shortCode, storageTime]);

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
          </div>
        </div>

        {/* Center - USSD Simulator Button */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <button
            onClick={() => setSimulatorOpen(true)}
            className="flex items-center gap-2 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:from-purple-700 hover:to-indigo-700 cursor-pointer shadow-md hover:shadow-lg transition-all"
          >
            <span className="rounded-sm bg-purple-700 p-1">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </span>
            USSD Simulator
          </button>
        </div>

        <div className="flex items-center gap-2">
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
                API base url
              </label>
              <Input
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="https://api.example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Short Code
              </label>
              <Input
                value={shortCode}
                onChange={(event) => setShortCode(event.target.value)}
                placeholder="*123#"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Storage Time
              </label>
              <Input
                value={storageTime}
                onChange={(event) => setStorageTime(event.target.value)}
                placeholder="1500"
              />
            </div>

            {paramLoading && (
              <div className="text-xs text-muted-foreground">Loading settings...</div>
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

      {/* USSD Simulator */}
      <ResizablePhoneEmulator isOpen={simulatorOpen} onClose={() => setSimulatorOpen(false)} />
    </nav>
  );
}
