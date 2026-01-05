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
    if (node.type === "start" || node.type === "group") return;
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
    .filter((node) => node.type !== "start" && node.type !== "group")
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
  isNameTaken: (name: string, excludeId?: string) => boolean;

  // Subflow / Grouping State
  currentSubflowId: string | null;
  enterSubflow: (groupId: string) => void;
  exitSubflow: () => void;
  groupNodes: (nodeIds: string[], name: string) => void;
  ungroupNodes: (groupId: string) => void;

  // Modal State
  namerModal: { isOpen: boolean; nodeIds: string[] } | null;
  openNamer: (nodeIds: string[]) => void;
  closeNamer: () => void;

  groupJsonModal: { isOpen: boolean; groupId: string | null; json: string } | null;
  openGroupJson: (groupId: string) => void;
  closeGroupJson: () => void;

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

      currentSubflowId: null,
      namerModal: null,
      groupJsonModal: null,

      setNodes: (nodes) => set({ nodes, flow: buildFlowJson(nodes) }),

      setEdges: (edges) => set({ edges }),

      rfInstance: null,
      setRfInstance: (instance) => set({ rfInstance: instance }),

      addNode: (node) =>
        set((state) => {
          const newNode = {
            ...node,
            parentNode: state.currentSubflowId || undefined,
            extent: state.currentSubflowId ? ("parent" as const) : undefined,
          };
          const nextNodes = [...state.nodes, newNode];
          return { nodes: nextNodes, flow: buildFlowJson(nextNodes) };
        }),

      removeNode: (id) =>
        set((state) => {
          // Recursive removal for groups
          const nodesToRemove = [id];
          const findChildren = (parentId: string) => {
            state.nodes.forEach((n) => {
              if (n.parentNode === parentId) {
                nodesToRemove.push(n.id);
                findChildren(n.id);
              }
            });
          };
          findChildren(id);

          const nextNodes = state.nodes.filter((n) => !nodesToRemove.includes(n.id));

          // If we are deleting the current subflow we are in, exit to main
          const nextSubflowId = nodesToRemove.includes(state.currentSubflowId || "")
            ? null
            : state.currentSubflowId;

          return {
            nodes: nextNodes,
            edges: state.edges.filter(
              (e) => !nodesToRemove.includes(e.source) && !nodesToRemove.includes(e.target)
            ),
            selectedNodeId: nodesToRemove.includes(state.selectedNodeId || "")
              ? null
              : state.selectedNodeId,
            currentSubflowId: nextSubflowId,
            flow: buildFlowJson(nextNodes),
          };
        }),

      setSelectedNodeId: (id) => set({ selectedNodeId: id }),

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
            const modalWidth = isAction ? 800 : 384;
            const modalHalf = modalWidth / 2;
            const modalHeightEstimate = isAction ? 600 : 360;
            const xCenter = rect.left + rect.width / 2;
            const x = Math.min(
              Math.max(xCenter, modalHalf + 16),
              window.innerWidth - modalHalf - 16
            );
            const margin = 12;
            const spaceAbove = rect.top;
            const spaceBelow = window.innerHeight - rect.bottom;

            if (spaceAbove > modalHeightEstimate + margin) {
              pos = { x, y: rect.top - margin, placement: "above" };
            } else if (spaceBelow > modalHeightEstimate + margin) {
              pos = { x, y: rect.bottom + margin, placement: "below" };
            } else {
              pos = {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                placement: "center",
              };
            }
          }

          set({ inspectorOpen: true, selectedNodeId: id, inspectorPosition: pos });
        } catch (e) {
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

      isNameTaken: (name, excludeId) => {
        const trimmed = name.trim().toLowerCase();
        if (!trimmed) return false;
        return get().nodes.some(
          (n) =>
            n.id !== excludeId &&
            n.type !== "start" &&
            String((n.data as Record<string, unknown>)?.name ?? "")
              .trim()
              .toLowerCase() === trimmed
        );
      },

      enterSubflow: (groupId) => set({ currentSubflowId: groupId, inspectorOpen: false }),
      exitSubflow: () => set({ currentSubflowId: null, inspectorOpen: false }),

      groupNodes: (nodeIds, name) => {
        const { nodes } = get();
        const selectedNodes = nodes.filter((n) => nodeIds.includes(n.id));
        if (selectedNodes.length < 2) return;

        // Calculate center for the group node
        const avgX = selectedNodes.reduce((acc, n) => acc + n.position.x, 0) / selectedNodes.length;
        const avgY = selectedNodes.reduce((acc, n) => acc + n.position.y, 0) / selectedNodes.length;

        const groupId = `group-${Date.now()}`;
        const newNode: Node = {
          id: groupId,
          type: "group",
          position: { x: avgX, y: avgY },
          data: { name: name || "New Group" },
          parentNode: get().currentSubflowId || undefined,
        };

        const updatedNodes = nodes.map((n) => {
          if (nodeIds.includes(n.id)) {
            return {
              ...n,
              position: { x: n.position.x - avgX, y: n.position.y - avgY },
              parentNode: groupId,
              extent: "parent" as const,
            };
          }
          return n;
        });

        const nextNodes = [...updatedNodes, newNode];
        set({
          nodes: nextNodes,
          flow: buildFlowJson(nextNodes),
          selectedNodeId: groupId,
        });
      },

      ungroupNodes: (groupId) => {
        const { nodes } = get();
        const groupNode = nodes.find((n) => n.id === groupId);
        if (!groupNode) return;

        const nextNodes = nodes
          .filter((n) => n.id !== groupId)
          .map((n) => {
            if (n.parentNode === groupId) {
              return {
                ...n,
                position: {
                  x: n.position.x + groupNode.position.x,
                  y: n.position.y + groupNode.position.y,
                },
                parentNode: undefined,
                extent: undefined,
              };
            }
            return n;
          });

        set({
          nodes: nextNodes,
          flow: buildFlowJson(nextNodes),
          selectedNodeId: null,
        });
      },

      openNamer: (nodeIds) => set({ namerModal: { isOpen: true, nodeIds } }),
      closeNamer: () => set({ namerModal: null }),

      openGroupJson: (groupId) => {
        const { nodes } = get();
        const children = nodes.filter((n) => n.parentNode === groupId);
        const subflowJson = buildFlowJson(children);
        set({
          groupJsonModal: {
            isOpen: true,
            groupId,
            json: JSON.stringify(subflowJson, null, 2),
          },
        });
      },
      closeGroupJson: () => set({ groupJsonModal: null }),
    }),
    {
      name: "ussd-menu-builder",
      storage: createJSONStorage(() => localStorage),
      // Update hydration to strip parentNode if needed (safety check from previous revert)
      onRehydrateStorage: (state) => {
        return (rehydratedState, error) => {
          if (error || !rehydratedState) return;
        };
      },
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        flow: state.flow,
      }),
    }
  )
);
