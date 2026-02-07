import NodeNameInput from "./NodeNameInput";
import type { Node } from "reactflow";
import { useFlowStore } from "@/store/flowStore";

type ScriptInspectorProps = {
  node: Node;
  updateNodeData: (id: string, data: Partial<Record<string, unknown>>) => void;
};

export default function ScriptInspector({ node, updateNodeData }: ScriptInspectorProps) {
  const nodes = useFlowStore((s) => s.nodes);
  const nextNodeId =
    typeof node.data?.nextNode === "string" ? node.data.nextNode : "";
  const nextNode = nodes.find((n) => n.id === nextNodeId);

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
