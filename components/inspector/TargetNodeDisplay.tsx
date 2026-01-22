"use client";

import { useFlowStore } from "../../store/flowStore";

type TargetNodeDisplayProps = {
  nodeId: any;
  label: string;
  placeholder?: string;
  title?: string;
  className?: string;
};

export default function TargetNodeDisplay({ 
  nodeId, 
  label, 
  placeholder = "Connect nodes on canvas", 
  title,
  className = "" 
}: TargetNodeDisplayProps) {
  const safeNodeId = (id: any): string => {
    if (typeof id !== "string") {
      if (id && typeof id === "object") {
        return (id.defaultId || id.default || "") as string;
      }
      return "";
    }
    if (id === "[object Object]" || id === "undefined" || id === "null") return "";
    return id;
  };

  const cleanNodeId = safeNodeId(nodeId);
  const targetNode = useFlowStore((s) => s.nodes.find((n) => n.id === cleanNodeId));
  const targetName = targetNode?.data?.name;
  const isGroup = targetNode?.type === "group";

  return (
    <div className={className}>
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      <div className="flex items-center gap-2 group">
        <div className="flex-1 relative">
           <input
             className={`w-full rounded-xl border border-gray-100 p-2.5 bg-gray-50/50 shadow-sm text-gray-500 cursor-not-allowed text-xs font-mono transition-all group-hover:bg-gray-50 ${cleanNodeId ? 'pr-8' : ''}`}
             value={cleanNodeId}
             placeholder={placeholder}
             readOnly
             title={title}
           />
           {cleanNodeId && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 font-bold">
                ID
              </div>
           )}
        </div>
        
        {cleanNodeId && (
          <div className="flex-[1.5] animate-in slide-in-from-left-2 fade-in duration-300">
             <div className={`w-full rounded-xl border p-2.5 shadow-sm flex items-center gap-2 ${
               isGroup 
                 ? "bg-purple-50 border-purple-100 text-purple-700" 
                 : "bg-indigo-50 border-indigo-100 text-indigo-700"
             }`}>
               <div className={`p-1 rounded-md ${isGroup ? 'bg-purple-600' : 'bg-indigo-600'} text-white`}>
                 {isGroup ? (
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                     <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                   </svg>
                 ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                   </svg>
                 )}
               </div>
               <span className="text-xs font-black truncate max-w-[120px]">
                 {targetName || "Unnamed Node"}
               </span>
               {isGroup && (
                 <span className="text-[9px] font-bold bg-white/50 px-1.5 py-0.5 rounded-full uppercase">Group</span>
               )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
