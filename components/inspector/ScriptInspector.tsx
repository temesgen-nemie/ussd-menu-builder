import NodeNameInput from "./NodeNameInput";
import TargetNodeDisplay from "./TargetNodeDisplay";
import type { Node } from "reactflow";
import { useFlowStore } from "@/store/flowStore";

type ScriptInspectorProps = {
  node: Node;
  updateNodeData: (id: string, data: Partial<Record<string, unknown>>) => void;
};

type ScriptRoute = {
  id: string;
  key?: string;
  nextNodeId?: string;
};

export default function ScriptInspector({ node, updateNodeData }: ScriptInspectorProps) {
  const nodes = useFlowStore((s) => s.nodes);
  const nextNodeId =
    typeof node.data?.nextNode === "string" ? node.data.nextNode : "";
  const nextNode = nodes.find((n) => n.id === nextNodeId);
  const routes = (node.data?.routes as ScriptRoute[]) || [];
  const createId = () => Math.random().toString(36).substr(2, 9);

  return (
    <div className="space-y-4">
      <NodeNameInput
        nodeId={node.id}
        name={String(node.data?.name ?? "")}
        onNameChange={(value) => updateNodeData(node.id, { name: value })}
      />

      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
          Script
        </label>
        <textarea
          className="w-full resize-y rounded-lg border-2 border-gray-100 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 transition-all focus:border-cyan-400 focus:bg-white focus:outline-none"
          rows={8}
          value={String(node.data?.script ?? "")}
          onChange={(e) => updateNodeData(node.id, { script: e.target.value })}
          placeholder="Write your script here..."
        />
      </div>

      <div className="rounded-lg border border-gray-100 bg-white/80 p-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase text-gray-400">
            Script Routes
          </label>
          <button
            type="button"
            className="text-[10px] font-semibold text-cyan-600 hover:text-cyan-700"
            onClick={() =>
              updateNodeData(node.id, {
                routes: [
                  ...routes,
                  { id: createId(), key: "", nextNodeId: "" },
                ],
              })
            }
          >
            + Add Route
          </button>
        </div>

        {routes.length === 0 ? (
          <div className="mt-2 text-[10px] text-gray-400">
            No routes yet. Add a route and connect it on the canvas.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {routes.map((route, idx) => (
              <div
                key={route.id || idx}
                className="grid grid-cols-[1fr_auto] items-center gap-2"
              >
                <input
                  className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 shadow-sm"
                  placeholder="Route key (e.g. no_accounts)"
                  value={String(route.key ?? "")}
                  onChange={(e) => {
                    const next = [...routes];
                    next[idx] = { ...route, key: e.target.value };
                    updateNodeData(node.id, { routes: next });
                  }}
                />
                <button
                  type="button"
                  className="text-[10px] text-gray-400 hover:text-red-500"
                  onClick={() => {
                    const next = routes.filter((_, i) => i !== idx);
                    updateNodeData(node.id, { routes: next });
                  }}
                >
                  Remove
                </button>
                <div className="col-span-2">
                  <div className="text-[9px] font-semibold uppercase text-gray-400 mb-1">
                    Target
                  </div>
                  <TargetNodeDisplay
                    nodeId={route.nextNodeId || ""}
                    label=""
                    title="Connect this route handle on the canvas"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2 text-xs text-gray-600">
        <span className="font-semibold uppercase">Next Node</span>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              nextNodeId
                ? "bg-emerald-100 text-emerald-800"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {nextNodeId
              ? `Connected to ${String(nextNode?.data?.name || "Untitled")}`
              : "Not connected"}
          </span>
        </div>
      </div>
    </div>
  );
}
