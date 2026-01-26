"use client";

import { v4 as uuidv4 } from "uuid";
import { useCallback, useState } from "react";
import { Bolt, MessageSquare, PlayCircle, BarChart3, FileUp, ShieldCheck } from "lucide-react";
import { useFlowStore } from "../store/flowStore";
import { ModeToggle } from "./nav-items/ModeToggle";
import ResizablePhoneEmulator from "./ResizablePhoneEmulator";
import LogsModal from "./logs/LogsModal";
import AuditModal from "./audit/AuditModal";
import QrScanDialog from "./nav-items/QrScanDialog";
import SettingsMenu from "./nav-items/SettingsMenu";

export default function Navbar() {
  const { addNode, rfInstance, nodes, currentSubflowId, importSubflow } = useFlowStore();
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

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
            className="flex items-center gap-2 rounded-md bg-linear-to-r from-purple-600 to-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:from-purple-700 hover:to-indigo-700 cursor-pointer shadow-md hover:shadow-lg transition-all"
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
            className="flex items-center gap-2 rounded-md bg-linear-to-r from-indigo-500/80 via-purple-500/80 to-violet-500/80 px-4 py-1.5 text-xs font-semibold text-white/90 shadow-sm shadow-indigo-200/30 backdrop-blur hover:from-indigo-500 hover:via-purple-500 hover:to-violet-500 transition-all cursor-pointer"
          >
            <span className="rounded-sm bg-white/20 p-1">
              <BarChart3 className="h-4 w-4 text-white" />
            </span>
            Logs
          </button>
          <button
            onClick={() => setAuditOpen(true)}
            className="flex items-center gap-2 rounded-md bg-linear-to-r from-emerald-500/80 via-teal-500/80 to-cyan-500/80 px-4 py-1.5 text-xs font-semibold text-white/90 shadow-sm shadow-emerald-200/30 backdrop-blur hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500 transition-all cursor-pointer"
          >
            <span className="rounded-sm bg-white/20 p-1">
              <ShieldCheck className="h-4 w-4 text-white" />
            </span>
            Audit Events
          </button>
        </div>

        <div className="flex items-center gap-2">
          <QrScanDialog />
          <ModeToggle />
          <SettingsMenu />
        </div>
      </div>

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
