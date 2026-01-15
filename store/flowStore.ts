import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Node, Edge, ReactFlowInstance } from "reactflow";
import { createFlow } from "../lib/api";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

export type FlowRoute = {
  when?: Record<string, unknown>;
  gotoFlow?: string;
  goto?: string;
  gotoId?: string;
};

export type FlowNode = {
  id: string;
  name?: string;
  type: string;
  message?: string;
  persistByIndex?: boolean;
  persistSourceField?: string;
  persistFieldName?: string;
  validateIndexedList?: boolean;
  indexedListVar?: string;
  invalidInputMessage?: string;
  emptyInputMessage?: string;
  endpoint?: string;
  method?: string;
  dataSource?: string;
  field?: string;
  outputVar?: string;
  format?: "indexedList" | "singleValue";
  headers?: Record<string, unknown>;
  apiBody?: Record<string, unknown>;
  responseMapping?: Record<string, unknown>;
  persistResponseMapping?: boolean;
  nextNode?: string | { routes?: FlowRoute[]; default?: string; defaultId?: string };
  nextNodeId?: string;
};

export type FlowJson = {
  flowName: string;
  entryNode: string;
  entryNodeId: string;
  nodes: FlowNode[];
  visualState?: {
    nodes: Node[];
    edges: Edge[];
  };
};

const buildFlowJson = (nodes: Node[], edges: Edge[]): FlowJson => {
  const nameById = new Map<string, string>();
  const idByName = new Map<string, string>();
  const typeById = new Map<string, string>();

  nodes.forEach((node) => {
    if (node.type === "start") return;
    const name = String((node.data as Record<string, unknown>)?.name ?? "");
    typeById.set(node.id, node.type || "");
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
        const persistSourceField = String(data.persistSourceField ?? "");
        const persistFieldName = String(data.persistFieldName ?? "");
        const indexedListVar = String(data.indexedListVar ?? "");
        const invalidInputMessage = String(data.invalidInputMessage ?? "");
        const emptyInputMessage = String(data.emptyInputMessage ?? "");
        const promptExtras = {
          persistByIndex:
            typeof data.persistByIndex === "boolean" ? data.persistByIndex : undefined,
          persistSourceField: persistSourceField || undefined,
          persistFieldName: persistFieldName || undefined,
          validateIndexedList:
            typeof data.validateIndexedList === "boolean"
              ? data.validateIndexedList
              : undefined,
          indexedListVar: indexedListVar || undefined,
          invalidInputMessage: invalidInputMessage || undefined,
          emptyInputMessage: emptyInputMessage || undefined,
        };

        if (routingMode === "linear" && typeof nextNode === "string") {
          const resolved = resolveTarget(nextNode);
          return {
            ...base,
            message,
            ...promptExtras,
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
            const targetType = typeById.get(target.id);
            const isGroup = targetType === "group";

            return {
              when: route.when,
              [isGroup ? "gotoFlow" : "goto"]: target.name || route.gotoFlow || "",
              gotoId: target.id,
            } as FlowRoute;
          });
          const defaultResolved = resolveTarget(nextObj.default || "");
          return {
            ...base,
            message,
            ...promptExtras,
            nextNode: {
              routes,
              default: defaultResolved.name,
              defaultId: defaultResolved.id,
            },
          };
        }

        return { ...base, message, ...promptExtras };
      }

      if (node.type === "action") {
        const hasLocalSource = Boolean(data.dataSource) || Boolean(data.field) || Boolean(data.outputVar);
        const formatValue = data.format as "indexedList" | "singleValue" | undefined;
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
          dataSource: String(data.dataSource ?? ""),
          field: String(data.field ?? ""),
          outputVar: String(data.outputVar ?? ""),
          format: hasLocalSource ? formatValue || "indexedList" : formatValue,
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
    visualState: { nodes, edges },
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
  exitSubflow: (targetId?: string | null) => void;
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

  publishGroup: (groupId: string) => Promise<void>;

  loadAllFlows: () => Promise<void>;
  refreshFlow: (flowName: string, groupId: string) => Promise<void>;
  isLoading: boolean;
  publishedFlows: string[];
  clipboard: Node[] | null;
  copyNodes: (nodeIds: string[]) => void;
  pasteNodes: () => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
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
      isLoading: false,
      publishedFlows: [],
      clipboard: null,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      copyNodes: (nodeIds) => {
        const { nodes } = get();
        // Get primary selected nodes
        const selectedNodes = nodes.filter((n) => nodeIds.includes(n.id));

        // For each node, if it's a group, we need to grab all its descendants recursively
        const nodesToCopy = new Set<Node>();

        const addNodeAndChildren = (node: Node) => {
          nodesToCopy.add(node);
          if (node.type === "group") {
            const children = nodes.filter((n) => n.parentNode === node.id);
            children.forEach(addNodeAndChildren);
          }
        };

        selectedNodes.forEach(addNodeAndChildren);
        set({ clipboard: Array.from(nodesToCopy) });
        toast.success(`Copied ${selectedNodes.length} item(s)`);
      },

      pasteNodes: () => {
        const { clipboard, nodes, edges, addNode, currentSubflowId } = get();
        console.log("pasteNodes called", { clipboardLength: clipboard?.length });
        if (!clipboard || clipboard.length === 0) return;

        // Create a mapping from old ID to new ID
        const idMap = new Map<string, string>();
        const batchNames = new Set<string>();
        const resolvedNames = new Map<string, string>();

        // 1. First pass: Generate new IDs for all nodes
        clipboard.forEach(node => {
          idMap.set(node.id, uuidv4());
        });

        // Define getUniqueName helper function
        const getUniqueName = (baseName: string) => {
          if (!baseName) return "";

          // If we already resolved this specific name in this batch, return it
          if (resolvedNames.has(baseName)) {
            return resolvedNames.get(baseName)!;
          }

          // Strip existing " copy" or " copy N" suffix to get the true base
          // internal helper to parse: "Name copy 2" -> { base: "Name", suffixNum: 2 }
          // "Name copy" -> { base: "Name", suffixNum: 1 }
          // "Name" -> { base: "Name", suffixNum: 0 }
          const nameRegex = /^(.*?)(?: copy(?: (\d+))?)?$/;
          const match = baseName.match(nameRegex);

          let coreName = baseName;
          // If we matched a copy pattern, use the captured base
          if (match && match[1] && (baseName.endsWith(" copy") || / copy \d+$/.test(baseName))) {
            coreName = match[1];
          }

          let candidate = `${coreName} copy`;
          let counter = 2;

          // Helper to check if a name exists in:
          // 1. Current store nodes
          // 2. New nodes being created in this paste batch (to avoid collisions within the paste)
          const nameExists = (n: string) => {
            const inStore = nodes.some(node => {
              const d = node.data as Record<string, unknown>;
              return d.name === n || d.flowName === n;
            });
            const inBatch = batchNames.has(n);
            return inStore || inBatch;
          };

          // First try "Name copy"
          if (!nameExists(candidate)) {
            batchNames.add(candidate);
            resolvedNames.set(baseName, candidate);
            return candidate;
          }

          // Then try "Name copy 2", "Name copy 3", etc.
          while (true) {
            candidate = `${coreName} copy ${counter}`;
            if (!nameExists(candidate)) {
              batchNames.add(candidate);
              resolvedNames.set(baseName, candidate);
              return candidate;
            }
            counter++;
          }
        };

        // 2. Second pass: Create new nodes with updated IDs and Parent pointers
        const newNodes: Node[] = clipboard.map(node => {
          const newId = idMap.get(node.id)!;

          // Rename logic: Generate unique name with incremental suffix
          const oldData = node.data as Record<string, unknown>;
          const originalName = String(oldData.name ?? "");
          const originalFlowName = String(oldData.flowName ?? "");

          const newData = { ...oldData };
          if (originalName) newData.name = getUniqueName(originalName);
          if (originalFlowName) newData.flowName = getUniqueName(originalFlowName);

          // Handle parenting
          let newParentId = node.parentNode;

          // If the node's parent is ALSO in the clipboard, we map to the NEW parent ID
          if (node.parentNode && idMap.has(node.parentNode)) {
            newParentId = idMap.get(node.parentNode);
          } else {
            // Top-level relative to clipboard selection
            // If we are currently inside a subflow, paste inside it
            // BUT, if the user copied a whole group structure, the roots of that structure
            // should go into currentSubflowId.
            // If parentNode is undefined/null in clipboard, it goes to currentSubflowId.
            // If parentNode is NOT in clipboard, it means we copied a child without its parent?
            // -> In that case, we treat it as a new root in the current context.
            newParentId = currentSubflowId || undefined;
          }

          // Offset position slightly to show it's a copy
          // Only offset if it's a root of the paste operation (i.e. parent is not in clipboard)
          const position = { ...node.position };
          if (!node.parentNode || !idMap.has(node.parentNode)) {
            position.x += 20;
            position.y += 20;
          }

          return {
            ...node,
            id: newId,
            data: newData,
            parentNode: newParentId,
            position,
            selected: true, // Select the pasted nodes
            extent: newParentId ? "parent" : undefined
          };
        });

        // Deselect current nodes
        const deselectedNodes = nodes.map(n => ({ ...n, selected: false }));

        const finalNodes = [...deselectedNodes, ...newNodes];

        // We also need to copy internal edges if their source/target are both in clipboard
        // We find existing edges that connect nodes within the clipboard
        const internalEdges = edges.filter(e => idMap.has(e.source) && idMap.has(e.target));

        const newEdges = internalEdges.map(e => ({
          ...e,
          id: uuidv4(),
          source: idMap.get(e.source)!,
          target: idMap.get(e.target)!,
          selected: false
        }));

        set({
          nodes: finalNodes,
          edges: [...edges, ...newEdges],
          flow: buildFlowJson(finalNodes, [...edges, ...newEdges]),
          selectedNodeId: newNodes.length === 1 ? newNodes[0].id : null
        });

        toast.success("Pasted nodes");
      },

      loadAllFlows: async () => {
        set({ isLoading: true });
        try {
          // Dynamic import to avoid circular dependency loop if necessary, 
          // though currently api.ts doesn't import store.
          const { getAllFlows } = await import("../lib/api");
          const flows = await getAllFlows();

          let backendNodes: Node[] = [];
          let backendEdges: Edge[] = [];

          // Flatten all backend flows
          flows.forEach(f => {
            if (f.visualState) {
              backendNodes = [...backendNodes, ...f.visualState.nodes];
              backendEdges = [...backendEdges, ...f.visualState.edges];
            }
          });

          // Get current local state
          const { nodes: currentNodes, edges: currentEdges } = get();

          // Create Maps/Sets for fast lookup of current local items
          const currentNodeIds = new Set(currentNodes.map(n => n.id));
          const currentEdgeIds = new Set(currentEdges.map(e => e.id));

          // Filter backend items to ONLY those missing locally ("Local Wins")
          const newNodes = backendNodes.filter(bn => !currentNodeIds.has(bn.id));
          const newEdges = backendEdges.filter(be => !currentEdgeIds.has(be.id));

          if (newNodes.length === 0 && newEdges.length === 0) {
            // Even if nothing new, we might initially have empty state if it's a fresh load?
            // If currentNodes is empty, we effectively load everything.
            if (currentNodes.length === 0) {
              // Proceed with backend nodes as "new"
            } else {
              // Nothing to add
              // We still might want to re-calculate flow object just in case
            }
          }

          // Merge
          const mergedNodes = [...currentNodes, ...newNodes];
          const mergedEdges = [...currentEdges, ...newEdges];

          // Re-apply orphan fixing on the MERGED set (safety net)
          // We can reuse the existing logic but applied to the map of everything
          const nodeMap = new Map(mergedNodes.map(n => [n.id, n]));

          // Fix Orphan Nodes
          for (const [id, node] of nodeMap) {
            if (node.parentNode && !nodeMap.has(node.parentNode)) {
              const { parentNode, extent, position, ...rest } = node;
              let newPos = position;
              if (node.positionAbsolute) {
                newPos = { ...node.positionAbsolute };
              }
              nodeMap.set(id, {
                ...rest,
                id,
                position: newPos,
                parentNode: undefined,
                extent: undefined
              });
            }
          }

          const finalNodes = Array.from(nodeMap.values());
          // For edges, we just take the merged list.
          // We could dedupe edges too if needed, but the ID check above handles it?
          // Sometimes edge IDs might regenerate or differ? ReactFlow usually relies on ID.
          // Let's rely on ID uniqueness.

          // Combine names from existing published backend flows
          const backendNames = flows.map(f => f.flowName).filter(Boolean);

          set({
            nodes: finalNodes,
            edges: mergedEdges,
            flow: buildFlowJson(finalNodes, mergedEdges),
            publishedFlows: backendNames
          });

          toast.success(`Loaded flows: ${newNodes.length} new nodes added from backend.`);

        } catch (error) {
          console.error("Failed to load flows", error);
          toast.error("Failed to load flows from backend");
        } finally {
          set({ isLoading: false });
        }
      },

      refreshFlow: async (flowName: string, groupId: string) => {
        set({ isLoading: true });
        try {
          const { getFlowByName } = await import("../lib/api");
          const flowData = await getFlowByName(flowName);
          const flow = Array.isArray(flowData) ? flowData[0] : flowData;

          if (!flow || !flow.visualState) {
            toast.error(`Flow '${flowName}' not found or missing visual state.`);
            return;
          }

          const { nodes, edges } = get();

          // Actually, we only care about the direct children for the merge usually, 
          // but since the backend returns a flattened list of visualState, 
          // we should look at IDs.

          // 1. Keep ALL current nodes/edges (modified or not).
          // 2. Add ANY node/edge from backend that is NOT present locally.

          // We only care about nodes/edges relevant to this specific subflow/group context if we want to be strict,
          // OR we can just merge blindly if the backend visualState contains everything for that flow.
          // The backend usually returns the whole flow's nodes/edges.
          // BUT, we might be inside a "GroupNode" which corresponds to that Flow.

          // Backend Nodes for this flow
          const backendNodes = flow.visualState.nodes;
          const backendEdges = flow.visualState.edges;

          // Create Sets for fast lookup of existing local IDs
          const existingNodeIds = new Set(nodes.map(n => n.id));
          const existingEdgeIds = new Set(edges.map(e => e.id));

          // Find missing nodes (present in backend but not locally)
          // We need to be careful about parenting. 
          // If the backend node is a child of the flow's main group, we need to map that to our current `groupId`.
          // HOWEVER, usually when we "enter" a subflow, the nodes are children of that groupId.
          // The backend might store them with `parentNode: null` if it's a root flow there, 
          // OR `parentNode: 'some-group-id'` if it's a subflow.

          // If we are "refreshing" a flow that is embedded as a GroupNode (id=groupId),
          // the backend nodes for that flow likely don't know about our `groupId`.
          // We need to reparent them to `groupId`.

          const nodesToAdd = backendNodes
            .filter(bn => !existingNodeIds.has(bn.id))
            .map(bn => {
              // If the backend node is a "root" node in its own context, 
              // it should probably be a child of our `groupId` here.
              // But wait, if the backend flow IS the subflow, its nodes are likely root nodes relative to that flow.
              // So we should assign `parentNode: groupId`.

              // If the backend node ALREADY has a parent, we preserve strict hierarchy relative to the flow?
              // VisualState usually captures absolute structure. 
              // Let's assume for now we just want to bring them in.
              // If it's a flat flow being imported into a group:
              if (!bn.parentNode) {
                return { ...bn, parentNode: groupId, extent: 'parent' as const };
              }
              return bn;
            });

          const edgesToAdd = backendEdges.filter(be => !existingEdgeIds.has(be.id));

          if (nodesToAdd.length === 0 && edgesToAdd.length === 0) {
            toast.info("Flow is up to date. No new items from backend.");
          } else {
            const nextNodes = [...nodes, ...nodesToAdd];
            const nextEdges = [...edges, ...edgesToAdd];

            set({
              nodes: nextNodes,
              edges: nextEdges,
              flow: buildFlowJson(nextNodes, nextEdges)
            });
            toast.success(`Refreshed: Added ${nodesToAdd.length} nodes, ${edgesToAdd.length} edges.`);
          }

        } catch (error) {
          console.error("Failed to refresh flow", error);
          toast.error(`Failed to refresh flow '${flowName}'`);
        } finally {
          set({ isLoading: false });
        }
      },

      setNodes: (newNodes) =>
        set((state) => {
          const correctedNodes = newNodes.map((n) => {
            const existing = state.nodes.find((e) => e.id === n.id);
            if (existing?.parentNode && !n.parentNode && state.currentSubflowId) {
              return { ...n, parentNode: existing.parentNode, extent: existing.extent || "parent" };
            }
            return n;
          });
          return { nodes: correctedNodes, flow: buildFlowJson(correctedNodes, state.edges) };
        }),

      setEdges: (edges) => set((state) => ({ edges, flow: buildFlowJson(state.nodes, edges) })),

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
          return { nodes: nextNodes, flow: buildFlowJson(nextNodes, state.edges) };
        }),

      removeNode: (id) =>
        set((state) => {
          const nodesToRemoveIds = new Set<string>();
          nodesToRemoveIds.add(id);

          // Iterative approach to identify all descendants at any depth
          let changed = true;
          while (changed) {
            changed = false;
            state.nodes.forEach((n) => {
              if (n.parentNode && nodesToRemoveIds.has(n.parentNode)) {
                if (!nodesToRemoveIds.has(n.id)) {
                  nodesToRemoveIds.add(n.id);
                  changed = true;
                }
              }
            });
          }

          const nextNodes = state.nodes.filter((n) => !nodesToRemoveIds.has(n.id));

          // If we are deleting the current subflow we are in, exit to main
          const nextSubflowId = nodesToRemoveIds.has(state.currentSubflowId || "")
            ? null
            : state.currentSubflowId;

          const nextEdges = state.edges.filter(
            (e) => !nodesToRemoveIds.has(e.source) && !nodesToRemoveIds.has(e.target)
          );

          return {
            nodes: nextNodes,
            edges: nextEdges,
            selectedNodeId: nodesToRemoveIds.has(state.selectedNodeId || "")
              ? null
              : state.selectedNodeId,
            currentSubflowId: nextSubflowId,
            flow: buildFlowJson(nextNodes, nextEdges),
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
          let nextNodes = state.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...data } } : n
          );

          // PROPAGATION LOGIC: Sync names from PromptNode routes to connected Menu Branch Groups
          const targetNode = nextNodes.find((n) => n.id === id);
          if (targetNode && targetNode.type === "prompt" && data.nextNode) {
            const nextNode = data.nextNode as FlowNode["nextNode"];
            if (typeof nextNode === 'object' && nextNode && 'routes' in nextNode) {
              const routes = nextNode.routes || [];

              // For each route, check if it's connected to a Menu Branch Group
              routes.forEach((route, idx) => {
                const handleId = `route-${idx}`;
                const edge = state.edges.find(e => e.source === id && e.sourceHandle === handleId);

                if (edge) {
                  const connectedNode = nextNodes.find(n => n.id === edge.target);
                  if (connectedNode && connectedNode.type === 'group' && connectedNode.data.isMenuBranch) {
                    const when = route.when as { eq?: string[] } | undefined;
                    const newName = route.gotoFlow || when?.eq?.[1] || "Branch";

                    // Update Group Name in the nextNodes array
                    nextNodes = nextNodes.map(n => {
                      if (n.id === connectedNode.id) {
                        return { ...n, data: { ...n.data, name: newName } };
                      }
                      // Also update the internal Start Node's flowName
                      if (n.parentNode === connectedNode.id && n.type === 'start') {
                        return { ...n, data: { ...n.data, flowName: newName } };
                      }
                      return n;
                    });
                  } else if (connectedNode && connectedNode.type !== 'group') {
                    // NEW: Sync name for non-group nodes
                    const when = route.when as { eq?: string[] } | undefined;
                    const newName = route.gotoFlow || when?.eq?.[1] || "transfer";
                    nextNodes = nextNodes.map(n => {
                      if (n.id === connectedNode.id) {
                        return { ...n, data: { ...n.data, name: newName } };
                      }
                      return n;
                    });
                  }
                }
              });
            }
          }

          return { nodes: nextNodes, flow: buildFlowJson(nextNodes, state.edges) };
        }),

      isNameTaken: (name, excludeId) => {
        const trimmed = name.trim().toLowerCase();
        if (!trimmed) return false;

        const { nodes, currentSubflowId } = get();

        // Find the parent group of the node we're checking
        const targetNode = excludeId ? nodes.find(n => n.id === excludeId) : null;
        const parentId = targetNode ? targetNode.parentNode : currentSubflowId;

        return nodes.some(
          (n) =>
            n.id !== excludeId &&
            n.parentNode === parentId && // Must be in the same group
            n.type !== "group" && // Skip group nodes (as requested: group node can have any name)
            (
              // Check both standard 'name' and Start node's 'flowName'
              String((n.data as Record<string, unknown>)?.name ?? "").trim().toLowerCase() === trimmed ||
              String((n.data as Record<string, unknown>)?.flowName ?? "").trim().toLowerCase() === trimmed
            )
        );
      },

      enterSubflow: (groupId) => set({ currentSubflowId: groupId, inspectorOpen: false }),
      exitSubflow: (targetId) => {
        if (targetId !== undefined) {
          set({ currentSubflowId: targetId, inspectorOpen: false });
          return;
        }

        // Default behavior: go up one level
        const { nodes, currentSubflowId } = get();
        if (!currentSubflowId) return;

        const currentGroup = nodes.find((n) => n.id === currentSubflowId);
        const parentId = currentGroup?.parentNode || null;
        set({ currentSubflowId: parentId, inspectorOpen: false });
      },

      groupNodes: (nodeIds, name) => {
        const { nodes, rfInstance, edges } = get();

        // Handle Empty Group creation
        if (nodeIds.length === 0) {
          const groupId = `group-${Date.now()}`;

          // Get sensible default position
          let pos = { x: 100, y: 100 };
          if (rfInstance) {
            const center = rfInstance.project({
              x: window.innerWidth / 2,
              y: window.innerHeight / 2,
            });
            pos = center;
          }

          const newNode: Node = {
            id: groupId,
            type: "group",
            position: pos,
            data: { name: name || "Empty Group" },
            parentNode: get().currentSubflowId || undefined,
          };
          const nextNodes = [...nodes, newNode];
          set({ nodes: nextNodes, flow: buildFlowJson(nextNodes, edges), selectedNodeId: groupId });
          return;
        }

        const selectedNodes = nodes.filter((n) => nodeIds.includes(n.id));
        if (selectedNodes.length < 1) return; // Should not happen with current UI logic

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
          flow: buildFlowJson(nextNodes, edges),
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

        set((state) => ({
          nodes: nextNodes,
          flow: buildFlowJson(nextNodes, state.edges),
          selectedNodeId: null,
        }));
      },

      openNamer: (nodeIds) => set({ namerModal: { isOpen: true, nodeIds } }),
      closeNamer: () => set({ namerModal: null }),

      openGroupJson: (groupId) => {
        const { nodes, edges } = get();
        const children = nodes.filter((n) => n.parentNode === groupId);
        const childIds = children.map((n) => n.id);
        const relevantEdges = edges.filter(
          (e) => childIds.includes(e.source) && childIds.includes(e.target)
        );
        const subflowJson = buildFlowJson(children, relevantEdges);
        set({
          groupJsonModal: {
            isOpen: true,
            groupId,
            json: JSON.stringify(subflowJson, null, 2),
          },
        });
      },
      closeGroupJson: () => set({ groupJsonModal: null }),

      publishGroup: async (groupId: string) => {
        const { nodes, edges } = get();
        const children = nodes.filter((n) => n.parentNode === groupId);
        const childIds = children.map((n) => n.id);
        const relevantEdges = edges.filter(
          (e) => childIds.includes(e.source) && childIds.includes(e.target)
        );

        // Include the group node itself so visualState contains the grouping container
        const groupNode = nodes.find(n => n.id === groupId);
        // If group node exists, add it. Otherwise just use children.
        const nodesToSave = groupNode ? [...children, groupNode] : children;

        const subflowJson = buildFlowJson(nodesToSave, relevantEdges);

        try {
          // Verify we have a start node if we want it to be a valid flow
          if (!children.some(n => n.type === 'start')) {
            throw new Error("Cannot publish a group without a Start node.");
          }

          toast.promise(createFlow(subflowJson), {
            loading: 'Publishing to backend...',
            success: (data: unknown) => {
              // Add to published list
              const { publishedFlows } = get();
              // Extract name from current subflow json or just use the logic
              // The API usually returns the created flow. Assuming createFlow returns the flow object.
              // Let's verify start node name
              const startNode = nodesToSave.find(n => n.type === 'start');
              if (startNode) {
                const flowName = String((startNode.data as Record<string, unknown>)?.flowName || '');
                if (flowName && !publishedFlows.includes(flowName)) {
                  set({ publishedFlows: [...publishedFlows, flowName] });
                }
              }
              return 'Subflow published successfully!';
            },
            error: (err: unknown) => {
              const message = err instanceof Error ? err.message : 'Unknown error';
              return `Failed to publish: ${message}`;
            },
          });

        } catch (error: unknown) {
          if (typeof window !== 'undefined') {
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            alert(message);
          }
        }
      },
    }),
    {
      name: "ussd-menu-builder",
      storage: createJSONStorage(() => localStorage),
      // Update hydration to strip parentNode if needed (safety check from previous revert)
      onRehydrateStorage: (state) => {
        return (rehydratedState, error) => {
          if (error || !rehydratedState) return;
          rehydratedState.setHasHydrated(true);
        };
      },
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        flow: state.flow,
        publishedFlows: state.publishedFlows,
      }),
    }
  )
);
