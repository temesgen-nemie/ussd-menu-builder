"use client";

import React, { useEffect, type CSSProperties } from "react";
import { useFlowStore } from "../store/flowStore";

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

  // local editor state for JSON fields (validate before saving)
  const [apiBodyText, setApiBodyText] = React.useState<string>("{}");
  const [headersText, setHeadersText] = React.useState<string>("{}");
  const [responseMapText, setResponseMapText] = React.useState<string>("{}");
  const [apiBodyError, setApiBodyError] = React.useState<string | null>(null);
  const [headersError, setHeadersError] = React.useState<string | null>(null);
  const [responseMapError, setResponseMapError] = React.useState<string | null>(
    null
  );

  // Helper for generating unique IDs for options
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // initialize editor state when node changes
  useEffect(() => {
    if (!node) return;

    if (node.type === "action") {
      setApiBodyText(JSON.stringify(node.data.apiBody ?? {}, null, 2));
      setHeadersText(JSON.stringify(node.data.headers ?? {}, null, 2));
      setResponseMapText(
        JSON.stringify(node.data.responseMapping ?? {}, null, 2)
      );

      setApiBodyError(null);
      setHeadersError(null);
      setResponseMapError(null);
    }
  }, [node?.id]);

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

  return (
    <div className="pointer-events-none" onClick={(e) => e.stopPropagation()}>
      <div
        style={style}
        className={`pointer-events-auto rounded-xl bg-white p-4 shadow-2xl ring-1 ring-black/5 transition-all transform duration-150 ease-out max-h-[90vh] overflow-y-auto ${
          node.type === "action" ? "w-[800px]" : "w-96"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md">
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
              onClick={() => updateNodeData(node.id, {})}
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
            <div>
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-600">
                  Name
                </label>
                <input
                  className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900"
                  value={String(node.data.name ?? "")}
                  placeholder="e.g. Welcome Screen"
                  onChange={(e) =>
                    updateNodeData(node.id, { name: e.target.value })
                  }
                />
              </div>

              <div className="mb-4">
                <label className="text-xs font-medium text-gray-600">
                  Message
                </label>
                <textarea
                  className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900"
                  value={node.data.message || ""}
                  rows={4}
                  placeholder="Enter message text..."
                  onChange={(e) =>
                    updateNodeData(node.id, { message: e.target.value })
                  }
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-600">
                    Options
                  </label>
                  <button
                    onClick={() => {
                      const currentOptions = (node.data.options as any[]) || [];
                      updateNodeData(node.id, {
                        options: [
                          ...currentOptions,
                          {
                            id: generateId(),
                            label: `Option ${currentOptions.length + 1}`,
                            value: `${currentOptions.length + 1}`,
                            nextNode: "",
                          },
                        ],
                      });
                    }}
                    className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100"
                  >
                    + Add Option
                  </button>
                </div>
                
                <div className="space-y-3">
                  {((node.data.options as any[]) || []).map((opt, idx) => (
                    <div
                      key={opt.id || idx}
                      className="p-3 bg-gray-50 rounded-md border border-gray-200 relative group"
                    >
                      <button
                        onClick={() => {
                          const currentOptions = (node.data.options as any[]) || [];
                          updateNodeData(node.id, {
                            options: currentOptions.filter((_, i) => i !== idx),
                          });
                        }}
                        className="hidden group-hover:block absolute top-1 right-1 text-gray-400 hover:text-red-500"
                        title="Remove option"
                      >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                         <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                       </svg>
                      </button>

                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="text-[10px] text-gray-500 uppercase">Label</label>
                          <input
                            className="w-full text-sm border-b border-gray-300 bg-transparent py-1 focus:outline-none focus:border-indigo-500 placeholder-gray-400"
                            value={opt.label || ""}
                            onChange={(e) => {
                              const newOptions = [...((node.data.options as any[]) || [])];
                              newOptions[idx] = { ...newOptions[idx], label: e.target.value };
                              updateNodeData(node.id, { options: newOptions });
                            }}
                            placeholder="e.g. Check Balance"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 uppercase">Value</label>
                          <input
                            className="w-full text-sm border-b border-gray-300 bg-transparent py-1 focus:outline-none focus:border-indigo-500 placeholder-gray-400"
                            value={opt.value || ""}
                            onChange={(e) => {
                              const newOptions = [...((node.data.options as any[]) || [])];
                              newOptions[idx] = { ...newOptions[idx], value: e.target.value };
                              updateNodeData(node.id, { options: newOptions });
                            }}
                            placeholder="e.g. 1"
                          />
                        </div>
                      </div>

                      <div>
                         <label className="text-[10px] text-gray-500 uppercase">Next Node ID</label>
                         <input
                            className="w-full text-sm border-b border-gray-300 bg-gray-100 py-1 text-gray-500 focus:outline-none cursor-not-allowed"
                            value={opt.nextNode || ""}
                            readOnly
                            placeholder="Connect on canvas"
                            title="Connect this option on the canvas to set the next node"
                          />
                      </div>
                    </div>
                  ))}
                  
                  {(!node.data.options || (node.data.options as any[]).length === 0) && (
                    <div className="text-center py-4 text-xs text-gray-400 bg-gray-50 rounded border border-dashed border-gray-200">
                      No options defined. <br/> This node will just end or relies on global defaults?
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {node.type === "action" && (
            <div>
              <label className="text-xs font-medium text-gray-600">
                Endpoint URL
              </label>

              <div className="grid grid-cols-2 gap-6">
                {/* Left Column: Settings */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Name
                    </label>
                    <input
                      className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900"
                      value={String(node.data.name ?? "")}
                      placeholder="e.g. API Action"
                      onChange={(e) =>
                        updateNodeData(node.id, { name: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Endpoint URL
                    </label>
                    <input
                      className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900"
                      value={String(node.data.endpoint ?? "")}
                      placeholder="https://api.example.com"
                      onChange={(e) =>
                        updateNodeData(node.id, { endpoint: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Method
                    </label>
                    <select
                      className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm text-gray-900"
                      value={String(node.data.method ?? "POST")}
                      onChange={(e) =>
                        updateNodeData(node.id, { method: e.target.value })
                      }
                    >
                      <option>GET</option>
                      <option>POST</option>
                      <option>PUT</option>
                      <option>DELETE</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Output Variable
                    </label>
                    <input
                      className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900"
                      value={String(node.data.outputVar ?? "")}
                      placeholder="e.g. myVar"
                      onChange={(e) =>
                        updateNodeData(node.id, { outputVar: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Next Node ID
                    </label>
                    <div className="relative">
                      <input
                        className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-gray-50 shadow-sm text-gray-500 cursor-not-allowed"
                        value={String(node.data.nextNode ?? "")}
                        placeholder="Connect on canvas"
                        readOnly
                        title="Connect nodes on the canvas to set this value"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: JSON Payloads */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      API Body (JSON)
                    </label>
                    <textarea
                      className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm font-mono text-sm placeholder-gray-400 text-gray-900"
                      value={apiBodyText}
                      rows={6}
                      onChange={(e) => {
                        setApiBodyText(e.target.value);
                        try {
                          const parsed = JSON.parse(e.target.value || "{}");
                          setApiBodyError(null);
                          updateNodeData(node.id, { apiBody: parsed });
                        } catch (err: any) {
                          setApiBodyError(err.message || "Invalid JSON");
                        }
                      }}
                    />
                    {apiBodyError && (
                      <div className="text-xs text-red-500 mt-1">
                        {apiBodyError}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Headers (JSON)
                    </label>
                    <textarea
                      className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm font-mono text-sm placeholder-gray-400 text-gray-900"
                      value={headersText}
                      rows={5}
                      onChange={(e) => {
                        setHeadersText(e.target.value);
                        try {
                          const parsed = JSON.parse(e.target.value || "{}");
                          setHeadersError(null);
                          updateNodeData(node.id, { headers: parsed });
                        } catch (err: any) {
                          setHeadersError(err.message || "Invalid JSON");
                        }
                      }}
                    />
                    {headersError && (
                      <div className="text-xs text-red-500 mt-1">
                        {headersError}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Response Mapping (JSON)
                    </label>
                    <textarea
                      className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm font-mono text-sm placeholder-gray-400 text-gray-900"
                      value={responseMapText}
                      rows={5}
                      onChange={(e) => {
                        setResponseMapText(e.target.value);
                        try {
                          const parsed = JSON.parse(e.target.value || "{}");
                          setResponseMapError(null);
                          updateNodeData(node.id, { responseMapping: parsed });
                        } catch (err: any) {
                          setResponseMapError(err.message || "Invalid JSON");
                        }
                      }}
                    />
                    {responseMapError && (
                      <div className="text-xs text-red-500 mt-1">
                        {responseMapError}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-gray-600">
                      Persist Response Mapping
                    </label>
                    <input
                      type="checkbox"
                      checked={Boolean(node.data.persistResponseMapping)}
                      onChange={(e) =>
                        updateNodeData(node.id, {
                          persistResponseMapping: e.target.checked,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {node.type === "start" && (
            <div>
               <div className="mb-4">
                  <label className="text-xs font-medium text-gray-600">
                    Flow Name
                  </label>
                  <input
                    className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900"
                    value={String(node.data.flowName ?? "")}
                    placeholder="e.g. My USSD Flow"
                    onChange={(e) =>
                      updateNodeData(node.id, { flowName: e.target.value })
                    }
                  />
               </div>

               <div>
                   <label className="text-xs font-medium text-gray-600">
                     Entry Node ID
                   </label>
                   <input
                      className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-gray-100 shadow-sm text-gray-500 cursor-not-allowed"
                      value={String(node.data.entryNode ?? "")}
                      readOnly
                      placeholder="Connect on canvas"
                      title="Connect the Start Node to the first node of your flow"
                   />
                </div>
            </div>
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
