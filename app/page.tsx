"use client";

import FlowCanvas from "../components/FlowCanvas";
import NodePalette from "../components/NodePalette";
import InspectorPanel from "../components/InspectorPanel";
import { useFlowStore } from "../store/flowStore";

export default function Home() {
  return (
    <div className="h-screen flex">
      <div className="w-64 border-r bg-gray-50">
        <NodePalette />
      </div>

      <div className="flex-1 relative">
        <FlowCanvas />

        {/* inspector modal overlay positioned near clicked node */}
        {useFlowStore((s) => s.inspectorOpen) && (
          <div
            className="fixed inset-0 z-50 pointer-events-auto bg-black/10"
            onClick={() => useFlowStore.getState().closeInspector()}
          >
            <InspectorPanel />
          </div>
        )}
      </div>
    </div>
  );
}
