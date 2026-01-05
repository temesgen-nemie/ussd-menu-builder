"use client";

import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  useCallback,
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  useState,
  useMemo,
} from "react";
import { useFlowStore } from "../store/flowStore";
import PromptNode from "./nodes/PromptNode";
import ActionNode from "./nodes/ActionNode";
import StartNode from "./nodes/StartNode";
import GroupNode from "./nodes/GroupNode";
import GroupNamerModal from "./modals/GroupNamerModal";
import GroupJsonModal from "./modals/GroupJsonModal";

const nodeTypes = {
  prompt: PromptNode,
  action: ActionNode,
  start: StartNode,
  group: GroupNode,
};

export default function FlowCanvas() {
  const [menu, setMenu] = useState<{
    id: string;
    top: number;
    left: number;
  } | null>(null);

  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    setSelectedNodeId,
    selectedNodeId,
    removeNode,
    openInspector,
    updateNodeData,
    closeInspector,
    inspectorOpen,
    setRfInstance,
    currentSubflowId,
    enterSubflow,
    exitSubflow,
    openNamer,
    ungroupNodes,
    openGroupJson,
  } = useFlowStore();

  // Filter nodes and edges based on subflow level
  // Strip parentNode reference from visible nodes so React Flow treats them as top-level in drill-down view
  const visibleNodes = useMemo(() => {
    return nodes
      .filter((n) => (n.parentNode || null) === (currentSubflowId || null))
      .map((n) => (currentSubflowId ? { ...n, parentNode: undefined } : n));
  }, [nodes, currentSubflowId]);

  // Edges are visible if both source and target are in the current view
  const visibleEdges = useMemo(() => {
    return edges.filter((e) => {
      const s = nodes.find((n) => n.id === e.source);
      const t = nodes.find((n) => n.id === e.target);
      return (
        (s?.parentNode || null) === (currentSubflowId || null) &&
        (t?.parentNode || null) === (currentSubflowId || null)
      );
    });
  }, [edges, nodes, currentSubflowId]);

  // Context Menu Handlers
  const onNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: Node) => {
      event.preventDefault();

      const selectedNodes = nodes.filter((n) => n.selected);
      const isPartofSelection = selectedNodes.some((n) => n.id === node.id);

      // If we right click a node that is part of a multi-selection, show the Grouping menu
      if (selectedNodes.length > 1 && isPartofSelection) {
        setMenu({
          id: "selection",
          top: event.clientY,
          left: event.clientX,
        });
      }
      // Otherwise, only show menu for Group nodes (to avoid the "empty white bar" bug)
      else if (node.type === "group") {
        setMenu({
          id: node.id,
          top: event.clientY,
          left: event.clientX,
        });
      } else {
        setMenu(null);
      }
    },
    [nodes, setMenu]
  );

  const onPaneContextMenu = useCallback(
    (event: ReactMouseEvent) => {
      event.preventDefault();
      const selectedNodes = nodes.filter((n) => n.selected);

      // Show grouping menu if multiple nodes are selected
      if (selectedNodes.length > 1) {
        setMenu({
          id: "selection",
          top: event.clientY,
          left: event.clientX,
        });
      } else {
        // Show "Empty Group" menu if clicking on blank space
        setMenu({
          id: "pane",
          top: event.clientY,
          left: event.clientX,
        });
      }
    },
    [nodes, setMenu]
  );

  // add edge (uses current edges array)
  const onConnect = useCallback(
    (params: Edge | Connection) => {
      setEdges(addEdge(params, edges));

      const sourceNode = nodes.find((n) => n.id === params.source);

      // Visual Branching Logic:
      if (params.sourceHandle) {
        // 1. Prompt Options
        if (
          sourceNode &&
          sourceNode.type === "prompt" &&
          sourceNode.data.options
        ) {
          const handleId = params.sourceHandle;
          interface PromptOption {
            id: string;
            nextNode?: string;
          }
          const options = (sourceNode.data.options as PromptOption[]) || [];
          const optionIndex = options.findIndex((o) => o.id === handleId);

          if (optionIndex !== -1) {
            const newOptions = [...options];
            newOptions[optionIndex] = {
              ...newOptions[optionIndex],
              nextNode: params.target || "",
            };
            updateNodeData(sourceNode.id, { options: newOptions });
          }
        }
        // 2. Action Routes
        else if (sourceNode && sourceNode.type === "action") {
          const handleId = params.sourceHandle;
          // Check if it's the default handle
          if (handleId === "default") {
            updateNodeData(sourceNode.id, { nextNode: params.target });
          } else {
            // It's a conditional route
            interface ActionRoute {
              id: string;
              nextNodeId?: string;
            }
            const routes = (sourceNode.data.routes as ActionRoute[]) || [];
            const routeIndex = routes.findIndex((r) => r.id === handleId);

            if (routeIndex !== -1) {
              const newRoutes = [...routes];
              newRoutes[routeIndex] = {
                ...newRoutes[routeIndex],
                nextNodeId: params.target || "",
              };
              updateNodeData(sourceNode.id, { routes: newRoutes });
            }
          }
        }
      } else {
        // If no specific handle ID is used (default/legacy handles)

        // Prompt Node Logic (Linear Mode/Default)
        if (sourceNode && sourceNode.type === "prompt") {
          updateNodeData(sourceNode.id, { nextNode: params.target });
        }
        // Action Node Logic (legacy fallback or default handle if no ID)
        else if (sourceNode && sourceNode.type === "action") {
          updateNodeData(sourceNode.id, { nextNode: params.target });
        }
        // Start Node Logic:
        else if (sourceNode && sourceNode.type === "start") {
          updateNodeData(sourceNode.id, { entryNode: params.target });
        }
      }
    },
    [edges, setEdges, nodes, updateNodeData]
  );

  // Handle edge deletion to clear the nextNode mapping
  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      deletedEdges.forEach((edge) => {
        if (edge.sourceHandle) {
          const sourceNode = nodes.find((n) => n.id === edge.source);

          // 1. Prompt Options
          if (
            sourceNode &&
            sourceNode.type === "prompt" &&
            sourceNode.data.options
          ) {
            interface PromptOption {
              id: string;
              nextNode?: string;
            }
            const options = (sourceNode.data.options as PromptOption[]) || [];
            const optionIndex = options.findIndex(
              (o) => o.id === edge.sourceHandle
            );

            if (optionIndex !== -1) {
              const newOptions = [...options];
              newOptions[optionIndex] = {
                ...newOptions[optionIndex],
                nextNode: "",
              };
              updateNodeData(sourceNode.id, { options: newOptions });
            }
          }
          // 2. Action Routes
          else if (sourceNode && sourceNode.type === "action") {
            if (edge.sourceHandle === "default") {
              updateNodeData(sourceNode.id, { nextNode: "" });
            } else {
              interface ActionRoute {
                id: string;
                nextNodeId?: string;
              }
              const routes = (sourceNode.data.routes as ActionRoute[]) || [];
              const routeIndex = routes.findIndex(
                (r) => r.id === edge.sourceHandle
              );
              if (routeIndex !== -1) {
                const newRoutes = [...routes];
                newRoutes[routeIndex] = {
                  ...newRoutes[routeIndex],
                  nextNodeId: "",
                };
                updateNodeData(sourceNode.id, { routes: newRoutes });
              }
            }
          }
        } else {
          // If no specific handle ID is used (legacy)
          const sourceNode = nodes.find((n) => n.id === edge.source);

          if (sourceNode) {
            if (sourceNode.type === "prompt") {
              updateNodeData(sourceNode.id, { nextNode: "" });
            } else if (sourceNode.type === "action") {
              updateNodeData(sourceNode.id, { nextNode: "" });
            } else if (sourceNode.type === "start") {
              updateNodeData(sourceNode.id, { entryNode: "" });
            }
          }
        }
      });
    },
    [nodes, updateNodeData]
  );

  // node drag / move / selection: apply change objects to current `nodes`
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes(applyNodeChanges(changes, nodes)),
    [nodes, setNodes]
  );

  // edge changes: apply change objects to current `edges`
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges(applyEdgeChanges(changes, edges)),
    [edges, setEdges]
  );

  // selection
  const onSelectionChange = useCallback(
    ({ nodes }: { nodes: Node[] }) => {
      setSelectedNodeId(nodes[0]?.id ?? null);
    },
    [setSelectedNodeId]
  );

  // also select node on click (helps when selectionChange doesn't fire)
  const onNodeClick = useCallback(
    (_event: ReactMouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
      setMenu(null);
    },
    [setSelectedNodeId]
  );

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  // open inspector on double-click
  const onNodeDoubleClick = useCallback(
    (_event: ReactMouseEvent, node: Node) => {
      if (node.type === "group") {
        enterSubflow(node.id);
        return;
      }
      try {
        const el = document.querySelector(
          `.react-flow__node[data-id="${node.id}"]`
        ) as HTMLElement | null;

        const rect = el?.getBoundingClientRect();
        const isVisible =
          !!rect &&
          rect.top >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.left >= 0 &&
          rect.right <= window.innerWidth;

        if (!isVisible && rfInstanceRef.current) {
          rfInstanceRef.current.fitView({ nodes: [node], padding: 0.2 });
          setTimeout(() => openInspector(node.id), 240);
        } else {
          openInspector(node.id);
        }
      } catch (e) {
        openInspector(node.id);
      }
    },
    [openInspector, enterSubflow]
  );

  // Update inspector position while dragging
  const onNodeDrag = useCallback(
    (_event: ReactMouseEvent, node: Node) => {
      // Only update position if inspector is ALREADY open
      if (node.id === selectedNodeId && inspectorOpen) {
        openInspector(node.id);
      }
    },
    [selectedNodeId, inspectorOpen, openInspector]
  );

  // Close inspector when clicking on the empty canvas pane
  const onPaneClick = useCallback(() => {
    closeInspector();
    setMenu(null);
  }, [closeInspector]);

  // delete selected node with Delete/Backspace key, close inspector with Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete") {
        if (selectedNodeId) {
          removeNode(selectedNodeId);
        }
      } else if (e.key === "Escape") {
        // Close the inspector if open
        closeInspector();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedNodeId, removeNode, closeInspector]);


  return (
    <div className="w-full h-full relative group">
      {/* Subflow Breadcrumbs */}
      {currentSubflowId && (
        <div className="absolute top-6 left-6 z-50 flex items-center gap-3 bg-white/90 backdrop-blur-xl shadow-2xl border border-indigo-100 px-6 py-3 rounded-2xl animate-in slide-in-from-top-6 duration-500">
          <button
            onClick={() => exitSubflow()}
            className="flex items-center gap-2 text-gray-400 hover:text-indigo-600 transition-all font-bold text-sm group/main"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 transform group-hover/main:-translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Main Flow
          </button>
          <div className="h-4 w-[2px] bg-gray-200 rounded-full mx-1" />
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <span className="text-indigo-600 font-black text-sm tracking-tight">
              {nodes.find((n) => n.id === currentSubflowId)?.data.name ||
                "Subflow"}
            </span>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onSelectionChange={onSelectionChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDrag={onNodeDrag}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onInit={(inst) => {
          rfInstanceRef.current = inst;
          setRfInstance(inst);
        }}
        fitView
      >
        <Background gap={20} color="#f1f5f9" />
        <Controls className="bg-white border-2 border-gray-100 shadow-xl rounded-xl" />
        <MiniMap className="border-2 border-gray-100 shadow-xl rounded-2xl overflow-hidden" />

        {/* Global Context Menu UI */}
        {menu && (
          <div
            style={{ top: menu.top, left: menu.left }}
            className="fixed z-[1000] bg-white/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl border border-indigo-50 py-2.5 w-64 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
            onClick={() => setMenu(null)}
          >
            {menu.id === "selection" ? (
              <button
                className="w-full flex items-center gap-3 px-5 py-3 text-sm text-indigo-600 hover:bg-indigo-50 font-bold transition-all group/item"
                onClick={() => {
                  const selectedIds = nodes
                    .filter((n) => n.selected)
                    .map((n) => n.id);
                  openNamer(selectedIds);
                }}
              >
                <div className="p-2 bg-indigo-100 rounded-xl group-hover/item:bg-indigo-600 group-hover/item:text-white transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                Group Selected Nodes
              </button>
            ) : menu.id === "pane" ? (
              <button
                className="w-full flex items-center gap-3 px-5 py-3 text-sm text-indigo-600 hover:bg-indigo-50 font-bold transition-all group/item"
                onClick={() => {
                  // Open namer with empty array to signify "Create Empty Group"
                  openNamer([]);
                }}
              >
                <div className="p-2 bg-indigo-100 rounded-xl group-hover/item:bg-indigo-600 group-hover/item:text-white transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                Create Empty Group
              </button>
            ) : (
              <>
                {nodes.find((n) => n.id === menu.id)?.type === "group" && (
                  <div className="flex flex-col gap-0.5">
                    <button
                      className="w-full flex items-center gap-3 px-5 py-3 text-sm text-indigo-600 hover:bg-indigo-50 font-bold transition-all group/item"
                      onClick={() => enterSubflow(menu.id)}
                    >
                      <div className="p-2 bg-indigo-100 rounded-xl group-hover/item:bg-indigo-600 group-hover/item:text-white transition-colors">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"
                          />
                        </svg>
                      </div>
                      Enter Group
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-5 py-3 text-sm text-emerald-600 hover:bg-emerald-50 font-bold transition-all group/item"
                      onClick={() => openGroupJson(menu.id)}
                    >
                      <div className="p-2 bg-emerald-100 rounded-xl group-hover/item:bg-emerald-600 group-hover/item:text-white transition-colors">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                          />
                        </svg>
                      </div>
                      View Group JSON
                    </button>
                    {(() => {
                      const groupNode = nodes.find((n) => n.id === menu.id);
                      const children = nodes.filter((n) => n.parentNode === menu.id);
                      const hasStartInChildren = children.some((n) => n.type === "start");
                      const parentId = groupNode?.parentNode || null;
                      const parentHasStart = nodes.some(
                        (n) => n.type === "start" && (n.parentNode || null) === (parentId || null)
                      );
                      const isUngroupBlocked = hasStartInChildren && parentHasStart;

                      return (
                        <button
                          disabled={isUngroupBlocked}
                          className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-bold transition-all group/item ${
                            isUngroupBlocked
                              ? "text-gray-400 cursor-not-allowed bg-gray-50"
                              : "text-red-600 hover:bg-red-50"
                          }`}
                          onClick={() => ungroupNodes(menu.id)}
                        >
                          <div className={`p-2 rounded-xl transition-colors ${
                            isUngroupBlocked 
                              ? "bg-gray-200 text-gray-400" 
                              : "bg-red-100 group-hover/item:bg-red-600 group-hover/item:text-white"
                          }`}>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.268 14c-.77 1.333.192 3 1.732 3z"
                              />
                            </svg>
                          </div>
                          <div className="flex flex-col items-start">
                            <span>Ungroup Items</span>
                            {isUngroupBlocked && (
                              <span className="text-[10px] font-medium text-red-500">Parent level already has a Start node</span>
                            )}
                          </div>
                        </button>
                      );
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </ReactFlow>

      {/* Modals */}
      <GroupNamerModal />
      <GroupJsonModal />
    </div>
  );
}
