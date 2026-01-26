import { Handle, Position, NodeProps } from "reactflow";

type StartNodeData = {
  flowName?: string;
};

type StartNodeProps = NodeProps<StartNodeData>;

export default function StartNode({ data, selected }: StartNodeProps) {
  return (
    <div
      className={`rounded-full w-24 h-24 flex flex-col items-center justify-center bg-white shadow-md border-2
      ${selected ? "border-blue-500 ring-2 ring-blue-300" : "border-blue-400"}`}
    >
      <div className="text-blue-500 mb-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="text-[10px] uppercase font-bold text-gray-500">Start</div>
      <div className="text-xs font-semibold text-gray-800 truncate px-2 max-w-full">
        {data.flowName || "Flow"}
      </div>

      {/* Only Source handle, no Target */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="border-blue-500"
      />
    </div>
  );
}
