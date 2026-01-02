"use client";

type StartInspectorProps = {
  node: StartNode;
  updateNodeData: (id: string, data: Partial<Record<string, unknown>>) => void;
};

type StartNodeData = {
  flowName?: string;
  entryNode?: string;
};

type StartNode = {
  id: string;
  data: StartNodeData;
};

export default function StartInspector({
  node,
  updateNodeData,
}: StartInspectorProps) {
  return (
    <div>
      <div className="mb-4">
        <label className="text-xs font-medium text-gray-600">Flow Name</label>
        <input
          className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900"
          value={String(node.data.flowName ?? "")}
          placeholder="e.g. My USSD Flow"
          onChange={(e) => updateNodeData(node.id, { flowName: e.target.value })}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">
          Entry Node ID
        </label>
        <input
          className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-gray-100 shadow-sm text-gray-500 cursor-not-allowed"
          value={String(node.data.entryNode ?? "")}
          readOnly
          placeholder="Connect on canvas"
          title="Connect the Start Node to the first node of your flow"
        />
      </div>
    </div>
  );
}
