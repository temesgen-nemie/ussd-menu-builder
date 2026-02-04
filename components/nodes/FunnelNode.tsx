"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

const FunnelNode = ({ selected }: NodeProps) => {
  return (
    <div
      className={`relative w-12 h-12 flex items-center justify-center transition-all duration-200 ${
        selected ? "scale-[1.02]" : ""
      }`}
    >
      {/* Input Handle - Multi-connection by default in React Flow */}
      <Handle
        type="target"
        id="funnel-target"
        position={Position.Top}
        className="w-3 h-3 bg-indigo-500 border-2 border-white !-top-1.5 shadow-sm"
      />

      <div className="flex flex-col items-center">
        <div className="p-2 bg-indigo-50 rounded-xl">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-indigo-600"
          >
            {/* Custom Funnel Icon matching user image style */}
            <path
              d="M4 4H20L14 11V18L10 21V11L4 4Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Small nodes symbol at the top of the funnel */}
            <rect x="6" y="6" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.5" />
            <rect x="11" y="6" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.5" />
            <rect x="16" y="6" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.5" />
          </svg>
        </div>
      </div>

      {/* Output Handle - One target node */}
      <Handle
        type="source"
        id="funnel-source"
        position={Position.Bottom}
        className="w-3 h-3 bg-indigo-500 border-2 border-white !-bottom-1.5 shadow-sm"
      />
    </div>
  );
};

export default memo(FunnelNode);
