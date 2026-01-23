import { Handle, Position, NodeProps } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import type { ActionRoute } from '../inspector/action/types';

type ActionNodeData = {
  name?: string;
  endpoint?: string;
  routes?: ActionRoute[];
  requestSource?: "api" | "local";
};

type ActionNodeProps = NodeProps<ActionNodeData>;

export default function ActionNode({ data, selected }: ActionNodeProps) {
  const formatCondition = (condition?: string) => {
    if (!condition) return 'Condition';
    try {
      const parsed = JSON.parse(condition) as Record<string, unknown>;
      const operator = Object.keys(parsed)[0];
      const operands = parsed[operator] as unknown[];
      const left = String(operands?.[0] ?? '');
      const right = operands?.[1];
      const path = left.startsWith('{{response.')
        ? left.replace('{{response.', '').replace('}}', '')
        : left;
      const operatorLabel =
        operator === 'eq'
          ? 'equals'
          : operator === 'ne'
          ? 'not equals'
          : operator === 'contains'
          ? 'contains'
          : operator || 'matches';
      return `${path} ${operatorLabel} ${String(right ?? '')}`.trim();
    } catch {
      return 'Condition';
    }
  };

  return (
    <div
      className={`rounded-xl p-4 w-72 bg-gray-900 text-white shadow-md border
      ${
        selected ? 'border-green-400 ring-2 ring-green-300' : 'border-gray-700'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className='font-bold text-green-400'>
          {data.name || 'API Action'}
        </div>
        <Badge
          variant="secondary"
          className={`text-[9px] font-semibold uppercase tracking-wide pt-1 ${
            data.requestSource === "local"
              ? "bg-amber-500/20 text-amber-300 border-transparent"
              : "bg-emerald-500/20 text-emerald-300 border-transparent"
          }`}
        >
          {data.requestSource === "local" ? "local storage" : "api"}
        </Badge>
      </div>

      {/* Dynamic Handles for Routes */}
      <div className='mt-4 flex flex-col gap-2 relative'>
        {(data.routes || []).map((route, index) => (
          <div
            key={route.id || index}
            className='relative flex items-center justify-end'
          >
            <div
              className='text-[10px] text-gray-400 mr-2 truncate max-w-37.5'
              title={formatCondition(route.condition)}
            >
              {formatCondition(route.condition)}
            </div>
            <Handle
              type='source'
              position={Position.Right}
              id={route.id}
              style={{ top: 'auto', right: -22, border: '2px solid #a78bfa' }} // purple ring for routes
            />
          </div>
        ))}
      </div>

      <Handle type='target' position={Position.Top} />
      {/* Default/Fallback Exit */}
      <div className='absolute bottom-0 left-0 w-full flex justify-center'>
        <div className='text-[10px] text-gray-500 -mb-5'>Default</div>
      </div>
      <Handle type='source' position={Position.Bottom} id='default' />
    </div>
  );
}
