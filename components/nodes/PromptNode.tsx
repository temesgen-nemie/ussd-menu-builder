import { Handle, Position, NodeProps } from "reactflow";

type PromptRoute = {
  when?: { eq?: string[] };
  gotoFlow?: string;
};

type PromptNextNode = {
  routes?: PromptRoute[];
  default?: string;
};

type PromptNodeData = {
  name?: string;
  message?: string;
  routingMode?: string;
  nextNode?: PromptNextNode | string;
  persistByIndex?: boolean;
  persistSourceField?: string;
  persistFieldName?: string;
  validateIndexedList?: boolean;
  indexedListVar?: string;
  invalidInputMessage?: string;
  emptyInputMessage?: string;
  persistInput?: boolean;
  persistInputAs?: string;
  responseType?: "CONTINUE" | "END";
  encryptInput?: boolean;
  hasMultiplePage?: boolean;
  indexPerPage?: number;
  pagination?: {
    enabled: boolean;
    actionNode: string;
    pageField: string;
    totalPagesField: string;
    nextInput: string;
    prevInput: string;
    nextLabel: string;
    prevLabel: string;
    controlsVar: string;
  };
};

type PromptNodeProps = NodeProps<PromptNodeData>;

export default function PromptNode({ data, selected }: PromptNodeProps) {
  return (
    <div
      className={`rounded-xl p-4 w-64 bg-white shadow-md border
      ${
        selected
          ? "border-indigo-500 ring-2 ring-indigo-300"
          : "border-gray-300"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-indigo-600 truncate max-w-[180px]">
          {data.name || "Prompt"}
        </div>
        {data.encryptInput && (
          <div title="Encrypted Input Active" className="bg-amber-100 p-1 rounded text-amber-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      <div className="text-sm text-gray-700">
        {data.message || "No message"}
      </div>

      {/* Menu Mode: Show Logic Rules (No Handles) */}
      {data.routingMode === "menu" && (
        <div className="mt-3 pt-2 border-t border-gray-100 space-y-1">
          {/* Check if nextNode has routes (Logic Mode) */}
          {data.nextNode &&
            typeof data.nextNode === "object" &&
            data.nextNode.routes &&
            data.nextNode.routes.map((route, idx: number) => {
              // Extract input value from condition: { "eq": ["{{input}}", "1"] }
              const matchVal = route.when?.eq?.[1] || "?";
              return (
                <div
                  key={idx}
                  className="relative flex items-center justify-between text-xs bg-gray-50 p-1.5 rounded border border-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono bg-white px-1.5 py-0.5 border rounded text-indigo-600 font-bold">
                      {matchVal}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span
                      className="text-gray-700 font-medium truncate max-w-[100px]"
                      title={route.gotoFlow}
                    >
                      {route.gotoFlow || "Select Target..."}
                    </span>
                  </div>
                  
                  {/* Source Handle for this specific option */}
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`route-${idx}`}
                    className="!w-3 !h-3 !bg-indigo-500 border-2 border-white -right-3"
                  />
                </div>
              );
            })}

          {/* Fallback/Legacy: If no rules yet, show placeholder */}
          {(!data.nextNode ||
            typeof data.nextNode !== "object" ||
            !data.nextNode.routes ||
            data.nextNode.routes.length === 0) && (
            <div className="text-center text-[10px] text-gray-400 italic py-2">
              No routing rules defined
            </div>
          )}

          {/* Default Route Indicator */}
          {data.nextNode &&
            typeof data.nextNode === "object" &&
            data.nextNode.default && (
              <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1 px-1">
                <span>Default:</span>
                <span className="font-medium text-gray-600">
                  {data.nextNode.default}
                </span>
              </div>
            )}
        </div>
      )}

      {/* Linear Mode Indicator */}
      {(data.routingMode === "linear" || !data.routingMode) && (
        <div className="mt-3 text-center">
          <div className="text-[10px] text-gray-400 mb-1">
            Input Collection Mode
          </div>
        </div>
      )}

      <Handle type="target" position={Position.Top} />

      {/* Linear Mode: Default Bottom Handle */}
      {(data.routingMode === "linear" || !data.routingMode) && (
        <Handle type="source" position={Position.Bottom} />
      )}

      {/* Legacy/Fallback: Show bottom handle if menu mode but no options? (Optional, maybe keep it clean) */}
      {/* For now, strict: If menu mode, no bottom handle. User must add options. */}
    </div>
  );
}
