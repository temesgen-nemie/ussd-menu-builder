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

const nodeTypes = {
  prompt: PromptNode,
  action: ActionNode,
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
    closeInspector,
  } = useFlowStore();

  // add edge (uses current edges array)
  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges(addEdge(params, edges)),
    [edges, setEdges]
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
      onSelectionChange={onSelectionChange}
      onNodeClick={onNodeClick}
      onNodeDoubleClick={onNodeDoubleClick}
      onInit={(inst) => (rfInstanceRef.current = inst)}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}
