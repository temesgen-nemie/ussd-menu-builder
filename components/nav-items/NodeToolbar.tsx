"use client";

import { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { Bolt, FileUp, MessageSquare, PlayCircle } from "lucide-react";
import { useFlowStore } from "@/store/flowStore";

export default function NodeToolbar() {
  const { addNode, rfInstance, nodes, currentSubflowId, importSubflow } =
    useFlowStore();

  const hasStart = nodes.some(
    (n) =>
      n.type === "start" &&
      (n.parentNode || null) === (currentSubflowId || null)
  );

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
              e.target.value = "";
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
  );
}
