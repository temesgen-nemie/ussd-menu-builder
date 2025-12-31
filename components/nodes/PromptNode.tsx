import { Handle, Position, NodeProps } from "reactflow";

export default function PromptNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`rounded-xl p-4 w-64 bg-white shadow-md border
      ${
        selected
          ? "border-indigo-500 ring-2 ring-indigo-300"
          : "border-gray-300"
      }`}
    >
      <div className="font-bold text-indigo-600 mb-2">Prompt</div>
      <div className="text-sm text-gray-700">
        {data.message || "No message"}
      </div>

      {/* Handles are required */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
