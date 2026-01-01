import { Handle, Position, NodeProps } from "reactflow";

export default function ActionNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`rounded-xl p-4 w-72 bg-gray-900 text-white shadow-md border
      ${
        selected ? "border-green-400 ring-2 ring-green-300" : "border-gray-700"
      }`}
    >
      <div className="font-bold text-green-400 mb-2">{data.name || "API Action"}</div>
      <div className="text-xs break-all">{data.endpoint || "No endpoint"}</div>

      {/* Dynamic Handles for Routes */}
      <div className="mt-4 flex flex-col gap-2 relative">
        {(data.routes as any[])?.map((route: any, index: number) => (
          <div key={route.id || index} className="relative flex items-center justify-end">
            <div className="text-[10px] text-gray-400 mr-2 truncate max-w-[150px]" title={route.condition}>
              {route.condition || "Condition"}
            </div>
            <Handle
              type="source"
              position={Position.Right}
              id={route.id}
              style={{ top: "auto", right: -22, border: "2px solid #a78bfa" }} // purple ring for routes
            />
          </div>
        ))}
      </div>

      <Handle type="target" position={Position.Top} />
      {/* Default/Fallback Exit */}
      <div className="absolute bottom-0 left-0 w-full flex justify-center">
         <div className="text-[10px] text-gray-500 -mb-5">Default</div>
      </div>
      <Handle type="source" position={Position.Bottom} id="default" />
    </div>
  );
}
