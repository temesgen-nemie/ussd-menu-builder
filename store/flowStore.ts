import { create } from "zustand";
import { Node, Edge } from "reactflow";

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
}

export const useFlowStore = create<FlowState>((set) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  inspectorOpen: false,
  inspectorPosition: null,

  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

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
      const el = document.querySelector(
        `.react-flow__node[data-id="${id}"]`
      ) as HTMLElement | null;

      let pos = null;
      if (el) {
        const rect = el.getBoundingClientRect();
        // position centered horizontally and prefer above placement when there's space
        const modalHalf = 192; // half of the modal width (w-96 == 384px)
        const xCenter = rect.left + rect.width / 2;
        const x = Math.min(
          Math.max(xCenter, modalHalf + 16),
          window.innerWidth - modalHalf - 16
        );

        const modalHeightEstimate = 360; // approx height of the modal
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

      // If this is an action node, ensure it has sensible default editable fields
      set({ inspectorOpen: true, selectedNodeId: id, inspectorPosition: pos as any });
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
