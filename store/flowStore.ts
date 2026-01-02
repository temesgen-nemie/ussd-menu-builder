import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Node, Edge, ReactFlowInstance } from "reactflow";

type FlowRoute = {
  when?: Record<string, unknown>;
  goto?: string;
  gotoId?: string;
};

type FlowNode = {
  id: string;
  name?: string;
  type: string;
  message?: string;
  endpoint?: string;
  method?: string;
  headers?: Record<string, unknown>;
  apiBody?: Record<string, unknown>;
  responseMapping?: Record<string, unknown>;
  persistResponseMapping?: boolean;
  nextNode?: string | { routes?: FlowRoute[]; default?: string; defaultId?: string };
  nextNodeId?: string;
};

type FlowJson = {
  flowName: string;
  entryNode: string;
  entryNodeId: string;
  nodes: FlowNode[];
};

const buildFlowJson = (nodes: Node[]): FlowJson => {
  const nameById = new Map<string, string>();
  const idByName = new Map<string, string>();

  nodes.forEach((node) => {
    if (node.type === "start") return;
    const name = String((node.data as Record<string, unknown>)?.name ?? "");
    if (name) {
      nameById.set(node.id, name);
      idByName.set(name, node.id);
    }
  });

  const resolveTarget = (value?: string) => {
    if (!value) return { id: "", name: "" };
    if (nameById.has(value)) {
      return { id: value, name: nameById.get(value) || value };
    }
    if (idByName.has(value)) {
      return { id: idByName.get(value) || "", name: value };
    }
    return { id: "", name: value };
  };

  const startNode = nodes.find((node) => node.type === "start");
  const startData = (startNode?.data as Record<string, unknown>) || {};
  const flowName = String(startData.flowName ?? "");
  const entryNodeRaw = String(startData.entryNode ?? "");
  const entryResolved = resolveTarget(entryNodeRaw);

  const flowNodes: FlowNode[] = nodes
    .filter((node) => node.type !== "start")
    .map((node) => {
      const data = (node.data as Record<string, unknown>) || {};
      const base: FlowNode = {
        id: node.id,
        name: String(data.name ?? ""),
        type: String(node.type ?? ""),
      };

      if (node.type === "prompt") {
        const message = String(data.message ?? "");
        const routingMode = String(data.routingMode ?? "menu");
        const nextNode = data.nextNode;

        if (routingMode === "linear" && typeof nextNode === "string") {
          const resolved = resolveTarget(nextNode);
          return {
            ...base,
            message,
            nextNode: resolved.name,
            nextNodeId: resolved.id,
          };
        }

        if (nextNode && typeof nextNode === "object") {
          const nextObj = nextNode as {
            routes?: Array<{ when?: Record<string, unknown>; gotoFlow?: string }>;
            default?: string;
          };
          const routes = (nextObj.routes || []).map((route) => {
            const target = resolveTarget(route.gotoFlow || "");
            return {
              when: route.when,
              goto: target.name || route.gotoFlow || "",
              gotoId: target.id,
            };
          });
          const defaultResolved = resolveTarget(nextObj.default || "");
          return {
            ...base,
            message,
            nextNode: {
              routes,
              default: defaultResolved.name,
              defaultId: defaultResolved.id,
            },
          };
        }

        return { ...base, message };
      }

      if (node.type === "action") {
        const routes = ((data.routes as Array<{ condition?: string; nextNodeId?: string }>) || []).map(
          (route) => {
            let when: Record<string, unknown> | undefined;
            if (route.condition) {
              try {
                when = JSON.parse(route.condition) as Record<string, unknown>;
              } catch {
                when = { raw: route.condition };
              }
            }
            const target = resolveTarget(route.nextNodeId || "");
            return {
              when,
              goto: target.name,
              gotoId: target.id,
            };
          }
        );

        const defaultResolved = resolveTarget(String(data.nextNode ?? ""));

        return {
          ...base,
          endpoint: String(data.endpoint ?? ""),
          method: String(data.method ?? ""),
          headers: (data.headers as Record<string, unknown>) || undefined,
          apiBody: (data.apiBody as Record<string, unknown>) || undefined,
          responseMapping: (data.responseMapping as Record<string, unknown>) || undefined,
          persistResponseMapping: Boolean(data.persistResponseMapping),
          nextNode: {
            routes,
            default: defaultResolved.name,
            defaultId: defaultResolved.id,
          },
        };
      }

      return base;
    });

  return {
    flowName,
    entryNode: entryResolved.name,
    entryNodeId: entryResolved.id,
    nodes: flowNodes,
  };
};

interface FlowState {
  nodes: Node[];
  edges: Edge[];
  flow: FlowJson;
  selectedNodeId: string | null;
  inspectorOpen: boolean;
  inspectorPosition: {
    x: number;
    y: number;
    placement: "above" | "below" | "center";
  } | null;

  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  removeNode: (id: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  openInspector: (id: string) => void;
  closeInspector: () => void;
  setInspectorPosition: (
    pos: { x: number; y: number; placement: "above" | "below" | "center" } | null
  ) => void;
  updateNodeData: (id: string, data: Partial<Record<string, unknown>>) => void;

  rfInstance: ReactFlowInstance | null;
  setRfInstance: (instance: ReactFlowInstance) => void;
}

export const useFlowStore = create<FlowState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      flow: {
        flowName: "",
        entryNode: "",
        entryNodeId: "",
        nodes: [],
      },
      selectedNodeId: null,
      inspectorOpen: false,
      inspectorPosition: null,

      setNodes: (nodes) => set({ nodes, flow: buildFlowJson(nodes) }),

      setEdges: (edges) => set({ edges }),

      rfInstance: null,
      setRfInstance: (instance) => set({ rfInstance: instance }),

      addNode: (node) =>
        set((state) => {
          const nextNodes = [...state.nodes, node];
          return { nodes: nextNodes, flow: buildFlowJson(nextNodes) };
        }),

      removeNode: (id) =>
        set((state) => {
          const nextNodes = state.nodes.filter((n) => n.id !== id);
          return {
            nodes: nextNodes,
            edges: state.edges.filter((e) => e.source !== id && e.target !== id),
            selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
            flow: buildFlowJson(nextNodes),
          };
        }),

      setSelectedNodeId: (id) => set({ selectedNodeId: id }),

      // open the inspector and compute its approximate screen position based on the node element
      openInspector: (id) => {
        try {
          const node = get().nodes.find((n) => n.id === id);
          const isAction = node?.type === "action";

          const el = document.querySelector(
            `.react-flow__node[data-id="${id}"]`
          ) as HTMLElement | null;

          let pos: {
            x: number;
            y: number;
            placement: "above" | "below" | "center";
          } | null = null;
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
              pos = {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                placement: "center",
              };
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
        set((state) => {
          const nextNodes = state.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...data } } : n
          );
          return { nodes: nextNodes, flow: buildFlowJson(nextNodes) };
        }),
    }),
    {
      name: "ussd-menu-builder",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        flow: state.flow,
      }),
    }
  )
);
