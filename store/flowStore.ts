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
  setInspectorPosition: (pos: { x: number; y: number } | null) => void;
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
      set((state) => {
        const node = state.nodes.find((n) => n.id === id);
        if (node && (node as any).type === "action") {
          const data: any = node.data || {};
          const defaults = {
            name: data.name ?? `${node.id}`,
            endpoint:
              data.endpoint ??
              "https://devapisuperapp.cbe.com.et/api/v1/cbesuperapp/cbe_to_cbe/account_lookup",
            method: data.method ?? "POST",
            apiBody:
              data.apiBody ?? { account_number: "{{vars.selectedAccount}}" },
            headers:
              data.headers ?? {
                Authorization: "Bearer {{vars.authToken}}",
                "Content-Type": "application/json",
                "X-Source": "ussd",
              },
            responseMapping:
              data.responseMapping ?? { balance: "{{response.data.data.balance}}" },
            persistResponseMapping:
              data.persistResponseMapping ?? true,
            outputVar: data.outputVar ?? "accountBalanceInfo",
            nextNode: data.nextNode ?? "displayBalance",
          };

          return {
            nodes: state.nodes.map((n) => (n.id === id ? { ...n, data: { ...data, ...defaults } } : n)),
            inspectorOpen: true,
            selectedNodeId: id,
            inspectorPosition: pos,
          };
        }

        return { inspectorOpen: true, selectedNodeId: id, inspectorPosition: pos };
      });
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
