import { create } from "zustand";
import { Node, Edge, ReactFlowInstance } from "reactflow";

interface FlowState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  inspectorOpen: boolean;
  inspectorPosition: { x: number; y: number; placement: "above" | "below" | "center" } | null;

  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  removeNode: (id: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  openInspector: (id: string) => void;
  closeInspector: () => void;
  setInspectorPosition: (pos: { x: number; y: number; placement: "above" | "below" | "center" } | null) => void;
  updateNodeData: (id: string, data: Partial<Record<string, unknown>>) => void;

  rfInstance: ReactFlowInstance | null;
  setRfInstance: (instance: ReactFlowInstance) => void;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  inspectorOpen: false,
  inspectorPosition: null,

  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

  rfInstance: null,
  setRfInstance: (instance) => set({ rfInstance: instance }),

  addNode: (node) =>
    set((state) => ({ nodes: [...state.nodes, node] })),

  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    })),

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  // open the inspector and compute its approximate screen position based on the node element
  openInspector: (id) => {
    try {
      const node = get().nodes.find((n) => n.id === id);
      const isAction = node?.type === "action";

      const el = document.querySelector(
        `.react-flow__node[data-id="${id}"]`
      ) as HTMLElement | null;

      let pos: { x: number; y: number; placement: "above" | "below" | "center" } | null = null;
      if (el) {
        const rect = el.getBoundingClientRect();

        // Dimensions based on node type
        // Action node is w-[800px], others are w-96 (384px)
        const modalWidth = isAction ? 800 : 384;
        const modalHalf = modalWidth / 2;

        // Height estimate (Action node is taller due to tabs/fields)
        const modalHeightEstimate = isAction ? 600 : 360;

        // position centered horizontally and prefer above placement when there's space
        const xCenter = rect.left + rect.width / 2;
        const x = Math.min(
          Math.max(xCenter, modalHalf + 16),
          window.innerWidth - modalHalf - 16
        );

        const margin = 12;
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;

        if (spaceAbove > modalHeightEstimate + margin) {
          // place above: y is top edge where we'll translate by -100%
          pos = { x, y: rect.top - margin, placement: "above" };
        } else if (spaceBelow > modalHeightEstimate + margin) {
          // place below: y is the top coordinate of the modal
          pos = { x, y: rect.bottom + margin, placement: "below" };
        } else {
          // center fallback
          pos = { x: window.innerWidth / 2, y: window.innerHeight / 2, placement: "center" };
        }
      }

      set({ inspectorOpen: true, selectedNodeId: id, inspectorPosition: pos });
    } catch (e) {
      // fallback to opening without position
      set({ inspectorOpen: true, selectedNodeId: id, inspectorPosition: null });
    }
  },

  closeInspector: () => set({ inspectorOpen: false, inspectorPosition: null }),

  setInspectorPosition: (pos) => set({ inspectorPosition: pos }),

  updateNodeData: (id, data: Partial<Record<string, unknown>>) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    })),



}));
