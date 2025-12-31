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
      <div className="font-bold text-indigo-600 mb-2">{data.name || "Prompt"}</div>
      <div className="text-sm text-gray-700">
        {data.message || "No message"}
      </div>

      {data.options && (data.options as any[]).length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-100 space-y-1">
          {(data.options as any[]).map((opt: any, idx: number) => (
            <div key={idx} className="relative flex items-center justify-between text-xs bg-gray-50 p-1.5 rounded group">
              <div className="flex items-center gap-2">
                <span className="font-mono bg-white px-1 border rounded text-gray-500">{opt.value}</span>
                <span className="text-gray-700 truncate max-w-[120px]" title={opt.label}>{opt.label}</span>
              </div>
              {opt.nextNode && (
                 <div className="flex items-center text-[10px] text-indigo-400 mr-2">
                   <span className="mr-0.5">→</span>
                   <span className="truncate max-w-[50px]">{opt.nextNode}</span>
                 </div>
              )}
              {/* Individual Source Handle for this option */}
              <Handle
                type="source"
                position={Position.Right}
                id={opt.id}
                className="!bg-indigo-400 !w-3 !h-3 !-right-2"
                style={{ top: "50%", transform: "translateY(-50%)" }}
              />
            </div>
          ))}
        </div>
      )}

      <Handle type="target" position={Position.Top} />
      
      {/* Only show default bottom handle if no options are defined (or if you want a fallback flow) */}
      {(!data.options || (data.options as any[]).length === 0) && (
        <Handle type="source" position={Position.Bottom} />
      )}
    </div>
  );
}
