"use client";

import NodeNameInput from "./NodeNameInput";
import TargetNodeDisplay from "./TargetNodeDisplay";

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
};

type PromptNode = {
  id: string;
  data: PromptNodeData;
};

export default function PromptInspector({
  node,
  updateNodeData,
}: PromptInspectorProps) {
  const syncMessage = (
    currentMessage: string,
    routes: PromptRoute[]
  ): string => {
    // 1. Identify existing routing lines (starts with "N. ")
    const lines = currentMessage.split("\n");
    const introLines: string[] = [];

    for (const line of lines) {
      if (!/^\d+\.\s/.test(line.trim())) {
        introLines.push(line);
      } else {
        // Stop at the first routing line to preserve only the intro
        break;
      }
    }

    const intro = introLines.join("\n").trim();

    // 2. Generate new routing lines
    const routingLines = routes.map(
      (r, i) => `${r.when?.eq?.[1] || i + 1}. ${r.gotoFlow || "..."}`
    );

    // 3. Combine intro and routes
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
                          const newMessage = syncMessage(node.data.message || "", newRoutes);
                          updateNodeData(node.id, {
                            message: newMessage,
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
                              const nextNode = node.data
                                .nextNode as PromptNextNode;
                              const newRoutes = [...(nextNode.routes || [])];
                              newRoutes[idx] = {
                                ...newRoutes[idx],
                                when: { eq: ["{{input}}", e.target.value] },
                              };
                              const newMessage = syncMessage(node.data.message || "", newRoutes);
                              updateNodeData(node.id, {
                                message: newMessage,
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
                              const nextNode = node.data
                                .nextNode as PromptNextNode;
                              const newRoutes = [...(nextNode.routes || [])];
                              newRoutes[idx] = {
                                ...newRoutes[idx],
                                gotoFlow: e.target.value,
                              };
                              const newMessage = syncMessage(node.data.message || "", newRoutes);
                              updateNodeData(node.id, {
                                message: newMessage,
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
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-600">
            Routing Mode
          </label>
          <select
            className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm text-gray-900"
            value={String(node.data.routingMode ?? "linear")}
            onChange={(e) =>
              updateNodeData(node.id, { routingMode: e.target.value })
            }
          >
            <option value="menu">Menu (Branching)</option>
            <option value="linear">Linear (Input Collection)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600">
            Response Type
          </label>
          <select
            className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm text-gray-900"
            value={node.data.responseType ?? "CONTINUE"}
            onChange={(e) =>
              updateNodeData(node.id, { responseType: e.target.value })
            }
          >
            <option value="CONTINUE">CONTINUE</option>
            <option value="END">END</option>
          </select>
        </div>

        <div className="space-y-3 rounded-md border border-gray-100 bg-white p-3 shadow-sm">
          <div className="text-xs font-semibold text-gray-600">
            Input Validation & Persistence
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(node.data.persistByIndex)}
                onChange={(e) =>
                  updateNodeData(node.id, { persistByIndex: e.target.checked })
                }
              />
              Persist By Index
            </label>

            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(node.data.persistInput)}
                onChange={(e) =>
                  updateNodeData(node.id, { persistInput: e.target.checked })
                }
              />
              Persist Input
            </label>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(node.data.encryptInput)}
                onChange={(e) =>
                  updateNodeData(node.id, { encryptInput: e.target.checked })
                }
              />
              Encrypt Input
            </label>
          </div>

          {(node.data.persistByIndex || node.data.persistInput) && (
            <div className="space-y-3 pt-2 border-t border-gray-50">
              {node.data.persistByIndex && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500 block uppercase mb-1">
                      Persist Source Field
                    </label>
                    <input
                      className="w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900 text-sm"
                      value={String(node.data.persistSourceField ?? "")}
                      onChange={(e) =>
                        updateNodeData(node.id, {
                          persistSourceField: e.target.value,
                        })
                      }
                      placeholder="userAccounts"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block uppercase mb-1">
                      Persist Field Name
                    </label>
                    <input
                      className="w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900 text-sm"
                      value={String(node.data.persistFieldName ?? "")}
                      onChange={(e) =>
                        updateNodeData(node.id, { persistFieldName: e.target.value })
                      }
                      placeholder="SelectedAccount"
                    />
                  </div>
                </div>
              )}

              {node.data.persistInput && (
                <div>
                  <label className="text-[10px] text-gray-500 block uppercase mb-1">
                    Persist Input As
                  </label>
                  <input
                    className="w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900 text-sm"
                    value={String(node.data.persistInputAs ?? "")}
                    onChange={(e) =>
                      updateNodeData(node.id, { persistInputAs: e.target.value })
                    }
                    placeholder="receiverAccountNumber"
                  />
                </div>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={Boolean(node.data.validateIndexedList)}
              onChange={(e) =>
                updateNodeData(node.id, {
                  validateIndexedList: e.target.checked,
                })
              }
            />
            Validate Indexed List
          </label>

          <div>
            <label className="text-[10px] text-gray-500 block uppercase mb-1">
              Indexed List Var
            </label>
            <input
              className="w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900 text-sm"
              value={String(node.data.indexedListVar ?? "")}
              onChange={(e) =>
                updateNodeData(node.id, { indexedListVar: e.target.value })
              }
              placeholder="accountsMenu"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-500 block uppercase mb-1">
              Invalid Input Message
            </label>
            <textarea
              className="w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900 text-sm"
              rows={3}
              value={String(node.data.invalidInputMessage ?? "")}
              onChange={(e) =>
                updateNodeData(node.id, { invalidInputMessage: e.target.value })
              }
              placeholder="Invalid input..."
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-500 block uppercase mb-1">
              Empty Input Message
            </label>
            <textarea
              className="w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900 text-sm"
              rows={3}
              value={String(node.data.emptyInputMessage ?? "")}
              onChange={(e) =>
                updateNodeData(node.id, { emptyInputMessage: e.target.value })
              }
              placeholder="Please try again..."
            />
          </div>

          <div className="space-y-3 pt-3 border-t border-gray-100">
            <div className="text-xs font-semibold text-gray-600 mb-2">
              Page Metadata
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(node.data.hasMultiplePage)}
                  onChange={(e) =>
                    updateNodeData(node.id, { hasMultiplePage: e.target.checked })
                  }
                />
                Has Multiple Page
              </label>
              <div>
                <label className="text-[10px] text-gray-500 block uppercase mb-1">
                  Index Per Page
                </label>
                <input
                  type="number"
                  className="w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900 text-sm"
                  value={node.data.indexPerPage ?? ""}
                  onChange={(e) =>
                    updateNodeData(node.id, { indexPerPage: parseInt(e.target.value) || 0 })
                  }
                  placeholder="3"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-gray-600">
                Pagination Settings
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-700">
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
                />
                Enabled
              </label>
            </div>

            {node.data.pagination?.enabled && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500 block uppercase mb-1">
                      Action Node
                    </label>
                    <input
                      className="w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900 text-sm"
                      value={node.data.pagination.actionNode}
                      onChange={(e) =>
                        updateNodeData(node.id, {
                          pagination: { ...node.data.pagination!, actionNode: e.target.value },
                        })
                      }
                      placeholder="loadBanksPage"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block uppercase mb-1">
                      Page Field
                    </label>
                    <input
                      className="w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900 text-sm"
                      value={node.data.pagination.pageField}
                      onChange={(e) =>
                        updateNodeData(node.id, {
                          pagination: { ...node.data.pagination!, pageField: e.target.value },
                        })
                      }
                      placeholder="banksPage"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500 block uppercase mb-1">
                      Total Pages Field
                    </label>
                    <input
                      className="w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900 text-sm"
                      value={node.data.pagination.totalPagesField}
                      onChange={(e) =>
                        updateNodeData(node.id, {
                          pagination: { ...node.data.pagination!, totalPagesField: e.target.value },
                        })
                      }
                      placeholder="totalPages"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500 block uppercase mb-1">
                      Next Input
                    </label>
                    <input
                      className="w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900 text-sm"
                      value={node.data.pagination.nextInput}
                      onChange={(e) =>
                        updateNodeData(node.id, {
                          pagination: { ...node.data.pagination!, nextInput: e.target.value },
                        })
                      }
                      placeholder="#"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block uppercase mb-1">
                      Prev Input
                    </label>
                    <input
                      className="w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900 text-sm"
                      value={node.data.pagination.prevInput}
                      onChange={(e) =>
                        updateNodeData(node.id, {
                          pagination: { ...node.data.pagination!, prevInput: e.target.value },
                        })
                      }
                      placeholder="##"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500 block uppercase mb-1">
                      Next Label
                    </label>
                    <input
                      className="w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900 text-sm"
                      value={node.data.pagination.nextLabel}
                      onChange={(e) =>
                        updateNodeData(node.id, {
                          pagination: { ...node.data.pagination!, nextLabel: e.target.value },
                        })
                      }
                      placeholder="#. Next Page"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block uppercase mb-1">
                      Prev Label
                    </label>
                    <input
                      className="w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900 text-sm"
                      value={node.data.pagination.prevLabel}
                      onChange={(e) =>
                        updateNodeData(node.id, {
                          pagination: { ...node.data.pagination!, prevLabel: e.target.value },
                        })
                      }
                      placeholder="##. Previous Page"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 block uppercase mb-1">
                    Controls Variable
                  </label>
                  <input
                    className="w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900 text-sm"
                    value={node.data.pagination.controlsVar}
                    onChange={(e) =>
                      updateNodeData(node.id, {
                        pagination: { ...node.data.pagination!, controlsVar: e.target.value },
                      })
                    }
                    placeholder="paginationControls"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
