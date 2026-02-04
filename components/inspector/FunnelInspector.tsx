"use client";

import React from "react";
import { Node } from "reactflow";
import TargetNodeDisplay from "./TargetNodeDisplay";
import { useFlowStore } from "../../store/flowStore";

type FunnelInspectorProps = {
  node: Node;
  updateNodeData: (id: string, data: Partial<Record<string, unknown>>) => void;
};

export default function FunnelInspector({ node }: FunnelInspectorProps) {
  const edges = useFlowStore((s) => s.edges);
  const nodes = useFlowStore((s) => s.nodes);

  // Find nodes connected to the top handle of this funnel
  const incomingNodeIds = edges
    .filter((e) => e.target === node.id)
    .map((e) => e.source);
  
  const incomingNodes = nodes.filter((n) => incomingNodeIds.includes(n.id));

  return (
    <div className="space-y-4">
      <div className="p-4 bg-violet-50 rounded-xl border border-violet-100">
        <h3 className="text-sm font-bold text-violet-700 flex items-center gap-2 mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 4H20L14 11V18L10 21V11L4 4Z" />
          </svg>
          Funnel Node
        </h3>
        <p className="text-xs text-violet-600/80 leading-relaxed">
          The Funnel node allows multiple incoming edges to be routed to a single target node. 
          Connect multiple nodes to the top handle and connect the bottom handle to a single target node.
        </p>
      </div>

      {incomingNodes.length > 0 && (
        <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 block">
            Incoming Nodes ({incomingNodes.length})
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {incomingNodes.map((n) => (
              <div 
                key={n.id} 
                className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 group hover:border-violet-200 hover:bg-violet-50 transition-colors"
                title={n.id}
              >
                <div className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-violet-500 group-hover:border-violet-100 shrink-0">
                  {n.type === "prompt" && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  )}
                  {n.type === "action" && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>
                  )}
                  {n.type === "condition" && (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-bold text-gray-700 truncate group-hover:text-violet-700">
                    {n.data?.name || "Unnamed Node"}
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono truncate">
                    {n.id.split('-')[0]}...
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
        <TargetNodeDisplay 
          nodeId={node.data?.nextNode} 
          label="Target Node (Resolved)" 
          placeholder="Connect to a target node"
        />
      </div>
    </div>
  );
}
