import { Handle, Position, NodeProps } from "reactflow";

type ScriptNodeData = {
  name?: string;
  script?: string;
  timeoutMs?: number;
};

type ScriptNodeProps = NodeProps<ScriptNodeData>;

export default function ScriptNode({ data, selected }: ScriptNodeProps) {
  return (
    <div
      className={`w-72 rounded-2xl border-2 bg-slate-900 p-4 text-white shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all duration-200 ${
        selected
          ? "border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)] scale-[1.02]"
          : "border-slate-800"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="text-sm font-black tracking-tight text-cyan-300">
            {data.name || "SCRIPT"}
          </div>
          <div className="text-[10px] font-medium text-slate-500">
            timeout: {data.timeoutMs ?? 25}ms
          </div>
        </div>
        <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-cyan-300">
          script
        </span>
      </div>

      {/* <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-[10px] text-slate-400">
        {data.script ? data.script.split("\n")[0] : "No script yet"}
      </div> */}

      <Handle
        type="target"
        position={Position.Top}
        className="h-3! w-3! border-2! border-cyan-400! bg-slate-900!"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-3! w-3! border-2! border-cyan-400! bg-slate-900!"
      />
    </div>
  );
}
