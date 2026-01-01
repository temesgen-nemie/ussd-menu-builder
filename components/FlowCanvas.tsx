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
} from "react";
import { useFlowStore } from "../store/flowStore";
import PromptNode from "./nodes/PromptNode";
import ActionNode from "./nodes/ActionNode";
import StartNode from "./nodes/StartNode";

const nodeTypes = {
  prompt: PromptNode,
  action: ActionNode,
  start: StartNode,
};

export default function FlowCanvas() {
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
  } = useFlowStore();

  // add edge (uses current edges array)
  const onConnect = useCallback(
    (params: Edge | Connection) => {
      setEdges(addEdge(params, edges));

      const sourceNode = nodes.find((n) => n.id === params.source);

      // Visual Branching Logic:
      if (params.sourceHandle) {
        // 1. Prompt Options
        if (sourceNode && sourceNode.type === "prompt" && sourceNode.data.options) {
          const handleId = params.sourceHandle;
          const options = (sourceNode.data.options as any[]) || [];
          const optionIndex = options.findIndex((o) => o.id === handleId);

          if (optionIndex !== -1) {
            const newOptions = [...options];
            newOptions[optionIndex] = {
              ...newOptions[optionIndex],
              nextNode: params.target,
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
             const routes = (sourceNode.data.routes as any[]) || [];
             const routeIndex = routes.findIndex((r) => r.id === handleId);
             
             if (routeIndex !== -1) {
               const newRoutes = [...routes];
               newRoutes[routeIndex] = {
                 ...newRoutes[routeIndex],
                 nextNodeId: params.target,
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
          if (sourceNode && sourceNode.type === "prompt" && sourceNode.data.options) {
            const options = (sourceNode.data.options as any[]) || [];
            const optionIndex = options.findIndex((o) => o.id === edge.sourceHandle);

            if (optionIndex !== -1) {
              const newOptions = [...options];
              newOptions[optionIndex] = { ...newOptions[optionIndex], nextNode: "" };
              updateNodeData(sourceNode.id, { options: newOptions });
            }
          }
          // 2. Action Routes
          else if (sourceNode && sourceNode.type === "action") {
             if (edge.sourceHandle === "default") {
                updateNodeData(sourceNode.id, { nextNode: "" });
             } else {
                const routes = (sourceNode.data.routes as any[]) || [];
                const routeIndex = routes.findIndex((r) => r.id === edge.sourceHandle);
                if (routeIndex !== -1) {
                   const newRoutes = [...routes];
                   newRoutes[routeIndex] = { ...newRoutes[routeIndex], nextNodeId: "" };
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
    },
    [setSelectedNodeId]
  );

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  // open inspector on double-click (center node into view first if necessary)
  const onNodeDoubleClick = useCallback(
    (_event: ReactMouseEvent, node: Node) => {
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
    [openInspector]
  );
  
  // Update inspector position while dragging the selected node
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
    <ReactFlow
      nodes={nodes}
      edges={edges}
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
      onInit={(inst) => (rfInstanceRef.current = inst)}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}
