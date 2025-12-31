import { Handle, Position, NodeProps } from "reactflow";

export default function ActionNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`rounded-xl p-4 w-72 bg-gray-900 text-white shadow-md border
      ${
        selected ? "border-green-400 ring-2 ring-green-300" : "border-gray-700"
      }`}
    >
      <div className="font-bold text-green-400 mb-2">API Action</div>
      <div className="text-xs break-all">{data.endpoint || "No endpoint"}</div>

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
