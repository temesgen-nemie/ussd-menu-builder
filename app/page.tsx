'use client';

import { useState } from 'react';
import FlowCanvas from '../components/FlowCanvas';
import NodePalette from '../components/NodePalette';
import InspectorPanel from '../components/inspector/InspectorPanel';
import FlowJsonModal from '../components/FlowJsonModal';
import { useFlowStore } from '../store/flowStore';

export default function Home() {
  const [showFlowJson, setShowFlowJson] = useState(false);
  const flow = useFlowStore((s) => s.flow);
  const flowJson = JSON.stringify(flow, null, 2);

  return (
    <div className='h-screen flex'>
      <div className='w-64 border-r bg-gray-50'>
        <NodePalette />
      </div>

      <div className='flex-1 relative'>
        {/* <TopBar /> */}
        <FlowCanvas />

        {/* inspector modal overlay positioned near clicked node */}
        {useFlowStore((s) => s.inspectorOpen) && (
          <InspectorPanel key={useFlowStore.getState().selectedNodeId} />
        )}

        <button
          className='absolute top-4 right-4 bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-md shadow hover:bg-indigo-700'
          onClick={() => setShowFlowJson(true)}
        >
          View Flow JSON
        </button>

        <FlowJsonModal
          isOpen={showFlowJson}
          onClose={() => setShowFlowJson(false)}
          flowJson={flowJson}
        />
      </div>
    </div>
  );
}
