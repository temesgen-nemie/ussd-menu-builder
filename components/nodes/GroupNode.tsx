"use client";

import { NodeProps } from "reactflow";
import { useFlowStore } from "../../store/flowStore";
import { useShallow } from "zustand/react/shallow";

export default function GroupNode({ id, data, selected }: NodeProps) {
  const { enterSubflow } = useFlowStore();
  
  // Get children count from store
  const childrenCount = useFlowStore(
    useShallow((s) => s.nodes.filter((n) => n.parentNode === id).length)
  );

  return (
    <div
      className={`relative group bg-white/95 backdrop-blur-sm border-2 rounded-2xl p-4 transition-all duration-300 min-w-[240px] shadow-lg ${
        selected
          ? "border-indigo-500 ring-4 ring-indigo-500/20 scale-105"
          : "border-indigo-200 hover:border-indigo-400 hover:shadow-xl"
      }`}
      onDoubleClick={(e) => {
        e.stopPropagation();
        enterSubflow(id);
      }}
    >
      {/* Decorative Gradient Bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-t-2xl opacity-80" />

      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
             </div>
             <div>
                <h3 className="font-bold text-gray-800 tracking-tight">
                  {data.name || "Untitled Group"}
                </h3>
                <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest">
                  Subflow Container
                </p>
             </div>
          </div>
        </div>

        {/* Content Preview */}
        <div className="py-2 px-3 bg-gray-50/50 rounded-xl border border-gray-100 flex items-center justify-between group-hover:bg-white transition-colors">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-500">Internal Nodes</span>
            <span className="text-lg font-black text-indigo-600">{childrenCount}</span>
          </div>
          
          <button 
             onClick={(e) => {
               e.stopPropagation();
               enterSubflow(id);
             }}
             className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-all transform hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-sm"
          >
             <span>Enter</span>
             <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
             </svg>
          </button>
        </div>

        <div className="text-[9px] text-gray-400 italic text-center">
            Double-click to drill down
        </div>
      </div>
    </div>
  );
}
