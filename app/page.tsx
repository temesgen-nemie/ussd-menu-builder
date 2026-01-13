"use client";

import dynamic from 'next/dynamic';
import NodePalette from '../components/NodePalette';
import InspectorPanel from '../components/inspector/InspectorPanel';
import { useFlowStore } from '../store/flowStore';
import { Toaster } from 'sonner';

const FlowCanvas = dynamic(() => import('../components/FlowCanvas'), { ssr: false });

export default function Home() {
  return (
    <div className='h-screen flex flex-col'>
      <NodePalette />

      <div className='flex-1 relative'>
        <FlowCanvas />
        <Toaster position="top-right" richColors />

        {useFlowStore((s) => s.inspectorOpen) && (
          <InspectorPanel key={useFlowStore.getState().selectedNodeId} />
        )}
      </div>
    </div>
  );
}
