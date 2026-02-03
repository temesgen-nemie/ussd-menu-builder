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
  toMainMenu?: boolean;
  isGoBack?: boolean;
  goBackTarget?: string;
  goBackToFlow?: string;
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
  persistInput?: boolean;
  persistInputAs?: string;
  endpoint?: string;
  method?: string;
  dataSource?: string;
  field?: string;
  outputVar?: string;
  fields?: string[];
  outputVars?: string[];
  format?: "indexedList" | "singleValue";
  headers?: Record<string, unknown>;
  apiBody?: Record<string, unknown>;
  responseMapping?: Record<string, unknown>;
  persistResponseMapping?: boolean;
  encryptInput?: boolean;
  responseType?: "CONTINUE" | "END";
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
  nextNode?:
  | string
  | { routes?: FlowRoute[]; default?: string; defaultId?: string };
  nextNodeId?: string;
  isMainMenu?: boolean;
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

/**
 * Traces up the parent hierarchy of a node to find the nearest ancestor
 * container that defines a flow (contains a Start node).
 * Returns both the groupId and the flowName.
 */
const getParentGroupInfo = (nodes: Node[], nodeId: string): { groupId: string, flowName: string } | null => {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return null;

  const parentId = node.parentNode;
  if (!parentId) return null;

  const children = nodes.filter(n => n.parentNode === parentId);
  const startNode = children.find(n => n.type === 'start');
  if (startNode) {
    return {
      groupId: parentId,
      flowName: (startNode.data.flowName as string) || ""
    };
  }

  // If not found in immediate parent, trace up recursively
  return getParentGroupInfo(nodes, parentId);
};

/**
 * Generates a stable JSON string of the logical structure of a group's flow.
 * Used for deep comparison (Smart Diff) to detect IF meaningful changes exist.
 */
const calculateFlowSnapshot = (groupId: string, nodes: Node[], edges: Edge[]): string => {
  const children = nodes.filter(n => n.parentNode === groupId);
  const childIds = new Set(children.map(n => n.id));
  const innerEdges = edges.filter(e => childIds.has(e.source) && childIds.has(e.target));

  const cleanNodes = children.map(n => {
    // Extract only logical data, ignoring internal React Flow props like width/height
    const { name, flowName, message, nextNode, nextNodeId, isMainMenu, isMenuBranch, ...otherData } = (n.data as Record<string, any>) || {};

    // We keep other data too but we want to be careful about what contributes to a "change"
    // For now, let's just use the whole data but remove known noisy fields if any
    const logicalData = { name, flowName, message, nextNode, nextNodeId, isMainMenu, isMenuBranch, ...otherData };

    return {
      id: n.id,
      type: n.type,
      data: logicalData,
      position: {
        x: Math.round(n.position.x),
        y: Math.round(n.position.y)
      }
    };
  }).sort((a, b) => a.id.localeCompare(b.id));

  const cleanEdges = innerEdges.map(e => ({
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle
  })).sort((a, b) => (a.source + a.target).localeCompare(b.source + b.target));

  return JSON.stringify({ nodes: cleanNodes, edges: cleanEdges });
};

const buildFlowJson = (nodes: Node[], edges: Edge[]): FlowJson => {
  const nameById = new Map<string, string>();
  const idByName = new Map<string, string>();
  const typeById = new Map<string, string>();

  nodes.forEach((node) => {
    if (node.type === "start") return;
    const name = String((node.data as Record<string, unknown>)?.name ?? "");
    typeById.set(node.id, node.type || "");
    // Always map ID to name (or empty string/Unnamed)
    nameById.set(node.id, name || "");
    if (name) {
      idByName.set(name, node.id);
    }
  });

  const resolveTarget = (value?: string | unknown) => {
    if (typeof value !== "string" || !value) return { id: "", name: "" };

    // 1. Check if the value is a known ID
    if (nameById.has(value)) {
      return { id: value, name: nameById.get(value) || "" };
    }

    // 2. Check if the value is a known Name
    if (idByName.has(value)) {
      return { id: idByName.get(value) || "", name: value };
    }

    // 3. Fallback: treat as name but ID unknown
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

      if (node.type === "prompt" && data.isMainMenu) {
        base.isMainMenu = true;
      }

      if (node.type === "prompt") {
        const message = String(data.message ?? "");
        const routingMode = String(data.routingMode ?? "linear");
        const nextNode = data.nextNode;
        const persistSourceField = String(data.persistSourceField ?? "");
        const persistFieldName = String(data.persistFieldName ?? "");
        const indexedListVar = String(data.indexedListVar ?? "");
        const invalidInputMessage = String(data.invalidInputMessage ?? "");
        const emptyInputMessage = String(data.emptyInputMessage ?? "");
        const promptExtras: Partial<FlowNode> = {
          persistByIndex:
            typeof data.persistByIndex === "boolean"
              ? data.persistByIndex
              : undefined,
          persistSourceField: persistSourceField || undefined,
          persistFieldName: persistFieldName || undefined,
          validateIndexedList:
            typeof data.validateIndexedList === "boolean"
              ? data.validateIndexedList
              : undefined,
          indexedListVar: indexedListVar || undefined,
          invalidInputMessage: invalidInputMessage || undefined,
          emptyInputMessage: emptyInputMessage || undefined,
          persistInput:
            typeof data.persistInput === "boolean"
              ? data.persistInput
              : undefined,
          persistInputAs: String(data.persistInputAs ?? "") || undefined,
          responseType: (data.responseType as any) || "CONTINUE",
          encryptInput:
            typeof data.encryptInput === "boolean"
              ? data.encryptInput
              : undefined,
          hasMultiplePage:
            typeof data.hasMultiplePage === "boolean"
              ? data.hasMultiplePage
              : undefined,
          indexPerPage:
            typeof data.indexPerPage === "number"
              ? data.indexPerPage
              : undefined,
          pagination: data.pagination
            ? {
              enabled: Boolean((data.pagination as any).enabled),
              actionNode: String((data.pagination as any).actionNode ?? ""),
              pageField: String((data.pagination as any).pageField ?? ""),
              totalPagesField: String((data.pagination as any).totalPagesField ?? ""),
              nextInput: String((data.pagination as any).nextInput ?? ""),
              prevInput: String((data.pagination as any).prevInput ?? ""),
              nextLabel: String((data.pagination as any).nextLabel ?? ""),
              prevLabel: String((data.pagination as any).prevLabel ?? ""),
              controlsVar: String((data.pagination as any).controlsVar ?? ""),
            }
            : undefined,
        };

        if (routingMode === "linear") {
          let targetStr = "";
          if (typeof nextNode === "string") {
            targetStr = nextNode;
          } else if (nextNode && typeof nextNode === "object") {
            targetStr = (nextNode as any).defaultId || (nextNode as any).default || "";
          }

          const resolved = resolveTarget(targetStr);
          const finalId = resolved.id || (targetStr && nameById.has(targetStr) ? targetStr : "") || targetStr || "";

          return {
            ...base,
            message,
            ...promptExtras,
            nextNode: resolved.name || "",
            nextNodeId: finalId,
          };
        }

        let routes: FlowRoute[] = [];
        let defaultName = "";
        let defaultId = "";

        if (nextNode && typeof nextNode === "object") {
          const nextObj = nextNode as {
            routes?: Array<{
              when?: Record<string, unknown>;
              gotoFlow?: string;
              goto?: string;
              gotoId?: string;
            }>;
            default?: string;
          };
          routes = (nextObj.routes || []).map((route) => {
            const r = route as any;
            const when = route.when;

            if (r.toMainMenu || r.isMainMenu) {
              return {
                when,
                toMainMenu: true,
              } as FlowRoute;
            }

            if (r.isGoBack) {
              const routeObj: FlowRoute = {
                when,
                goto: r.goBackTarget || r.gotoFlow || "",
                gotoId: "",
                isGoBack: true,
                goBackTarget: r.goBackTarget || "",
              };
              if (r.goBackToFlow && r.goBackToFlow !== flowName) {
                routeObj.goBackToFlow = r.goBackToFlow;
              }
              return routeObj;
            }

            const target = resolveTarget(route.gotoFlow || route.goto || "");
            const targetType = typeById.get(target.id);
            const isGroup = targetType === "group";

            return {
              when,
              [isGroup ? "gotoFlow" : "goto"]: target.name || "",
              gotoId: target.id || "",
            } as FlowRoute;
          });
          const defaultResolved = resolveTarget(nextObj.default || "");
          defaultName = defaultResolved.name || "";
          defaultId = defaultResolved.id || "";
        } else if (typeof nextNode === "string" && nextNode) {
          const resolved = resolveTarget(nextNode);
          defaultName = resolved.name || "";
          defaultId = resolved.id || "";
        }

        return {
          ...base,
          message,
          ...promptExtras,
          nextNode: {
            routes,
            default: defaultName,
            defaultId: defaultId,
          },
        };
      }

      if (node.type === "action") {
        const rawFields = Array.isArray(data.fields)
          ? data.fields
          : data.field
            ? [String(data.field)]
            : [];
        const rawOutputVars = Array.isArray(data.outputVars)
          ? data.outputVars
          : data.outputVar
            ? [String(data.outputVar)]
            : [];
        const fields = rawFields.map((value) => String(value ?? ""));
        const outputVars = (rawOutputVars.length ? rawOutputVars : fields).map(
          (value) => String(value ?? "")
        );

        const hasLocalSource =
          Boolean(data.dataSource) ||
          fields.length > 0 ||
          outputVars.length > 0 ||
          Boolean(data.field) ||
          Boolean(data.outputVar);
        const formatValue = data.format as
          | "indexedList"
          | "singleValue"
          | undefined;
        const routes = (
          (data.routes as Array<{ condition?: string; nextNodeId?: string }>) ||
          []
        ).map((route) => {
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
        });

        const nextNodeRaw = typeof data.nextNode === "string"
          ? data.nextNode
          : (data.nextNode && typeof data.nextNode === "object" ? (data.nextNode as any).default : "");
        const defaultResolved = resolveTarget(nextNodeRaw || "");

        return {
          ...base,
          endpoint: String(data.endpoint ?? ""),
          method: String(data.method ?? ""),
          dataSource: String(data.dataSource ?? ""),
          fields: fields.length > 0 ? fields : undefined,
          outputVars: outputVars.length > 0 ? outputVars : undefined,
          format: hasLocalSource ? formatValue || "indexedList" : formatValue,
          headers: (data.headers as Record<string, unknown>) || undefined,
          apiBody: (data.apiBody as Record<string, unknown>) || undefined,
          responseMapping: data.responseMapping
            ? Object.fromEntries(
              Object.entries(data.responseMapping as Record<string, string>).map(
                ([k, v]) => {
                  if (typeof v === "string") {
                    return [k, v];
                  }
                  return [k, v];
                }
              )
            )
            : undefined,
          persistResponseMappingKeys: (data.persistResponseMappingKeys as string[]) || undefined,
          encryptResponseMappingKeys: (data.encryptResponseMappingKeys as string[]) || undefined,
          nextNode: {
            routes,
            default: defaultResolved.name || "",
            defaultId: defaultResolved.id || "",
          },
        };
      }

      if (node.type === "condition") {
        interface ConditionRoute {
          when?: any;
          goto?: string;
        }
        interface ConditionNext {
          routes?: ConditionRoute[];
          default?: string;
        }
        const nextNode = data.nextNode as ConditionNext;
        const routesRaw = nextNode?.routes || [];

        const routes = routesRaw.map((route) => {
          const target = resolveTarget(route.goto || "");
          return {
            when: route.when,
            goto: target.name || ""
          };
        });

        const defaultTarget = resolveTarget(nextNode?.default || "");

        return {
          ...base,
          nextNode: {
            routes,
            default: defaultTarget.name || ""
          }
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

  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  addNode: (node: Node) => void;
  removeNode: (id: string) => void;
  removeNodes: (ids: string[]) => void;
  removeEdges: (ids: string[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  openInspector: (id: string) => void;
  closeInspector: () => void;
  setInspectorPosition: (
    pos: {
      x: number;
      y: number;
      placement: "above" | "below" | "center";
    } | null
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

  groupJsonModal: {
    isOpen: boolean;
    groupId: string | null;
    json: string;
  } | null;
  openGroupJson: (groupId: string) => void;
  closeGroupJson: () => void;
  applyGroupJson: (groupId: string, jsonText: string) => void;

  rfInstance: ReactFlowInstance | null;
  setRfInstance: (instance: ReactFlowInstance) => void;

  publishGroup: (groupId: string) => Promise<void>;

  loadAllFlows: () => Promise<void>;
  refreshFlow: (flowName: string, groupId: string) => Promise<void>;
  deletePublishedFlow: (flowName: string) => Promise<void>;
  syncNodeWithBackend: (nodeId: string, previousName?: string) => Promise<void>;
  isLoading: boolean;
  publishedGroupIds: string[];
  clipboard: Node[] | null;
  copyNodes: (nodeIds: string[]) => void;
  pasteNodes: () => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  modifiedGroupIds: string[];
  modifiedGroupsLog: Record<string, string[]>;
  lastSyncedSnapshots: Record<string, string>;
  updatePublishedFlow: (groupId: string) => Promise<void>;
  getRecursiveSubflowJson: (groupId: string) => string;
  importSubflow: (jsonText: string, position?: { x: number; y: number }) => void;

  // Refresh Confirmation Modal
  refreshConfirmModal: {
    isOpen: boolean;
    type: "global" | "group";
    flowName?: string;
    groupId?: string;
  };
  openRefreshConfirm: (type: "global" | "group", flowName?: string, groupId?: string) => void;
  closeRefreshConfirm: () => void;
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
      publishedGroupIds: [],
      modifiedGroupIds: [],
      modifiedGroupsLog: {},
      lastSyncedSnapshots: {},
      clipboard: null,
      _hasHydrated: false,

      refreshConfirmModal: {
        isOpen: false,
        type: "global",
      },
      openRefreshConfirm: (type, flowName, groupId) => set({
        refreshConfirmModal: { isOpen: true, type, flowName, groupId }
      }),
      closeRefreshConfirm: () => set({
        refreshConfirmModal: { isOpen: false, type: "global" }
      }),

      updatePublishedFlow: async (groupId: string) => {
        const { nodes, edges, modifiedGroupIds } = get();
        const children = nodes.filter((n) => n.parentNode === groupId);
        const childIds = children.map((n) => n.id);
        const relevantEdges = edges.filter(
          (e) => childIds.includes(e.source) && childIds.includes(e.target)
        );

        const groupNode = nodes.find((n) => n.id === groupId);
        const nodesToSave = groupNode ? [...children, groupNode] : children;
        const subflowJson = buildFlowJson(nodesToSave, relevantEdges);
        const flowName = subflowJson.flowName;

        if (!flowName) {
          toast.error("Flow name not found. Cannot update.");
          return;
        }

        try {
          const { updateFlow } = await import("../lib/api");
          toast.promise(updateFlow(flowName, subflowJson), {
            loading: `Updating flow '${flowName}'...`,
            success: () => {
              set({
                modifiedGroupIds: modifiedGroupIds.filter((id) => id !== groupId),
              });
              return `Flow '${flowName}' updated successfully!`;
            },
            error: (err: unknown) => {
              const message = err instanceof Error ? err.message : "Unknown error";
              return `Failed to update: ${message}`;
            },
          });
        } catch (error) {
          console.error("Failed to trigger update", error);
        }
      },
      getRecursiveSubflowJson: (groupId: string) => {
        const { nodes, edges } = get();
        const allDescendants: Node[] = [];

        const collectDescendants = (pid: string) => {
          const children = nodes.filter((n) => n.parentNode === pid);
          children.forEach((child) => {
            allDescendants.push(child);
            if (child.type === "group") {
              collectDescendants(child.id);
            }
          });
        };

        collectDescendants(groupId);

        const groupNode = nodes.find((n) => n.id === groupId);
        const nodesToExport = groupNode ? [groupNode, ...allDescendants] : allDescendants;
        const descendantIds = new Set(nodesToExport.map((n) => n.id));
        const relevantEdges = edges.filter(
          (e) => descendantIds.has(e.source) && descendantIds.has(e.target)
        );

        return JSON.stringify(buildFlowJson(nodesToExport, relevantEdges), null, 2);
      },
      importSubflow: (jsonText: string, position?: { x: number; y: number }) => {
        let parsed: FlowJson;
        try {
          parsed = JSON.parse(jsonText) as FlowJson;
        } catch {
          toast.error("Invalid JSON content.");
          return;
        }

        if (!parsed.visualState) {
          toast.error("JSON lacks visual layout data for import.");
          return;
        }

        const { nodes: currentNodes, edges: currentEdges, currentSubflowId } = get();
        const idMap = new Map<string, string>();

        parsed.visualState.nodes.forEach((n) => idMap.set(n.id, uuidv4()));

        const incomingIds = new Set(parsed.visualState.nodes.map((n) => n.id));
        const roots = parsed.visualState.nodes.filter(
          (n) => !n.parentNode || !incomingIds.has(n.parentNode)
        );

        let offsetX = 0;
        let offsetY = 0;
        if (position && roots.length > 0) {
          const avgX = roots.reduce((sum, n) => sum + n.position.x, 0) / roots.length;
          const avgY = roots.reduce((sum, n) => sum + n.position.y, 0) / roots.length;
          offsetX = position.x - avgX;
          offsetY = position.y - avgY;
        }

        const newNodes: Node[] = parsed.visualState.nodes.map((n) => {
          const isRoot = !n.parentNode || !incomingIds.has(n.parentNode);
          const newId = idMap.get(n.id)!;
          let parentNode = n.parentNode ? idMap.get(n.parentNode) : undefined;

          if (isRoot) parentNode = currentSubflowId ?? undefined;

          const data = { ...(n.data as Record<string, any>) };

          if (data.nextNode && typeof data.nextNode === "object") {
            if (data.nextNode.defaultId) data.nextNode.defaultId = idMap.get(data.nextNode.defaultId) || data.nextNode.defaultId;
            if (data.nextNode.routes) {
              data.nextNode.routes = data.nextNode.routes.map((r: any) => ({
                ...r,
                gotoId: idMap.get(r.gotoId) || r.gotoId
              }));
            }
          }
          if (data.routes) {
            data.routes = data.routes.map((r: any) => ({
              ...r,
              nextNodeId: idMap.get(r.nextNodeId) || r.nextNodeId
            }));
          }
          ["nextNodeId", "defaultId"].forEach(key => {
            if (data[key]) data[key] = idMap.get(data[key]) || data[key];
          });

          return {
            ...n,
            id: newId,
            parentNode,
            position: isRoot ? { x: n.position.x + offsetX, y: n.position.y + offsetY } : n.position,
            data,
            selected: false,
            extent: parentNode ? "parent" : undefined,
          } as Node;
        });

        const newEdges: Edge[] = parsed.visualState.edges
          .filter(e => idMap.has(e.source) && idMap.has(e.target))
          .map(e => ({
            ...e,
            id: uuidv4(),
            source: idMap.get(e.source)!,
            target: idMap.get(e.target)!,
            selected: false,
          }));

        set({
          nodes: [...currentNodes, ...newNodes],
          edges: [...currentEdges, ...newEdges],
        });

        toast.success(`Imported ${newNodes.length} nodes successfully.`);
      },

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
        console.log("pasteNodes called", {
          clipboardLength: clipboard?.length,
        });
        if (!clipboard || clipboard.length === 0) return;

        // Create a mapping from old ID to new ID
        const idMap = new Map<string, string>();
        const batchNames = new Set<string>();
        const resolvedNames = new Map<string, string>();

        // 1. First pass: Generate new IDs for all nodes
        clipboard.forEach((node) => {
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
          if (
            match &&
            match[1] &&
            (baseName.endsWith(" copy") || / copy \d+$/.test(baseName))
          ) {
            coreName = match[1];
          }

          let candidate = `${coreName} copy`;
          let counter = 2;

          // Helper to check if a name exists in:
          // 1. Current store nodes
          // 2. New nodes being created in this paste batch (to avoid collisions within the paste)
          const nameExists = (n: string) => {
            const inStore = nodes.some((node) => {
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
        const newNodes: Node[] = clipboard.map((node) => {
          const newId = idMap.get(node.id)!;

          // Rename logic: Generate unique name with incremental suffix
          const oldData = node.data as Record<string, unknown>;
          const originalName = String(oldData.name ?? "");
          const originalFlowName = String(oldData.flowName ?? "");

          const newData = { ...oldData };
          if (originalName) newData.name = getUniqueName(originalName);
          if (originalFlowName)
            newData.flowName = getUniqueName(originalFlowName);

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
            extent: newParentId ? "parent" : undefined,
          };
        });

        // Deselect current nodes
        const deselectedNodes = nodes.map((n) => ({ ...n, selected: false }));

        const finalNodes = [...deselectedNodes, ...newNodes];

        // We also need to copy internal edges if their source/target are both in clipboard
        // We find existing edges that connect nodes within the clipboard
        const internalEdges = edges.filter(
          (e) => idMap.has(e.source) && idMap.has(e.target)
        );

        const newEdges = internalEdges.map((e) => ({
          ...e,
          id: uuidv4(),
          source: idMap.get(e.source)!,
          target: idMap.get(e.target)!,
          selected: false,
        }));

        set({
          nodes: finalNodes,
          edges: [...edges, ...newEdges],
          flow: buildFlowJson(finalNodes, [...edges, ...newEdges]),
          selectedNodeId: newNodes.length === 1 ? newNodes[0].id : null,
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
          const allLogicalDataMap = new Map<string, FlowNode>();

          // Flatten all backend flows and collect logical data
          flows.forEach((f) => {
            if (f.visualState) {
              backendNodes = [...backendNodes, ...f.visualState.nodes];
              backendEdges = [...backendEdges, ...f.visualState.edges];
            }
            f.nodes.forEach(fn => allLogicalDataMap.set(fn.id, fn));
          });

          // Create Maps for fast lookup of backend items
          const backendNodeMap = new Map(backendNodes.map((n) => [n.id, n]));
          const backendEdgeMap = new Map(backendEdges.map((e) => [e.id, e]));

          // Get current local state
          const { nodes: currentNodes, edges: currentEdges } = get();

          // Merge Nodes:
          // 1. Update existing nodes with backend data (rehydrated)
          // STRICT SYNC: If a node is in a published group locally but NOT in the backend, discard it.
          const backendGroupIds = new Set(backendNodes.filter(n => n.type === 'group').map(n => n.id));

          const updatedNodes = currentNodes.reduce((acc, node) => {
            // Check if node is in a known backend group
            if (node.parentNode && backendGroupIds.has(node.parentNode)) {
              // If it's not in the backend map, it's a local stray in a published flow. Drop it.
              if (!backendNodeMap.has(node.id)) {
                return acc;
              }
            }

            const backendNode = backendNodeMap.get(node.id);
            if (backendNode) {
              const freshLogicalData = allLogicalDataMap.get(node.id);
              // Preserve important local UI state like selection
              acc.push({
                ...backendNode,
                data: { ...backendNode.data, ...freshLogicalData },
                selected: node.selected,
              } as Node);
            } else {
              acc.push(node);
            }
            return acc;
          }, [] as Node[]);

          // 2. Add nodes that are in backend but not present locally (rehydrated)
          const currentNodeIds = new Set(currentNodes.map((n) => n.id));
          const missingNodes = backendNodes
            .filter((bn) => !currentNodeIds.has(bn.id))
            .map(bn => {
              const freshLogicalData = allLogicalDataMap.get(bn.id);
              if (freshLogicalData) {
                return { ...bn, data: { ...bn.data, ...freshLogicalData } };
              }
              return bn;
            });

          const mergedNodes = [...updatedNodes, ...missingNodes];

          // Merge Edges:
          // 1. Update existing edges with backend data
          const updatedEdges = currentEdges.map((edge) => {
            const backendEdge = backendEdgeMap.get(edge.id);
            if (backendEdge) {
              return {
                ...backendEdge,
                selected: edge.selected,
              };
            }
            return edge;
          });

          // 2. Add edges that are in backend but not present locally
          const currentEdgeIds = new Set(currentEdges.map((e) => e.id));
          const missingEdges = backendEdges.filter((be) => !currentEdgeIds.has(be.id));

          const mergedEdges = [...updatedEdges, ...missingEdges];

          // Combine names from existing published backend flows
          const allBackendFlowNames = flows.map((f) => f.flowName).filter(Boolean);

          // Re-apply orphan fixing on the MERGED set (safety net)
          const nodeMap = new Map(mergedNodes.map((n) => [n.id, n]));

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
                extent: undefined,
              });
            }
          }

          const finalNodes = Array.from(nodeMap.values());

          // Identify group IDs for published flows
          const publishedGroupIdsFromBackend = flows.map(f => {
            if (!f.visualState) return null;
            const startNode = f.visualState.nodes.find(n => n.type === 'start');
            return startNode?.parentNode;
          }).filter((id): id is string => !!id);

          set({
            nodes: finalNodes,
            edges: mergedEdges,
            flow: buildFlowJson(finalNodes, mergedEdges),
            publishedGroupIds: publishedGroupIdsFromBackend,
            lastSyncedSnapshots: publishedGroupIdsFromBackend.reduce((acc, id) => {
              acc[id] = calculateFlowSnapshot(id, finalNodes, mergedEdges);
              return acc;
            }, {} as Record<string, string>),
            modifiedGroupIds: get().modifiedGroupIds.filter(groupId => {
              // 1. Must still exist in current nodes
              const nodeExists = finalNodes.some(n => n.id === groupId);
              if (!nodeExists) return false;

              // 2. Find the flow name for THIS group by looking at its own Start node
              const groupChildren = finalNodes.filter(n => n.parentNode === groupId);
              const startNode = groupChildren.find(n => n.type === 'start');
              const flowName = startNode?.data?.flowName;

              const allBackendFlowNames = flows.map(f => f.flowName);

              // If it's a known backend flow (published), check if it has local-only changes
              if (flowName && allBackendFlowNames.includes(flowName)) {
                // Determine if any node in this group is local-only
                const backendFlow = flows.find(f => f.flowName === flowName);
                const backendNodeIds = new Set(backendFlow?.visualState?.nodes.map(n => n.id) || []);
                const hasLocalOnly = groupChildren.some(n => !backendNodeIds.has(n.id));
                return hasLocalOnly;
              }

              return false;
            }),
            modifiedGroupsLog: {},
          });

          toast.success(
            `Loaded flows: ${missingNodes.length} new nodes added from backend.`
          );
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
            toast.error(
              `Flow '${flowName}' not found or missing visual state.`
            );
            return;
          }

          const { nodes, edges, publishedGroupIds } = get();

          // Create a Map of fresh logical data
          const logicalDataMap = new Map(flow.nodes.map(fn => [fn.id, fn]));

          // NON-RECURSIVE REFRESH: Only affect direct children of this group
          const directChildrenIds = new Set(nodes.filter(n => n.parentNode === groupId).map(n => n.id));

          // 1. Keep nodes that are NOT direct children of this group
          const otherNodes = nodes.filter(n => n.parentNode !== groupId);

          // 2. Identify local-only children (added locally, not in backend)
          const backendNodeIds = new Set(flow.visualState.nodes.map(bn => bn.id));
          const localOnlyChildren = nodes.filter(n => n.parentNode === groupId && !backendNodeIds.has(n.id));

          // 2. Prepare backend nodes (rehydrated from logical data)
          const backendGroupNode = flow.visualState.nodes.find(bn => bn.id === groupId);
          const nextFlowNodes = flow.visualState.nodes
            .filter(bn => bn.id !== groupId)
            .map(bn => {
              const freshLogicalData = logicalDataMap.get(bn.id);
              const parentNode = bn.parentNode || groupId;
              return {
                ...bn,
                data: { ...bn.data, ...freshLogicalData },
                parentNode,
                selected: false,
                extent: parentNode ? ("parent" as const) : undefined,
              } as Node;
            });

          // Sync the group node's own data with backend (e.g. if it was renamed)
          const finalOtherNodes = otherNodes.map(n => {
            if (n.id === groupId && backendGroupNode) {
              const freshLogicalData = logicalDataMap.get(n.id);
              return {
                ...n,
                data: { ...n.data, ...backendGroupNode.data, ...freshLogicalData }
              };
            }
            return n;
          });

          // 3. Handle Edges (Replace only edges where at least one end is a direct child)
          const otherEdges = edges.filter(e => !directChildrenIds.has(e.source) && !directChildrenIds.has(e.target));

          // STRICT SYNC: We do NOT include localOnlyChildren.
          // Local additions to a published flow are discarded on refresh to enforce backend state.
          const nextNodes = [...finalOtherNodes, ...nextFlowNodes];
          const nextEdges = [...otherEdges, ...flow.visualState.edges];

          // 4. Ensure this flow is marked as published in our local state
          let nextPublishedGroupIds = publishedGroupIds;
          if (groupId && !publishedGroupIds.includes(groupId)) {
            nextPublishedGroupIds = [...publishedGroupIds, groupId];
          }

          set({
            nodes: nextNodes,
            edges: nextEdges,
            flow: buildFlowJson(nextNodes, nextEdges),
            publishedGroupIds: nextPublishedGroupIds,
            lastSyncedSnapshots: {
              ...get().lastSyncedSnapshots,
              [groupId]: calculateFlowSnapshot(groupId, nextNodes, nextEdges),
            },
            // Since we hard-synced with backend, this group is no longer modified.
            modifiedGroupIds: get().modifiedGroupIds.filter(id => id !== groupId),
            modifiedGroupsLog: {
              ...get().modifiedGroupsLog,
              [groupId]: []
            }
          });

          toast.success(
            `Refreshed flow '${flowName}': Synchronized ${nextFlowNodes.length} nodes.`
          );
        } catch (error) {
          console.error("Failed to refresh flow", error);
          toast.error(`Failed to refresh flow '${flowName}'`);
        } finally {
          set({ isLoading: false });
        }
      },

      setNodes: (newNodesArg) =>
        set((state) => {
          const newNodes = typeof newNodesArg === 'function' ? newNodesArg(state.nodes) : newNodesArg;
          const correctedNodes = newNodes.map((n) => {
            const existing = state.nodes.find((e) => e.id === n.id);
            if (
              existing?.parentNode &&
              !n.parentNode &&
              state.currentSubflowId
            ) {
              return {
                ...n,
                parentNode: existing.parentNode,
                extent: existing.extent || "parent",
              };
            }
            return n;
          });

          // Change Detection: If any node moved, find its parent flow and mark as modified
          let nextModifiedGroupIds = [...state.modifiedGroupIds];
          let nextModifiedGroupsLog = { ...state.modifiedGroupsLog };

          // Identify which groups have moving nodes
          const affectedGroupIds = new Set<string>();
          correctedNodes.forEach((n) => {
            const existing = state.nodes.find((e) => e.id === n.id);
            if (existing && (existing.position.x !== n.position.x || existing.position.y !== n.position.y)) {
              const info = getParentGroupInfo(state.nodes, n.id);
              if (info && state.publishedGroupIds.includes(info.groupId)) {
                affectedGroupIds.add(info.groupId);
              }
            }
          });

          affectedGroupIds.forEach(groupId => {
            const currentSnapshot = calculateFlowSnapshot(groupId, correctedNodes, state.edges);
            const originalSnapshot = state.lastSyncedSnapshots[groupId];
            const isActuallyModified = currentSnapshot !== originalSnapshot;

            if (isActuallyModified) {
              if (!nextModifiedGroupIds.includes(groupId)) {
                nextModifiedGroupIds.push(groupId);
              }
              const groupLog = nextModifiedGroupsLog[groupId] || [];
              if (!groupLog.includes("Layout modified")) {
                groupLog.push("Layout modified");
              }
              nextModifiedGroupsLog[groupId] = groupLog;
            } else {
              nextModifiedGroupIds = nextModifiedGroupIds.filter(id => id !== groupId);
              nextModifiedGroupsLog[groupId] = [];
            }
          });

          return {
            nodes: correctedNodes,
            flow: buildFlowJson(correctedNodes, state.edges),
            modifiedGroupIds: nextModifiedGroupIds,
            modifiedGroupsLog: nextModifiedGroupsLog,
          };
        }),

      setEdges: (edges) =>
        set((state) => {
          const nextEdges = typeof edges === 'function' ? edges(state.edges) : edges;
          const currentNodes = state.nodes;

          let nextModifiedGroupIds = [...state.modifiedGroupIds];
          let nextModifiedGroupsLog = { ...state.modifiedGroupsLog };

          // Determine which groups might be affected by edge changes
          const affectedGroupIds = new Set<string>();
          const allEdges = [...state.edges, ...nextEdges];
          allEdges.forEach(e => {
            const infoS = getParentGroupInfo(currentNodes, e.source);
            const infoT = getParentGroupInfo(currentNodes, e.target);
            if (infoS && state.publishedGroupIds.includes(infoS.groupId)) affectedGroupIds.add(infoS.groupId);
            if (infoT && state.publishedGroupIds.includes(infoT.groupId)) affectedGroupIds.add(infoT.groupId);
          });

          affectedGroupIds.forEach(groupId => {
            const currentSnapshot = calculateFlowSnapshot(groupId, currentNodes, nextEdges);
            const originalSnapshot = state.lastSyncedSnapshots[groupId];
            const isActuallyModified = currentSnapshot !== originalSnapshot;

            if (isActuallyModified) {
              if (!nextModifiedGroupIds.includes(groupId)) {
                nextModifiedGroupIds.push(groupId);
              }
              const groupLog = nextModifiedGroupsLog[groupId] || [];
              if (!groupLog.includes("Connections modified")) {
                groupLog.push("Connections modified");
              }
              nextModifiedGroupsLog[groupId] = groupLog;
            } else {
              nextModifiedGroupIds = nextModifiedGroupIds.filter(id => id !== groupId);
              nextModifiedGroupsLog[groupId] = [];
            }
          });

          return {
            edges: nextEdges,
            flow: buildFlowJson(currentNodes, nextEdges),
            modifiedGroupIds: nextModifiedGroupIds,
            modifiedGroupsLog: nextModifiedGroupsLog
          };
        }),

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

          // Tracking modifications
          let nextModifiedGroupIds = state.modifiedGroupIds;
          let nextModifiedGroupsLog = { ...state.modifiedGroupsLog };
          if (state.currentSubflowId) {
            const info = getParentGroupInfo(nextNodes, newNode.id);
            if (info && state.publishedGroupIds.includes(info.groupId)) {
              const currentSnapshot = calculateFlowSnapshot(info.groupId, nextNodes, state.edges);
              const originalSnapshot = state.lastSyncedSnapshots[info.groupId];
              const isActuallyModified = currentSnapshot !== originalSnapshot;

              if (isActuallyModified) {
                if (!nextModifiedGroupIds.includes(info.groupId)) {
                  nextModifiedGroupIds = [...nextModifiedGroupIds, info.groupId];
                }
                const groupLog = nextModifiedGroupsLog[info.groupId] || [];
                const nodeName = newNode.data?.name || newNode.data?.flowName || newNode.type;
                const newEntry = `Added ${newNode.type} node "${nodeName}"`;
                if (!groupLog.includes(newEntry)) {
                  nextModifiedGroupsLog[info.groupId] = [...groupLog, newEntry];
                }
              } else {
                nextModifiedGroupIds = nextModifiedGroupIds.filter(id => id !== info.groupId);
                nextModifiedGroupsLog[info.groupId] = []; // Clear log if we returned to sync state
              }
            }
          }

          return {
            nodes: nextNodes,
            flow: buildFlowJson(nextNodes, state.edges),
            modifiedGroupIds: nextModifiedGroupIds,
            modifiedGroupsLog: nextModifiedGroupsLog,
          };
        }),

      removeNode: (id) => get().removeNodes([id]),

      removeNodes: (ids) =>
        set((state) => {
          const nodesToRemoveIds = new Set<string>(ids);

          // Identify all flows that might be modified BEFORE removing nodes
          const groupIdsToMark = new Set<string>();
          ids.forEach((id) => {
            const node = state.nodes.find((n) => n.id === id);
            if (node?.parentNode) {
              const info = getParentGroupInfo(state.nodes, node.id);
              if (info && state.publishedGroupIds.includes(info.groupId)) {
                groupIdsToMark.add(info.groupId);
              }
            }
          });

          // Iterative approach to identify all descendants at any depth for all starting IDs
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

          // ------------------------------------------------------------------
          // CLEANUP DATA: Clear references in source nodes pointing to deleted nodes
          // ------------------------------------------------------------------
          const edgesToRemove = state.edges.filter(
            (e) => nodesToRemoveIds.has(e.target) && !nodesToRemoveIds.has(e.source)
          );

          // We need a map to update nodes efficiently before filtering
          const nodeMap = new Map(state.nodes.map((n) => [n.id, n]));

          const updateNodeDataLocal = (
            nodeId: string,
            updater: (data: Record<string, unknown>) => Record<string, unknown>
          ) => {
            const node = nodeMap.get(nodeId);
            if (!node) return;
            const currentData = (node.data as Record<string, unknown>) || {};
            const nextData = updater(currentData);
            if (nextData === currentData) return;
            nodeMap.set(nodeId, { ...node, data: nextData });
          };

          edgesToRemove.forEach((edge) => {
            const sourceNode = nodeMap.get(edge.source);
            if (!sourceNode) return;

            const handle = edge.sourceHandle || "";

            // Action Node Cleanup
            if (sourceNode.type === "action") {
              if (!handle || handle === "default") {
                updateNodeDataLocal(sourceNode.id, (data) => ({ ...data, nextNode: "" }));
              } else {
                updateNodeDataLocal(sourceNode.id, (data) => {
                  const routes = Array.isArray(data.routes) ? [...data.routes] : [];
                  const idx = routes.findIndex((r: any) => r?.id === handle);
                  if (idx === -1) return data;
                  routes[idx] = { ...routes[idx], nextNodeId: "" };
                  return { ...data, routes };
                });
              }
            }
            // Prompt Node Cleanup
            else if (sourceNode.type === "prompt") {
              if (handle.startsWith("route-")) {
                const routeIdx = parseInt(handle.split("-")[1], 10);
                if (!Number.isNaN(routeIdx)) {
                  updateNodeDataLocal(sourceNode.id, (data) => {
                    const nextNode = data.nextNode as { routes?: any[] } | string | undefined;
                    if (!nextNode || typeof nextNode !== "object" || !nextNode.routes) return data;
                    const routes = [...nextNode.routes];
                    if (!routes[routeIdx]) return data;
                    // PRESERVE gotoFlow (name), only clear the ID reference
                    routes[routeIdx] = { ...routes[routeIdx], gotoId: "" };
                    return { ...data, nextNode: { ...nextNode, routes } };
                  });
                }
              } else {
                updateNodeDataLocal(sourceNode.id, (data) => ({ ...data, nextNode: "" }));
              }
            }
            // Condition Node Cleanup
            else if (sourceNode.type === "condition") {
              if (!handle || handle === "default") {
                updateNodeDataLocal(sourceNode.id, (data) => {
                  const nextNode = (data.nextNode as { routes?: any[]; default?: string }) || {};
                  return { ...data, nextNode: { ...nextNode, default: "" } };
                });
              } else if (handle.startsWith("route-")) {
                const routeIdx = parseInt(handle.split("-")[1], 10);
                if (!Number.isNaN(routeIdx)) {
                  updateNodeDataLocal(sourceNode.id, (data) => {
                    const nextNode = data.nextNode as { routes?: any[]; default?: string } | undefined;
                    if (!nextNode || !nextNode.routes) return data;
                    const routes = [...nextNode.routes];
                    if (!routes[routeIdx]) return data;
                    routes[routeIdx] = { ...routes[routeIdx], goto: "" };
                    return { ...data, nextNode: { ...nextNode, routes } };
                  });
                }
              }
            }
            // Start Node Cleanup
            else if (sourceNode.type === "start") {
              updateNodeDataLocal(sourceNode.id, (data) => ({ ...data, entryNode: "" }));
            }
          });

          // Use the updated nodeMap values for the nextNodes list
          const nextNodes = Array.from(nodeMap.values()).filter(
            (n) => !nodesToRemoveIds.has(n.id)
          );

          // If we are deleting the current subflow we are in, exit to main
          const nextSubflowId = nodesToRemoveIds.has(
            state.currentSubflowId || ""
          )
            ? null
            : state.currentSubflowId;

          const nextEdges = state.edges.filter(
            (e) =>
              !nodesToRemoveIds.has(e.source) && !nodesToRemoveIds.has(e.target)
          );

          let nextModifiedGroupIds = [...state.modifiedGroupIds];
          let nextModifiedGroupsLog = { ...state.modifiedGroupsLog };

          groupIdsToMark.forEach((groupId) => {
            const currentSnapshot = calculateFlowSnapshot(groupId, nextNodes, nextEdges);
            const originalSnapshot = state.lastSyncedSnapshots[groupId];
            const isActuallyModified = currentSnapshot !== originalSnapshot;

            if (isActuallyModified) {
              if (!nextModifiedGroupIds.includes(groupId)) {
                nextModifiedGroupIds.push(groupId);
              }
              // Log deletions
              const groupLog = nextModifiedGroupsLog[groupId] || [];
              ids.forEach(id => {
                const node = state.nodes.find(n => n.id === id);
                if (node) {
                  const nodeName = node.data?.name || node.data?.flowName || node.type;
                  const newEntry = `Deleted ${node.type} node "${nodeName}"`;
                  if (!groupLog.includes(newEntry)) {
                    groupLog.push(newEntry);
                  }
                }
              });
              nextModifiedGroupsLog[groupId] = [...groupLog];
            } else {
              nextModifiedGroupIds = nextModifiedGroupIds.filter(id => id !== groupId);
              nextModifiedGroupsLog[groupId] = []; // Clear log if we returned to sync state
            }
          });

          return {
            nodes: nextNodes,
            edges: nextEdges,
            selectedNodeId: nodesToRemoveIds.has(state.selectedNodeId || "")
              ? null
              : state.selectedNodeId,
            currentSubflowId: nextSubflowId,
            flow: buildFlowJson(nextNodes, nextEdges),
            modifiedGroupIds: nextModifiedGroupIds.filter(id => !nodesToRemoveIds.has(id)),
            modifiedGroupsLog: nextModifiedGroupsLog,
          };
        }),

      removeEdges: (ids) =>
        set((state) => {
          const edgeIdsToRemove = new Set(ids);
          const edgesToRemove = state.edges.filter((e) => edgeIdsToRemove.has(e.id));
          if (edgesToRemove.length === 0) {
            return {
              edges: state.edges,
              flow: buildFlowJson(state.nodes, state.edges),
            };
          }

          const nodeMap = new Map(state.nodes.map((n) => [n.id, n]));
          let nextModifiedGroupIds = [...state.modifiedGroupIds];

          const markGroupModified = (nodeId: string) => {
            const info = getParentGroupInfo(state.nodes, nodeId);
            if (
              info &&
              state.publishedGroupIds.includes(info.groupId) &&
              !nextModifiedGroupIds.includes(info.groupId)
            ) {
              nextModifiedGroupIds.push(info.groupId);
            }
          };

          const updateNodeDataLocal = (
            nodeId: string,
            updater: (data: Record<string, unknown>) => Record<string, unknown>
          ) => {
            const node = nodeMap.get(nodeId);
            if (!node) return;
            const currentData = (node.data as Record<string, unknown>) || {};
            const nextData = updater(currentData);
            if (nextData === currentData) return;
            nodeMap.set(nodeId, { ...node, data: nextData });
          };

          edgesToRemove.forEach((edge) => {
            const sourceNode = nodeMap.get(edge.source);
            if (!sourceNode) return;

            markGroupModified(edge.source);
            markGroupModified(edge.target);

            const handle = edge.sourceHandle || "";

            if (sourceNode.type === "action") {
              if (!handle || handle === "default") {
                updateNodeDataLocal(sourceNode.id, (data) => ({
                  ...data,
                  nextNode: "",
                }));
              } else {
                updateNodeDataLocal(sourceNode.id, (data) => {
                  const routes = Array.isArray(data.routes) ? [...data.routes] : [];
                  const idx = routes.findIndex((r: any) => r?.id === handle);
                  if (idx === -1) return data;
                  routes[idx] = { ...routes[idx], nextNodeId: "" };
                  return { ...data, routes };
                });
              }
              return;
            }

            if (sourceNode.type === "prompt") {
              if (handle.startsWith("route-")) {
                const routeIdx = parseInt(handle.split("-")[1], 10);
                if (Number.isNaN(routeIdx)) return;
                updateNodeDataLocal(sourceNode.id, (data) => {
                  const nextNode = data.nextNode as { routes?: any[] } | string | undefined;
                  if (!nextNode || typeof nextNode !== "object" || !nextNode.routes) return data;
                  const routes = [...nextNode.routes];
                  if (!routes[routeIdx]) return data;
                  // PRESERVE gotoFlow (name), only clear the ID reference
                  routes[routeIdx] = { ...routes[routeIdx], gotoId: "" };
                  return { ...data, nextNode: { ...nextNode, routes } };
                });
              } else {
                updateNodeDataLocal(sourceNode.id, (data) => ({
                  ...data,
                  nextNode: "",
                }));
              }
              return;
            }

            if (sourceNode.type === "condition") {
              if (!handle || handle === "default") {
                updateNodeDataLocal(sourceNode.id, (data) => {
                  const nextNode = (data.nextNode as { routes?: any[]; default?: string }) || {};
                  return { ...data, nextNode: { ...nextNode, default: "" } };
                });
              } else if (handle.startsWith("route-")) {
                const routeIdx = parseInt(handle.split("-")[1], 10);
                if (Number.isNaN(routeIdx)) return;
                updateNodeDataLocal(sourceNode.id, (data) => {
                  const nextNode = data.nextNode as { routes?: any[]; default?: string } | undefined;
                  if (!nextNode || !nextNode.routes) return data;
                  const routes = [...nextNode.routes];
                  if (!routes[routeIdx]) return data;
                  routes[routeIdx] = { ...routes[routeIdx], goto: "" };
                  return { ...data, nextNode: { ...nextNode, routes } };
                });
              }
              return;
            }

            if (sourceNode.type === "start") {
              updateNodeDataLocal(sourceNode.id, (data) => ({
                ...data,
                entryNode: "",
              }));
            }
          });

          const nextNodes = state.nodes.map((n) => nodeMap.get(n.id) || n);
          const nextEdges = state.edges.filter((e) => !edgeIdsToRemove.has(e.id));

          return {
            nodes: nextNodes,
            edges: nextEdges,
            flow: buildFlowJson(nextNodes, nextEdges),
            modifiedGroupIds: nextModifiedGroupIds,
          };
        }),

      setSelectedNodeId: (id) => set({ selectedNodeId: id }),

      openInspector: (id) => {
        try {
          const node = get().nodes.find((n) => n.id === id);
          const isLarge = node?.type === "action" || node?.type === "prompt" || node?.type === "condition";

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
            const modalWidth = isLarge ? 720 : 350;
            const modalHalf = modalWidth / 2;
            const modalHeightEstimate = isLarge ? 500 : 320;
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

          set({
            inspectorOpen: true,
            selectedNodeId: id,
            inspectorPosition: pos,
          });
        } catch (e) {
          set({
            inspectorOpen: true,
            selectedNodeId: id,
            inspectorPosition: null,
          });
        }
      },

      closeInspector: () =>
        set({ inspectorOpen: false, inspectorPosition: null }),

      setInspectorPosition: (pos) => set({ inspectorPosition: pos }),

      updateNodeData: (id, data: Partial<Record<string, unknown>>) =>
        set((state) => {
          let nextNodes = state.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...data } } : n
          );

          // Identify if this node belongs to a published flow
          let groupIdToMark: string | null = null;
          const node = state.nodes.find(n => n.id === id);
          if (node?.parentNode) {
            const info = getParentGroupInfo(state.nodes, node.id);
            if (info && state.publishedGroupIds.includes(info.groupId)) {
              groupIdToMark = info.groupId;
            }
          }

          // PROPAGATION LOGIC: Sync names from PromptNode routes to connected Menu Branch Groups
          const targetNode = nextNodes.find((n) => n.id === id);
          if (!targetNode) return state;

          // SYNC LOGIC: Bi-directional name sync between Group and Start node
          if (targetNode.type === "start" && data.flowName !== undefined) {
            if (targetNode.parentNode) {
              nextNodes = nextNodes.map((n) =>
                n.id === targetNode.parentNode ? { ...n, data: { ...n.data, name: String(data.flowName) } } : n
              );
            }
          } else if (targetNode.type === "group" && data.name !== undefined) {
            nextNodes = nextNodes.map((n) =>
              n.parentNode === targetNode.id && n.type === "start"
                ? { ...n, data: { ...n.data, flowName: String(data.name) } }
                : n
            );
          }

          // PROPAGATION LOGIC: Sync names from PromptNode routes to connected Menu Branch Groups
          if (targetNode.type === "prompt" && data.nextNode) {
            const nextNode = data.nextNode as FlowNode["nextNode"];
            if (typeof nextNode === "object" && nextNode && "routes" in nextNode) {
              const routes = nextNode.routes || [];

              // For each route, check if it's connected to a Menu Branch Group
              routes.forEach((route, idx) => {
                const handleId = `route-${idx}`;
                const edge = state.edges.find(
                  (e) => e.source === id && e.sourceHandle === handleId
                );

                if (edge) {
                  const connectedNode = nextNodes.find(
                    (n) => n.id === edge.target
                  );
                  if (
                    connectedNode &&
                    connectedNode.type === "group" &&
                    connectedNode.data.isMenuBranch
                  ) {
                    const when = route.when as { eq?: string[] } | undefined;
                    const newName =
                      route.gotoFlow || when?.eq?.[1] || "Branch";

                    // Update Group Name in the nextNodes array
                    nextNodes = nextNodes.map((n) => {
                      if (n.id === connectedNode.id) {
                        return { ...n, data: { ...n.data, name: newName } };
                      }
                      // Also update the internal Start Node's flowName
                      if (
                        n.parentNode === connectedNode.id &&
                        n.type === "start"
                      ) {
                        return { ...n, data: { ...n.data, flowName: newName } };
                      }
                      return n;
                    });
                  } else if (connectedNode && connectedNode.type !== "group") {
                    // NEW: Sync name for non-group nodes
                    const when = route.when as { eq?: string[] } | undefined;
                    const newName = route.gotoFlow || when?.eq?.[1];

                    if (!newName) {
                      toast.error("Invalid Branch", {
                        description: "Please define a name in the branch.",
                        duration: 4000
                      });
                      return;
                    }

                    nextNodes = nextNodes.map((n) => {
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

          let nextModifiedGroupIds = state.modifiedGroupIds;
          let nextModifiedGroupsLog = { ...state.modifiedGroupsLog };

          if (groupIdToMark) {
            const currentSnapshot = calculateFlowSnapshot(groupIdToMark, nextNodes, state.edges);
            const originalSnapshot = state.lastSyncedSnapshots[groupIdToMark];
            const isActuallyModified = currentSnapshot !== originalSnapshot;

            if (isActuallyModified) {
              if (!nextModifiedGroupIds.includes(groupIdToMark)) {
                nextModifiedGroupIds = [...nextModifiedGroupIds, groupIdToMark];
              }
              const groupLog = nextModifiedGroupsLog[groupIdToMark] || [];
              const nodeName = targetNode.data?.name || targetNode.data?.flowName || targetNode.type;

              // Diff Helper: Compare against original snapshot if available
              let originalNodeData: any = {};
              try {
                const originalSnapshotStr = state.lastSyncedSnapshots[groupIdToMark];
                if (originalSnapshotStr) {
                  const originalSnapshot = JSON.parse(originalSnapshotStr);
                  const originalNode = originalSnapshot.nodes.find((n: any) => n.id === targetNode.id);
                  if (originalNode) originalNodeData = originalNode.data;
                }
              } catch (e) { }

              const tr = (v: any) => {
                const s = typeof v === 'string' ? v : JSON.stringify(v);
                return s.length > 25 ? s.substring(0, 25) + "..." : s;
              };

              Object.entries(data).forEach(([key, newValue]) => {
                const oldValue = originalNodeData[key];
                if (oldValue !== newValue) {
                  const diffText = oldValue !== undefined ? `"${tr(oldValue)}" → "${tr(newValue)}"` : `"${tr(newValue)}"`;
                  const logPrefix = `Updated ${targetNode.type} node "${nodeName}" (${key})`;
                  const newEntry = `${logPrefix}: ${diffText}`;

                  const existingIdx = groupLog.findIndex(l => l.startsWith(logPrefix));
                  if (existingIdx !== -1) {
                    groupLog[existingIdx] = newEntry;
                  } else {
                    groupLog.push(newEntry);
                  }
                }
              });

              nextModifiedGroupsLog[groupIdToMark] = [...groupLog];
            } else {
              nextModifiedGroupIds = nextModifiedGroupIds.filter(id => id !== groupIdToMark);
              nextModifiedGroupsLog[groupIdToMark] = [];
            }
          }

          return {
            nodes: nextNodes,
            flow: buildFlowJson(nextNodes, state.edges),
            modifiedGroupIds: nextModifiedGroupIds,
            modifiedGroupsLog: nextModifiedGroupsLog,
          };
        }),

      isNameTaken: (name, excludeId) => {
        const trimmed = name.trim().toLowerCase();
        if (!trimmed) return false;

        const { nodes, currentSubflowId } = get();

        // Find the parent group of the node we're checking
        const targetNode = excludeId
          ? nodes.find((n) => n.id === excludeId)
          : null;
        const parentId = targetNode ? targetNode.parentNode : currentSubflowId;

        return nodes.some(
          (n) =>
            n.id !== excludeId &&
            n.parentNode === parentId && // Must be in the same group
            n.type !== "group" && // Skip group nodes (as requested: group node can have any name)
            // Check both standard 'name' and Start node's 'flowName'
            (String((n.data as Record<string, unknown>)?.name ?? "")
              .trim()
              .toLowerCase() === trimmed ||
              String((n.data as Record<string, unknown>)?.flowName ?? "")
                .trim()
                .toLowerCase() === trimmed)
        );
      },

      enterSubflow: (groupId) =>
        set({ currentSubflowId: groupId, inspectorOpen: false }),
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

          // Automatically add a Start node inside the empty group
          const startNode: Node = {
            id: uuidv4(),
            type: "start",
            position: { x: 50, y: 50 },
            data: { flowName: newNode.data.name, entryNode: "" },
            parentNode: groupId,
            extent: "parent",
          };

          const nextNodes = [...nodes, newNode, startNode];
          set({
            nodes: nextNodes,
            flow: buildFlowJson(nextNodes, edges),
            selectedNodeId: groupId,
          });
          return;
        }

        const selectedNodes = nodes.filter((n) => nodeIds.includes(n.id));
        if (selectedNodes.length < 1) return; // Should not happen with current UI logic

        // Calculate center for the group node
        const avgX =
          selectedNodes.reduce((acc, n) => acc + n.position.x, 0) /
          selectedNodes.length;
        const avgY =
          selectedNodes.reduce((acc, n) => acc + n.position.y, 0) /
          selectedNodes.length;

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

        // Automatically handle Start node inside the new group
        const existingStart = selectedNodes.find(n => n.type === 'start');
        if (existingStart) {
          // Update its name to match the group
          const finalNodes = nextNodes.map(n =>
            n.id === existingStart.id
              ? { ...n, data: { ...n.data, flowName: newNode.data.name } }
              : n
          );
          set({
            nodes: finalNodes,
            flow: buildFlowJson(finalNodes, edges),
            selectedNodeId: groupId,
          });
        } else {
          // Create a new Start node inside
          const startNode: Node = {
            id: uuidv4(),
            type: "start",
            position: { x: 50, y: 50 },
            data: { flowName: newNode.data.name, entryNode: "" },
            parentNode: groupId,
            extent: "parent",
          };
          const finalNodes = [...nextNodes, startNode];
          set({
            nodes: finalNodes,
            flow: buildFlowJson(finalNodes, edges),
            selectedNodeId: groupId,
          });
        }
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
      applyGroupJson: (groupId, jsonText) => {
        if (!groupId) {
          throw new Error("Missing group id.");
        }

        let parsed: FlowJson;
        try {
          parsed = JSON.parse(jsonText) as FlowJson;
        } catch (error) {
          throw new Error("Invalid JSON.");
        }

        if (
          !parsed ||
          typeof parsed !== "object" ||
          !parsed.visualState ||
          !Array.isArray(parsed.visualState.nodes) ||
          !Array.isArray(parsed.visualState.edges)
        ) {
          throw new Error("JSON must include visualState with nodes and edges.");
        }

        const incomingNodes = parsed.visualState.nodes as Node[];
        const incomingEdges = parsed.visualState.edges as Edge[];
        const incomingIds = new Set(incomingNodes.map((n) => n.id));

        const normalizedNodes = incomingNodes.map((n) => {
          let parentNode = n.parentNode;
          if (!parentNode || !incomingIds.has(parentNode)) {
            parentNode = groupId;
          }
          return {
            ...n,
            parentNode,
            extent: parentNode ? ("parent" as const) : undefined,
          };
        });

        const normalizedIds = new Set(normalizedNodes.map((n) => n.id));
        const normalizedEdges = incomingEdges.filter(
          (e) => normalizedIds.has(e.source) && normalizedIds.has(e.target)
        );

        const flowNodesById = new Map(parsed.nodes.map((node) => [node.id, node]));

        const applyFlowNodeData = (node: Node): Node => {
          if (node.type === "start") {
            const startData = (node.data as Record<string, unknown>) || {};
            const entryNodeValue = parsed.entryNodeId || parsed.entryNode || "";
            return {
              ...node,
              data: {
                ...startData,
                flowName: parsed.flowName ?? startData.flowName,
                entryNode: entryNodeValue || startData.entryNode,
              },
            };
          }

          const flowNode = flowNodesById.get(node.id);
          if (!flowNode) return node;

          const nextData = { ...(node.data as Record<string, unknown>) };
          nextData.name = flowNode.name ?? nextData.name;

          if (node.type === "prompt") {
            nextData.message = flowNode.message ?? nextData.message;
            nextData.persistByIndex =
              typeof flowNode.persistByIndex === "boolean"
                ? flowNode.persistByIndex
                : nextData.persistByIndex;
            nextData.persistSourceField =
              flowNode.persistSourceField ?? nextData.persistSourceField;
            nextData.persistFieldName =
              flowNode.persistFieldName ?? nextData.persistFieldName;
            nextData.validateIndexedList =
              typeof flowNode.validateIndexedList === "boolean"
                ? flowNode.validateIndexedList
                : nextData.validateIndexedList;
            nextData.indexedListVar =
              flowNode.indexedListVar ?? nextData.indexedListVar;
            nextData.invalidInputMessage =
              flowNode.invalidInputMessage ?? nextData.invalidInputMessage;
            nextData.emptyInputMessage =
              flowNode.emptyInputMessage ?? nextData.emptyInputMessage;
            nextData.encryptInput =
              typeof flowNode.encryptInput === "boolean"
                ? flowNode.encryptInput
                : nextData.encryptInput;

            if (
              flowNode.nextNode &&
              typeof flowNode.nextNode === "object" &&
              flowNode.nextNode.routes
            ) {
              const routes = flowNode.nextNode.routes.map((route) => ({
                when: route.when,
                gotoFlow: route.gotoFlow || route.goto || "",
                gotoId: route.gotoId,
              }));
              nextData.nextNode = {
                routes,
                default: flowNode.nextNode.default || "",
                defaultId: flowNode.nextNode.defaultId || "",
              };
            } else if (typeof flowNode.nextNode === "string") {
              nextData.nextNode = flowNode.nextNode;
            }

            return { ...node, data: nextData };
          }

          if (node.type === "action") {
            nextData.endpoint = flowNode.endpoint ?? nextData.endpoint;
            nextData.method = flowNode.method ?? nextData.method;
            nextData.dataSource = flowNode.dataSource ?? nextData.dataSource;
            const flowFields = Array.isArray(flowNode.fields)
              ? flowNode.fields
              : flowNode.field
                ? [flowNode.field]
                : undefined;
            const flowOutputVars = Array.isArray(flowNode.outputVars)
              ? flowNode.outputVars
              : flowNode.outputVar
                ? [flowNode.outputVar]
                : undefined;
            nextData.fields = flowFields ?? nextData.fields;
            nextData.outputVars = flowOutputVars ?? nextData.outputVars;
            nextData.field = flowFields?.[0] ?? nextData.field;
            nextData.outputVar = flowOutputVars?.[0] ?? nextData.outputVar;
            nextData.format = flowNode.format ?? nextData.format;
            nextData.headers = flowNode.headers ?? nextData.headers;
            nextData.apiBody = flowNode.apiBody ?? nextData.apiBody;
            nextData.responseMapping =
              flowNode.responseMapping ?? nextData.responseMapping;
            nextData.persistResponseMapping =
              typeof flowNode.persistResponseMapping === "boolean"
                ? flowNode.persistResponseMapping
                : nextData.persistResponseMapping;

            if (
              flowNode.nextNode &&
              typeof flowNode.nextNode === "object" &&
              flowNode.nextNode.routes
            ) {
              const routes = flowNode.nextNode.routes.map((route) => ({
                id: uuidv4(),
                condition: route.when ? JSON.stringify(route.when) : "",
                nextNodeId: route.gotoId || route.goto || route.gotoFlow || "",
              }));
              nextData.routes = routes;

              nextData.nextNode =
                flowNode.nextNode.defaultId ||
                flowNode.nextNode.default ||
                "";
            } else if (typeof flowNode.nextNode === "string") {
              nextData.nextNode = flowNode.nextNode;
            }

            return { ...node, data: nextData };
          }

          return { ...node, data: nextData };
        };

        const normalizedNodesWithData = normalizedNodes.map(applyFlowNodeData);

        const { nodes: currentNodes, edges: currentEdges, groupJsonModal } =
          get();
        const nodesToRemoveIds = new Set<string>();
        currentNodes.forEach((n) => {
          if (n.parentNode === groupId) nodesToRemoveIds.add(n.id);
        });

        let changed = true;
        while (changed) {
          changed = false;
          currentNodes.forEach((n) => {
            if (n.parentNode && nodesToRemoveIds.has(n.parentNode)) {
              if (!nodesToRemoveIds.has(n.id)) {
                nodesToRemoveIds.add(n.id);
                changed = true;
              }
            }
          });
        }

        const remainingNodes = currentNodes.filter(
          (n) => !nodesToRemoveIds.has(n.id)
        );
        const remainingEdges = currentEdges.filter(
          (e) =>
            !nodesToRemoveIds.has(e.source) && !nodesToRemoveIds.has(e.target)
        );

        const remainingNodeIds = new Set(remainingNodes.map((n) => n.id));
        normalizedNodesWithData.forEach((node) => {
          if (remainingNodeIds.has(node.id)) {
            throw new Error(`Node id conflict: ${node.id}`);
          }
        });

        const remainingEdgeIds = new Set(remainingEdges.map((e) => e.id));
        normalizedEdges.forEach((e) => {
          if (remainingEdgeIds.has(e.id)) {
            throw new Error(`Edge id conflict: ${e.id}`);
          }
        });

        const nextNodes = [...remainingNodes, ...normalizedNodesWithData];
        const nextEdges = [...remainingEdges, ...normalizedEdges];
        const normalizedJson = JSON.stringify(
          {
            ...parsed,
            visualState: { nodes: normalizedNodesWithData, edges: normalizedEdges },
          },
          null,
          2
        );

        set({
          nodes: nextNodes,
          edges: nextEdges,
          flow: buildFlowJson(nextNodes, nextEdges),
          groupJsonModal:
            groupJsonModal && groupJsonModal.groupId === groupId
              ? { ...groupJsonModal, json: normalizedJson }
              : groupJsonModal,
        });
      },

      publishGroup: async (groupId: string) => {
        const { nodes, edges } = get();
        const children = nodes.filter((n) => n.parentNode === groupId);
        const childIds = children.map((n) => n.id);
        const relevantEdges = edges.filter(
          (e) => childIds.includes(e.source) && childIds.includes(e.target)
        );

        // Include the group node itself so visualState contains the grouping container
        const groupNode = nodes.find((n) => n.id === groupId);
        // If group node exists, add it. Otherwise just use children.
        const nodesToSave = groupNode ? [...children, groupNode] : children;

        const subflowJson = buildFlowJson(nodesToSave, relevantEdges);

        try {
          // Verify we have a start node if we want it to be a valid flow
          if (!children.some((n) => n.type === "start")) {
            throw new Error("Cannot publish a group without a Start node.");
          }

          toast.promise(createFlow(subflowJson), {
            loading: "Publishing to backend...",
            success: (data: unknown) => {
              // Add to published list
              const { publishedGroupIds } = get();
              if (groupId && !publishedGroupIds.includes(groupId)) {
                set({ publishedGroupIds: [...publishedGroupIds, groupId] });
              }
              return "Subflow published successfully!";
            },
            error: (err: unknown) => {
              const message =
                err instanceof Error ? err.message : "Unknown error";
              return `Failed to publish: ${message}`;
            },
          });
        } catch (error: unknown) {
          if (typeof window !== "undefined") {
            const message =
              error instanceof Error
                ? error.message
                : "An unknown error occurred";
            alert(message);
          }
        }
      },

      deletePublishedFlow: async (flowName: string) => {
        const { deleteFlow } = await import("../lib/api");
        toast.promise(deleteFlow(flowName), {
          loading: `Deleting flow '${flowName}' from backend...`,
          success: () => {
            const { publishedGroupIds, nodes } = get();
            // Find the group node with this flowName
            const groupNode = nodes.find(n => {
              if (n.type !== 'group') return false;
              const children = nodes.filter(child => child.parentNode === n.id);
              const startNode = children.find(child => child.type === 'start');
              return startNode?.data.flowName === flowName;
            });

            set({
              publishedGroupIds: groupNode
                ? publishedGroupIds.filter((id) => id !== groupNode.id)
                : publishedGroupIds,
            });
            return `Flow '${flowName}' deleted successfully!`;
          },
          error: (err: unknown) => {
            const message =
              err instanceof Error ? err.message : "Unknown error";
            return `Failed to delete flow: ${message}`;
          },
        });
      },

      syncNodeWithBackend: async (nodeId: string, previousName?: string) => {
        const { nodes, edges, publishedGroupIds } = get();
        const node = nodes.find((n) => n.id === nodeId);
        if (!node || !node.parentNode) return;

        // Trace up to find the group node
        const parentGroup = nodes.find((n) => n.id === node.parentNode);
        if (!parentGroup || parentGroup.type !== "group") return;

        // Find nodes belonging to this group
        const groupChildren = nodes.filter((n) => n.parentNode === parentGroup.id);

        // Find the start node inside this group to get the flow name
        const startNode = groupChildren.find((n) => n.type === "start");
        if (!startNode) return;

        const flowName = String(
          (startNode.data as Record<string, unknown>)?.flowName || ""
        );

        // Only sync if it's in the published list
        if (!flowName || !get().publishedGroupIds.includes(parentGroup.id)) return;

        // Get the processed FlowNode data
        const childIds = groupChildren.map((n) => n.id);
        const relevantEdges = edges.filter(
          (e) => childIds.includes(e.source) && childIds.includes(e.target)
        );
        const subflowJson = buildFlowJson(groupChildren, relevantEdges);
        const flowNode = subflowJson.nodes.find((fn) => fn.id === nodeId);

        if (!flowNode) return;

        // The nodeName in the URL should be the OLD name if it changed, 
        // because the backend uses it to find the record.
        const currentName = flowNode.name || "";
        const targetNodeNameInUrl = previousName || currentName;

        if (!targetNodeNameInUrl) return;

        try {
          const { updateNodeInFlow } = await import("../lib/api");
          toast.promise(updateNodeInFlow(flowName, targetNodeNameInUrl, flowNode, previousName), {
            loading: `Syncing changes from '${currentName}'...`,
            success: () => {
              const { modifiedGroupIds } = get();
              set({
                modifiedGroupIds: modifiedGroupIds.filter((id) => id !== parentGroup.id),
              });
              return `Synced '${currentName}' with backend flow '${flowName}'`;
            },
            error: (err: unknown) => {
              const message = err instanceof Error ? err.message : "Unknown error";
              return `Failed to sync node: ${message}`;
            }
          });
        } catch (error) {
          console.error("Failed to trigger sync", error);
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

          // Safety Check: Ensure modifiedGroupIds is an array
          if (!Array.isArray(rehydratedState.modifiedGroupIds)) {
            rehydratedState.modifiedGroupIds = [];
          }
          if (!Array.isArray(rehydratedState.publishedGroupIds)) {
            rehydratedState.publishedGroupIds = [];
          }

          rehydratedState.setHasHydrated(true);
        };
      },
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        flow: state.flow,
        publishedGroupIds: state.publishedGroupIds,
        modifiedGroupIds: state.modifiedGroupIds,
      }),
    }
  )
);