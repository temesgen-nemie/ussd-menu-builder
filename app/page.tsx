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
        {/* <TopBar /> */}
        <FlowCanvas />

        {/* inspector modal overlay positioned near clicked node */}
        {useFlowStore((s) => s.inspectorOpen) && (
          <InspectorPanel key={useFlowStore.getState().selectedNodeId} />
        )}
      </div>
    </div>
  );
}
