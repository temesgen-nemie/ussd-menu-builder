"use client";

import dynamic from 'next/dynamic';
import NodePalette from '../components/NodePalette';
import InspectorPanel from '../components/inspector/InspectorPanel';
import { useFlowStore } from '../store/flowStore';

const FlowCanvas = dynamic(() => import('../components/FlowCanvas'), { ssr: false });

export default function Home() {
  return (
    <div className='h-screen flex'>
      <div className='w-64 border-r bg-gray-50'>
        <NodePalette />
      </div>

      <div className='flex-1 relative'>
        <FlowCanvas />

        {useFlowStore((s) => s.inspectorOpen) && (
          <InspectorPanel key={useFlowStore.getState().selectedNodeId} />
        )}
      </div>
    </div>
  );
}
