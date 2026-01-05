"use client";

import NodeNameInput from "./NodeNameInput";

type PromptInspectorProps = {
  node: PromptNode;
  updateNodeData: (id: string, data: Partial<Record<string, unknown>>) => void;
};

type PromptRoute = {
  when?: { eq?: string[] };
  gotoFlow?: string;
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
};

type PromptNode = {
  id: string;
  data: PromptNodeData;
};

export default function PromptInspector({
  node,
  updateNodeData,
}: PromptInspectorProps) {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left Column: Basic Info */}
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
      </div>

      {/* Right Column: Routing & Options */}
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-600">
            Routing Mode
          </label>
          <select
            className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm text-gray-900"
            value={String(node.data.routingMode ?? "menu")}
            onChange={(e) =>
              updateNodeData(node.id, { routingMode: e.target.value })
            }
          >
            <option value="menu">Menu (Branching)</option>
            <option value="linear">Linear (Input Collection)</option>
          </select>
        </div>

        {/* Menu Mode: Logic Routing Rules */}
        {(!node.data.routingMode || node.data.routingMode === "menu") && (
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

                  updateNodeData(node.id, {
                    nextNode: {
                      ...currentNextNode,
                      routes: [
                        ...routes,
                        { when: { eq: ["{{input}}", ""] }, gotoFlow: "" },
                      ],
                    },
                  });
                }}
                className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100"
              >
                + Add Rule
              </button>
            </div>

            <div className="space-y-3 max-h-100 overflow-y-auto pr-1">
              {(() => {
                // Helper to safely get routes
                const nextNode = node.data.nextNode;
                const routes =
                  nextNode && typeof nextNode === "object" && nextNode.routes
                    ? nextNode.routes
                    : [];

                return routes.map((route, idx) => {
                  // Extract current values
                  const inputValue = route.when?.eq?.[1] || "";
                  const gotoFlow = route.gotoFlow || "";

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 rounded-md border border-gray-200 relative group"
                    >
                      <button
                        onClick={() => {
                          const nextNode = node.data.nextNode as PromptNextNode;
                          const newRoutes = (nextNode.routes || []).filter(
                            (_, i) => i !== idx
                          );
                          updateNodeData(node.id, {
                            nextNode: { ...nextNode, routes: newRoutes },
                          });
                        }}
                        className="hidden group-hover:block absolute top-1 right-1 text-gray-400 hover:text-red-500"
                        title="Remove rule"
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

                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1/3">
                          <label className="text-[10px] text-gray-500 block uppercase mb-1">
                            Input
                          </label>
                          <input
                            className="w-full text-sm border-b border-gray-300 bg-transparent py-1 focus:outline-none focus:border-indigo-500 placeholder-gray-400 font-mono text-center text-gray-900"
                            value={inputValue}
                            onChange={(e) => {
                              const nextNode = node.data.nextNode as PromptNextNode;
                              const newRoutes = [...(nextNode.routes || [])];
                              // Update specific deep property structure
                              newRoutes[idx] = {
                                ...newRoutes[idx],
                                when: { eq: ["{{input}}", e.target.value] },
                              };
                              updateNodeData(node.id, {
                                nextNode: { ...nextNode, routes: newRoutes },
                              });
                            }}
                            placeholder="1"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-500 block uppercase mb-1">
                            Goto Flow/Node
                          </label>
                          <input
                            className="w-full text-sm border-b border-gray-300 bg-transparent py-1 focus:outline-none focus:border-indigo-500 placeholder-gray-400 text-gray-900"
                            value={gotoFlow}
                            onChange={(e) => {
                              const nextNode = node.data.nextNode as PromptNextNode;
                              const newRoutes = [...(nextNode.routes || [])];
                              newRoutes[idx] = {
                                ...newRoutes[idx],
                                gotoFlow: e.target.value,
                              };
                              updateNodeData(node.id, {
                                nextNode: { ...nextNode, routes: newRoutes },
                              });
                            }}
                            placeholder="Target Name"
                          />
                        </div>
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
                    if (typeof currentNextNode !== "object" || !currentNextNode) {
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
        {node.data.routingMode === "linear" && (
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
                title="Connect the Prompt Node bottom handle on the canvas"
              />
            </div>
            <p className="mt-2 text-[10px] text-gray-400">
              Collects input then proceeds to this node.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
