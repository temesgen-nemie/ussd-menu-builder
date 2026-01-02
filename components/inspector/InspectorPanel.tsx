"use client";

import React, { useEffect, type CSSProperties } from "react";
import { useFlowStore } from "../../store/flowStore";
import ActionInspector from "./ActionInspector";
import PromptInspector from "./PromptInspector";
import StartInspector from "./StartInspector";

export default function InspectorPanel() {
  const {
    nodes,
    selectedNodeId,
    updateNodeData,
    closeInspector,
    inspectorPosition,
  } = useFlowStore();

  const node = nodes.find((n) => n.id === selectedNodeId);

  // handle Escape locally as well for quick close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeInspector();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeInspector]);

  const [actionResetKey, setActionResetKey] = React.useState(0);

  if (!node) {
    return (
      <div className="pointer-events-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-80 rounded-lg bg-white p-4 shadow-2xl text-center">
          <div className="text-gray-600">No node selected</div>
          <div className="text-sm text-gray-400">
            Double-click a node to open the inspector
          </div>
        </div>
      </div>
    );
  }

  const style: CSSProperties = inspectorPosition
    ? {
        position: "fixed",
        left: inspectorPosition.x,
        top: inspectorPosition.y,
        transform:
          inspectorPosition.placement === "above"
            ? "translate(-50%, -100%)"
            : inspectorPosition.placement === "below"
            ? "translate(-50%, 0)"
            : "translate(-50%, -50%)",
        zIndex: 100000,
      }
    : {
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 100000,
      };
      
  const handleReset = () => {
    if (node.type === "prompt") {
        updateNodeData(node.id, {
            name: "",
            message: "",
            options: [],
            routingMode: "menu",
            nextNode: { routes: [], default: "" } // specific structure for prompt
        });
    } else if (node.type === "action") {
         updateNodeData(node.id, {
            name: "",
            endpoint: "",
            method: "POST",
            apiBody: {},
            headers: {},
            responseMapping: {},
            persistResponseMapping: false,
            routes: [],
            nextNode: ""
        });
        setActionResetKey((value) => value + 1);
    } else if (node.type === "start") {
         updateNodeData(node.id, {
            flowName: "",
            entryNode: ""
        });
    }
  };

  return (
    <div className="pointer-events-none" onClick={(e) => e.stopPropagation()}>
      <div
        style={style}
        className={`pointer-events-auto rounded-xl bg-white p-4 shadow-2xl ring-1 ring-black/5 transition-all transform duration-150 ease-out max-h-[90vh] overflow-y-auto ${
          node.type === "action" || node.type === "prompt"
            ? "w-200"
            : "w-96"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-linear-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md">
              {/* simple icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v2H2V5z" />
                <path d="M2 9h16v6a2 2 0 01-2 2H4a2 2 0 01-2-2V9z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-800 capitalize">
                {node.type} Node
              </div>
              <div className="text-xs text-gray-500">
                Edit this nodes properties
              </div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              className="px-2 py-1 rounded-md text-sm text-gray-500 hover:bg-gray-100"
              onClick={handleReset}
            >
              Reset
            </button>
            <button
              className="px-2 py-1 rounded-md text-sm bg-white text-gray-600 hover:bg-gray-100"
              onClick={() => closeInspector()}
              aria-label="Close inspector"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {node.type === "prompt" && (
            <PromptInspector node={node} updateNodeData={updateNodeData} />
          )}

          {node.type === "action" && (
            <ActionInspector
              key={`action-${node.id}-${actionResetKey}`}
              node={node}
              updateNodeData={updateNodeData}
            />
          )}

          {node.type === "start" && (
            <StartInspector node={node} updateNodeData={updateNodeData} />
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            className="px-3 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={() => closeInspector()}
          >
            Done
          </button>
        </div>

        {/* arrow pointing to the node */}
        {/* arrow pointing to the node (below modal: small triangle) */}
        {inspectorPosition?.placement !== "below" && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: -8,
              transform: "translateX(-50%)",
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "9px solid transparent",
                borderRight: "9px solid transparent",
                borderTop: "9px solid #fff",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.08))",
              }}
            />
          </div>
        )}

        {/* arrow pointing up (when modal is below the node) */}
        {inspectorPosition?.placement === "below" && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: -8,
              transform: "translateX(-50%) rotate(180deg)",
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "9px solid transparent",
                borderRight: "9px solid transparent",
                borderTop: "9px solid #fff",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.08))",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
