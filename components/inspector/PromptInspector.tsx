import { useState, useRef, useEffect } from "react";
import NodeNameInput from "./NodeNameInput";
import TargetNodeDisplay from "./TargetNodeDisplay";
import { useFlowStore } from "../../store/flowStore";

type PromptInspectorProps = {
  node: PromptNode;
  updateNodeData: (id: string, data: Partial<Record<string, unknown>>) => void;
};

type PromptRoute = {
  when?: { eq?: string[] };
  gotoFlow?: string;
  isGoBack?: boolean;
  isMainMenu?: boolean;
  goBackTarget?: string;
};

type PromptNextNode = {
  routes?: PromptRoute[];
  default?: string;
};

type PromptNodeData = {
  name?: string;
  message?: string;
  routingMode?: string;
  nextNode?: PromptNextNode | string;
  persistByIndex?: boolean;
  persistSourceField?: string;
  persistFieldName?: string;
  validateIndexedList?: boolean;
  indexedListVar?: string;
  invalidInputMessage?: string;
  emptyInputMessage?: string;
  persistInput?: boolean;
  persistInputAs?: string;
  responseType?: "CONTINUE" | "END";
  encryptInput?: boolean;
  hasMultiplePage?: boolean;
  indexPerPage?: number;
  pagination?: {
    enabled: boolean;
    actionNode: string;
    pageField: string;
    totalPagesField: string;
    nextInput: string;
    prevInput: string;
    nextLabel: string;
    prevLabel: string;
    controlsVar: string;
  };
  isMainMenu?: boolean;
};

type PromptNode = {
  id: string;
  parentNode?: string;
  data: PromptNodeData;
};

export default function PromptInspector({
  node,
  updateNodeData,
}: PromptInspectorProps) {
  const nodes = useFlowStore((s) => s.nodes);
  const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);

  // Find siblings: nodes in the same parent group or at root
  const siblings = nodes.filter(
    (n) =>
      n.parentNode === node.parentNode &&
      n.id !== node.id &&
      n.type !== "group" &&
      n.type !== "start"
  );
  const siblingNames = siblings
    .map((n) => (n.data as any).name || "")
    .filter(Boolean);

  const syncMessage = (
    currentMessage: string,
    routes: PromptRoute[]
  ): string => {
    // ... existing sync logic ...
    const lines = currentMessage.split("\n");
    const introLines: string[] = [];

    const routeInputs = new Set(
      routes.map((r) => r.when?.eq?.[1]).filter((v): v is string => !!v)
    );
    const routeTargets = new Set(
      routes.map((r) => r.gotoFlow).filter((v): v is string => !!v)
    );

    for (const line of lines) {
      const trimmed = line.trim();
      const firstWord = trimmed.split(/[\s\.]/, 1)[0];
      
      // Check if line starts with an input index (e.g. "1.", "1 ", or just matches an input exactly)
      const isInputPrefix = /^[\d*#]+([\.\s]|$)/.test(trimmed);
      const isInputMatch = routeInputs.has(firstWord) || routeInputs.has(trimmed);
      
      // If it looks like a routing line, stop adding to the intro
      if (isInputPrefix || isInputMatch) {
        break;
      }
      
      const isSeparatorOnly = /^[.\-\s]+$/.test(trimmed);
      if (isSeparatorOnly && introLines.length > 0) {
        break;
      }

      introLines.push(line);
    }

    const intro = introLines.join("\n").trim();

    const routingLines = routes
      .map((r) => {
        const input = (r.when?.eq?.[1] || "").trim();
        const isGoBack = (r as any).isGoBack;
        const isMainMenu = (r as any).isMainMenu;
        let name = (r.gotoFlow || "").trim();

        if (isGoBack) name = "Go Back";
        else if (isMainMenu) name = "Main Menu";

        if (input && name) return `${input}. ${name}`;
        if (input) return `${input}.`;
        return name;
      })
      .filter((s) => !!s);

    return intro
      ? `${intro}\n\n${routingLines.join("\n")}`
      : routingLines.join("\n");
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left Column: Basic Info + Routing */}
      <div className="space-y-4">
        <NodeNameInput
          nodeId={node.id}
          name={String(node.data.name ?? "")}
          onNameChange={(val) => updateNodeData(node.id, { name: val })}
        />

        <div>
          <label className="text-xs font-medium text-gray-600">Message</label>
          <textarea
            className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900"
            value={node.data.message || ""}
            rows={8}
            placeholder="Enter message text..."
            onChange={(e) =>
              updateNodeData(node.id, { message: e.target.value })
            }
          />
        </div>

        {/* Menu Mode: Logic Routing Rules */}
        {node.data.routingMode === "menu" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">
                Routing Rules
              </label>
              <button
                onClick={() => {
                  // Initialize nextNode as object if it's not
                  let currentNextNode = node.data.nextNode;
                  if (typeof currentNextNode !== "object" || !currentNextNode) {
                    currentNextNode = { routes: [], default: "" };
                  }

                  const routes = currentNextNode.routes || [];
                  const newRoutes = [
                    ...routes,
                    { when: { eq: ["{{input}}", ""] }, gotoFlow: "" },
                  ];

                  // Auto-sync message
                  const newMessage = syncMessage(node.data.message || "", newRoutes);

                  updateNodeData(node.id, {
                    message: newMessage,
                    nextNode: {
                      ...currentNextNode,
                      routes: newRoutes,
                    },
                  });
                }}
                className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100"
              >
                + Add Rule
              </button>
            </div>

            <div className="space-y-3 pr-1 max-h-[500px] overflow-y-auto overflow-x-hidden">
              {(() => {
                // Helper to safely get routes
                const nextNode = node.data.nextNode;
                const routes =
                  nextNode && typeof nextNode === "object" && nextNode.routes
                    ? nextNode.routes
                    : [];

                return routes.map((route, idx) => {
                  const inputValue = route.when?.eq?.[1] || "";
                  const gotoFlow = route.gotoFlow || "";
                  const isGoBack = route.isGoBack || false;
                  const isRouteMainMenu = route.isMainMenu || false;
                  const goBackTarget = route.goBackTarget || "";
                  return (
                    <div
                      key={idx}
                      className="group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 overflow-visible"
                    >
                      {/* Rule Header/Delete */}
                      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                          onClick={() => {
                            const nextNode = node.data
                              .nextNode as PromptNextNode;
                            const newRoutes = (nextNode.routes || []).filter(
                              (_, i) => i !== idx
                            );
                            const newMessage = syncMessage(
                              node.data.message || "",
                              newRoutes
                            );
                            updateNodeData(node.id, {
                              message: newMessage,
                              nextNode: { ...nextNode, routes: newRoutes },
                            });
                          }}
                          className="bg-white text-gray-400 hover:text-red-500 p-1.5 rounded-full shadow-lg border border-gray-100 transition-colors"
                          title="Remove Rule"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>

                      <div className="p-4 space-y-4">
                        {/* Core Routing Pair */}
                        <div className="flex items-start gap-4">
                          <div className="w-1/4">
                            <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                              <svg
                                className="w-3 h-3 text-indigo-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                                />
                              </svg>
                              Input
                            </label>
                            <input
                              className="w-full text-sm border-b-2 border-gray-100 bg-transparent py-1.5 focus:outline-none focus:border-indigo-500 placeholder-gray-300 font-mono text-center text-gray-900 transition-colors"
                              value={inputValue}
                              onChange={(e) => {
                                const nextNode = node.data
                                  .nextNode as PromptNextNode;
                                const newRoutes = [...(nextNode.routes || [])];
                                newRoutes[idx] = {
                                  ...newRoutes[idx],
                                  when: { eq: ["{{input}}", e.target.value] },
                                };
                                const newMessage = syncMessage(
                                  node.data.message || "",
                                  newRoutes
                                );
                                updateNodeData(node.id, {
                                  message: newMessage,
                                  nextNode: { ...nextNode, routes: newRoutes },
                                });
                              }}
                              placeholder="1"
                            />
                          </div>

                          <div className="flex-1">
                            {!isGoBack && !isRouteMainMenu && (
                              <>
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                  <svg
                                    className="w-3 h-3 text-indigo-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                                    />
                                  </svg>
                                  Goto Flow/Node
                                </label>
                                <input
                                  className="w-full text-sm border-b-2 border-gray-100 bg-transparent py-1.5 focus:outline-none focus:border-indigo-500 placeholder-gray-300 text-gray-900 transition-colors"
                                  value={gotoFlow}
                                  onChange={(e) => {
                                    const nextNode = node.data
                                      .nextNode as PromptNextNode;
                                    const newRoutes = [...(nextNode.routes || [])];
                                    newRoutes[idx] = {
                                      ...newRoutes[idx],
                                      gotoFlow: e.target.value,
                                    };
                                    const newMessage = syncMessage(
                                      node.data.message || "",
                                      newRoutes
                                    );
                                    updateNodeData(node.id, {
                                      message: newMessage,
                                      nextNode: { ...nextNode, routes: newRoutes },
                                    });
                                  }}
                                  placeholder="Target Name"
                                />
                              </>
                            )}
                          </div>
                        </div>

                        {/* Toggles */}
                        <div className="flex flex-wrap items-center gap-3 py-1 bg-gray-50/50 rounded-lg px-2 border border-gray-50">
                          <label className="flex items-center gap-2 text-[11px] font-medium text-gray-600 cursor-pointer group/label">
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={isGoBack}
                                onChange={(e) => {
                                  const nextNode = node.data
                                    .nextNode as PromptNextNode;
                                  const newRoutes = [
                                    ...(nextNode.routes || []),
                                  ];
                                  newRoutes[idx] = {
                                    ...newRoutes[idx],
                                    isGoBack: e.target.checked,
                                    isMainMenu: e.target.checked
                                      ? false
                                      : newRoutes[idx].isMainMenu,
                                  };
                                  const newMessage = syncMessage(
                                    node.data.message || "",
                                    newRoutes
                                  );
                                  updateNodeData(node.id, {
                                    message: newMessage,
                                    nextNode: {
                                      ...nextNode,
                                      routes: newRoutes,
                                    },
                                  });
                                }}
                                className="peer h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all appearance-none border-2 checked:bg-indigo-600 checked:border-indigo-600"
                              />
                              <svg
                                className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none left-0.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                            <span>Is Go Back</span>
                          </label>

                          <label className="flex items-center gap-2 text-[11px] font-medium text-gray-600 cursor-pointer group/label">
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={isRouteMainMenu}
                                onChange={(e) => {
                                  const nextNode = node.data
                                    .nextNode as PromptNextNode;
                                  const newRoutes = [
                                    ...(nextNode.routes || []),
                                  ];
                                  newRoutes[idx] = {
                                    ...newRoutes[idx],
                                    isMainMenu: e.target.checked,
                                    isGoBack: e.target.checked
                                      ? false
                                      : newRoutes[idx].isGoBack,
                                  };
                                  const newMessage = syncMessage(
                                    node.data.message || "",
                                    newRoutes
                                  );
                                  updateNodeData(node.id, {
                                    message: newMessage,
                                    nextNode: {
                                      ...nextNode,
                                      routes: newRoutes,
                                    },
                                  });
                                }}
                                className="peer h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all appearance-none border-2 checked:bg-indigo-600 checked:border-indigo-600"
                              />
                              <svg
                                className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none left-0.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                            <span>Is Main Menu</span>
                          </label>
                        </div>

                        {/* Logic Specific Inputs */}
                        {isGoBack && (
                          <div className="space-y-2 pt-2 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="relative">
                              <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                <svg
                                  className="w-3 h-3 text-amber-500"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                                  />
                                </svg>
                                Go Back Target
                              </label>

                              <div className="relative">
                                <input
                                  className="w-full text-sm border-2 border-gray-100 rounded-lg bg-gray-50/30 px-3 py-2 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder-gray-300 text-gray-900 pr-10"
                                  value={goBackTarget}
                                  onFocus={() => setActiveSearchIdx(idx)}
                                  onBlur={() =>
                                    setTimeout(
                                      () => setActiveSearchIdx(null),
                                      200
                                    )
                                  }
                                  onChange={(e) => {
                                    const nextNode = node.data
                                      .nextNode as PromptNextNode;
                                    const newRoutes = [
                                      ...(nextNode.routes || []),
                                    ];
                                    newRoutes[idx] = {
                                      ...newRoutes[idx],
                                      goBackTarget: e.target.value,
                                    };
                                    updateNodeData(node.id, {
                                      nextNode: {
                                        ...nextNode,
                                        routes: newRoutes,
                                      },
                                    });
                                  }}
                                  placeholder="Type to search..."
                                />

                                {/* Search Icon */}
                                <div className="absolute right-3 top-2.5 text-gray-400">
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                  </svg>
                                </div>

                                {/* Results Dropdown */}
                                {activeSearchIdx === idx && (
                                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl z-[9999] max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                                    {siblingNames
                                      .filter((name) =>
                                        name
                                          .toLowerCase()
                                          .includes(
                                            (goBackTarget || "").toLowerCase()
                                          )
                                      )
                                      .map((name) => (
                                        <button
                                          key={name}
                                          onMouseDown={(e) => { e.preventDefault();
                                            const nextNode = node.data
                                              .nextNode as PromptNextNode;
                                            const newRoutes = [
                                              ...(nextNode.routes || []),
                                            ];
                                            newRoutes[idx] = {
                                              ...newRoutes[idx],
                                              goBackTarget: name,
                                            };
                                            updateNodeData(node.id, {
                                              nextNode: {
                                                ...nextNode,
                                                routes: newRoutes,
                                              },
                                            });
                                            setActiveSearchIdx(null);
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-indigo-600 hover:text-white transition-colors border-b border-gray-50 last:border-0"
                                        >
                                          {name}
                                        </button>
                                      ))}
                                    {siblingNames.length === 0 && (
                                      <div className="px-4 py-3 text-xs text-gray-400 italic">
                                        No sibling nodes found
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {isRouteMainMenu && (
                          <div className="pt-2 border-t border-gray-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                            <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100">
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                                />
                              </svg>
                              <span className="text-[11px] font-semibold tracking-tight uppercase">
                                Redirects to Main Menu
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Default Route */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Default (Fallback)
                </label>
                <input
                  className="w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900 text-sm"
                  value={
                    node.data.nextNode && typeof node.data.nextNode === "object"
                      ? node.data.nextNode.default || ""
                      : ""
                  }
                  onChange={(e) => {
                    let currentNextNode = node.data.nextNode;
                    if (
                      typeof currentNextNode !== "object" ||
                      !currentNextNode
                    ) {
                      currentNextNode = { routes: [], default: "" };
                    }
                    updateNodeData(node.id, {
                      nextNode: { ...currentNextNode, default: e.target.value },
                    });
                  }}
                  placeholder="Fallback Flow/Node"
                />
              </div>
            </div>
          </div>
        )}

        {/* Linear Mode: Show Next Node ID */}
        {(node.data.routingMode === "linear" || !node.data.routingMode) && (
          <TargetNodeDisplay
            nodeId={node.data.nextNode}
            label="Next Node"
            title="Connect the Prompt Node bottom handle on the canvas"
          />
        )}
      </div>

      {/* Right Column: Routing Mode + Options */}
      {/* Right Column: Routing Mode + Options */}
      <div className="space-y-6">
        {/* Basic Configuration Section */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50 mb-2">
            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.717 1.717 0 01-1.07 1.703c-1.624.812-1.624 3.124 0 3.936a1.717 1.717 0 011.07 1.703c-.426 1.756-2.924 1.756-3.35 0a1.717 1.717 0 011.07-1.703c1.624-.812 1.624-3.124 0-3.936a1.717 1.717 0 01-1.07-1.703z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">General Settings</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight mb-1.5 block">
                Routing Mode
              </label>
              <select
                className="w-full text-sm border-2 border-gray-100 rounded-lg bg-gray-50/50 px-2 py-1.5 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all text-gray-900"
                value={String(node.data.routingMode ?? "linear")}
                onChange={(e) =>
                  updateNodeData(node.id, { routingMode: e.target.value })
                }
              >
                <option value="menu">Menu (Branching)</option>
                <option value="linear">Linear (Input)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight mb-1.5 block">
                Response Type
              </label>
              <select
                className="w-full text-sm border-2 border-gray-100 rounded-lg bg-gray-50/50 px-2 py-1.5 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all text-gray-900"
                value={node.data.responseType ?? "CONTINUE"}
                onChange={(e) =>
                  updateNodeData(node.id, { responseType: e.target.value })
                }
              >
                <option value="CONTINUE">CONTINUE</option>
                <option value="END">END</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2">
            <label className="flex items-center gap-2 text-xs text-gray-600 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(node.data.encryptInput)}
                onChange={(e) => updateNodeData(node.id, { encryptInput: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all border-2 checked:bg-indigo-600"
              />
              <span>Encrypt Input</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(node.data.isMainMenu)}
                onChange={(e) => updateNodeData(node.id, { isMainMenu: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all border-2 checked:bg-indigo-600"
              />
              <span>Is Main Menu</span>
            </label>
          </div>
        </section>

        {/* Persistence Section */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50 mb-2">
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Input Validation & Persistence</h3>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-600 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(node.data.persistByIndex)}
                disabled={Boolean(node.data.persistInput)}
                onChange={(e) => updateNodeData(node.id, { persistByIndex: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 transition-all border-2 checked:bg-emerald-600 disabled:opacity-40"
              />
              <span className={node.data.persistInput ? "opacity-40" : ""}>Persist By Index</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(node.data.persistInput)}
                disabled={Boolean(node.data.persistByIndex)}
                onChange={(e) => updateNodeData(node.id, { persistInput: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 transition-all border-2 checked:bg-emerald-600 disabled:opacity-40"
              />
              <span className={node.data.persistByIndex ? "opacity-40" : ""}>Persist Input</span>
            </label>
          </div>

          {(node.data.persistByIndex || node.data.persistInput) && (
            <div className="pt-3 space-y-3 animate-in fade-in slide-in-from-top-2">
              {node.data.persistByIndex && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Persist Source Field</label>
                    <input
                      className="w-full text-sm border-2 border-gray-100 rounded-lg bg-gray-50/50 px-2 py-1.5 focus:outline-none focus:border-emerald-400 focus:bg-white transition-all text-gray-900"
                      value={String(node.data.persistSourceField ?? "")}
                      onChange={(e) => updateNodeData(node.id, { persistSourceField: e.target.value })}
                      placeholder="userAccounts"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Persist Field Name</label>
                    <input
                      className="w-full text-sm border-2 border-gray-100 rounded-lg bg-gray-50/50 px-2 py-1.5 focus:outline-none focus:border-emerald-400 focus:bg-white transition-all text-gray-900"
                      value={String(node.data.persistFieldName ?? "")}
                      onChange={(e) => updateNodeData(node.id, { persistFieldName: e.target.value })}
                      placeholder="SelectedAccount"
                    />
                  </div>
                </div>
              )}
              {node.data.persistInput && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Persist Input As</label>
                  <input
                    className="w-full text-sm border-2 border-gray-100 rounded-lg bg-gray-50/50 px-3 py-2 focus:outline-none focus:border-emerald-400 focus:bg-white transition-all text-gray-900"
                    value={String(node.data.persistInputAs ?? "")}
                    onChange={(e) => updateNodeData(node.id, { persistInputAs: e.target.value })}
                    placeholder="receiverAccountNumber"
                  />
                </div>
              )}
            </div>
          )}
        </section>

        {/* Validation Section */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-50 mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Input Validation</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(node.data.validateIndexedList)}
                onChange={(e) => updateNodeData(node.id, { validateIndexedList: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {node.data.validateIndexedList && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Indexed List Var</label>
                <input
                  className="w-full text-sm border-2 border-gray-100 rounded-lg bg-gray-50/50 px-3 py-2 focus:outline-none focus:border-amber-400 focus:bg-white transition-all text-gray-900 font-mono"
                  value={String(node.data.indexedListVar ?? "")}
                  onChange={(e) => updateNodeData(node.id, { indexedListVar: e.target.value })}
                  placeholder="accountsMenu"
                />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Invalid Input Message</label>
                  <textarea
                    className="w-full text-sm border-2 border-gray-100 rounded-lg bg-gray-50/50 px-3 py-2 focus:outline-none focus:border-amber-400 focus:bg-white transition-all text-gray-900 resize-none"
                    rows={2}
                    value={String(node.data.invalidInputMessage ?? "")}
                    onChange={(e) => updateNodeData(node.id, { invalidInputMessage: e.target.value })}
                    placeholder="Invalid selection. Please try again."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Empty Input Message</label>
                  <textarea
                    className="w-full text-sm border-2 border-gray-100 rounded-lg bg-gray-50/50 px-3 py-2 focus:outline-none focus:border-amber-400 focus:bg-white transition-all text-gray-900 resize-none"
                    rows={2}
                    value={String(node.data.emptyInputMessage ?? "")}
                    onChange={(e) => updateNodeData(node.id, { emptyInputMessage: e.target.value })}
                    placeholder="Input cannot be empty."
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Pagination Section */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-50 mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Pagination</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(node.data.pagination?.enabled)}
                onChange={(e) => {
                  const currentPag = node.data.pagination || {
                    enabled: false,
                    actionNode: "",
                    pageField: "",
                    totalPagesField: "totalPages",
                    nextInput: "#",
                    prevInput: "##",
                    nextLabel: "#. Next Page",
                    prevLabel: "##. Previous Page",
                    controlsVar: "paginationControls",
                  };
                  updateNodeData(node.id, {
                    pagination: { ...currentPag, enabled: e.target.checked },
                  });
                }}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-purple-500"></div>
            </label>
          </div>

          {node.data.pagination?.enabled && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-3 items-center">
                <label className="flex items-center gap-2 text-xs text-gray-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(node.data.hasMultiplePage)}
                    onChange={(e) => updateNodeData(node.id, { hasMultiplePage: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  Has Multiple Page
                </label>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Index Per Page</label>
                  <input
                    type="number"
                    className="w-full text-sm border-2 border-gray-100 rounded-lg bg-gray-50/50 px-2 py-1.5 focus:outline-none focus:border-purple-400 focus:bg-white transition-all text-gray-900"
                    value={node.data.indexPerPage ?? ""}
                    onChange={(e) => updateNodeData(node.id, { indexPerPage: parseInt(e.target.value) || 0 })}
                    placeholder="3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Action Node</label>
                  <input
                    className="w-full text-sm border-2 border-gray-100 rounded-lg bg-gray-50/50 px-2 py-1.5 focus:outline-none focus:border-purple-400 focus:bg-white transition-all text-gray-900 font-mono"
                    value={node.data.pagination.actionNode}
                    onChange={(e) => updateNodeData(node.id, { pagination: { ...node.data.pagination!, actionNode: e.target.value } })}
                    placeholder="loadBanksPage"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Page Field</label>
                  <input
                    className="w-full text-sm border-2 border-gray-100 rounded-lg bg-gray-50/50 px-2 py-1.5 focus:outline-none focus:border-purple-400 focus:bg-white transition-all text-gray-900 font-mono"
                    value={node.data.pagination.pageField}
                    onChange={(e) => updateNodeData(node.id, { pagination: { ...node.data.pagination!, pageField: e.target.value } })}
                    placeholder="banksPage"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Total Pages Field</label>
                  <input
                    className="w-full text-sm border-2 border-gray-100 rounded-lg bg-gray-50/50 px-2 py-1.5 focus:outline-none focus:border-purple-400 focus:bg-white transition-all text-gray-900 font-mono"
                    value={node.data.pagination.totalPagesField}
                    onChange={(e) => updateNodeData(node.id, { pagination: { ...node.data.pagination!, totalPagesField: e.target.value } })}
                    placeholder="totalPages"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Next Input</label>
                  <input
                    className="w-full text-sm border-2 border-gray-100 rounded-lg bg-gray-50/50 px-2 py-1.5 focus:outline-none focus:border-purple-400 focus:bg-white transition-all text-gray-900 font-mono"
                    value={node.data.pagination.nextInput}
                    onChange={(e) => updateNodeData(node.id, { pagination: { ...node.data.pagination!, nextInput: e.target.value } })}
                    placeholder="#"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Prev Input</label>
                  <input
                    className="w-full text-sm border-2 border-gray-100 rounded-lg bg-gray-50/50 px-2 py-1.5 focus:outline-none focus:border-purple-400 focus:bg-white transition-all text-gray-900 font-mono"
                    value={node.data.pagination.prevInput}
                    onChange={(e) => updateNodeData(node.id, { pagination: { ...node.data.pagination!, prevInput: e.target.value } })}
                    placeholder="##"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Next Label</label>
                  <input
                    className="w-full text-sm border-2 border-gray-100 rounded-lg bg-gray-50/50 px-2 py-1.5 focus:outline-none focus:border-purple-400 focus:bg-white transition-all text-gray-900"
                    value={node.data.pagination.nextLabel}
                    onChange={(e) => updateNodeData(node.id, { pagination: { ...node.data.pagination!, nextLabel: e.target.value } })}
                    placeholder="#. Next Page"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Prev Label</label>
                  <input
                    className="w-full text-sm border-2 border-gray-100 rounded-lg bg-gray-50/50 px-2 py-1.5 focus:outline-none focus:border-purple-400 focus:bg-white transition-all text-gray-900"
                    value={node.data.pagination.prevLabel}
                    onChange={(e) => updateNodeData(node.id, { pagination: { ...node.data.pagination!, prevLabel: e.target.value } })}
                    placeholder="##. Previous Page"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Controls Variable</label>
                <input
                  className="w-full text-sm border-2 border-gray-100 rounded-lg bg-gray-50/50 px-2 py-1.5 focus:outline-none focus:border-purple-400 focus:bg-white transition-all text-gray-900 font-mono"
                  value={node.data.pagination.controlsVar}
                  onChange={(e) => updateNodeData(node.id, { pagination: { ...node.data.pagination!, controlsVar: e.target.value } })}
                  placeholder="paginationControls"
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
