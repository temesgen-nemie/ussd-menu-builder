"use client";

import { ActionRoute } from "./types";
import TargetNodeDisplay from "../TargetNodeDisplay";

type ActionRoutesProps = {
  routes: ActionRoute[];
  options: string[];
  defaultNextNode: any;
  onAddRoute: () => void;
  onRemoveRoute: (index: number) => void;
  onUpdateRoute: (index: number, route: ActionRoute) => void;
};

type ConditionRow = {
  id: string;
  source: "response" | "vars";
  path: string;
  operator: string;
  valueText: string;
};

export default function ActionRoutes({
  routes,
  options,
  defaultNextNode,
  onAddRoute,
  onRemoveRoute,
  onUpdateRoute,
}: ActionRoutesProps) {
  const operatorOptions = [
    { value: "eq", label: "Equals" },
    { value: "ne", label: "Not Equals" },
    { value: "like", label: "Like" },
  ];

  const coerceValue = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "") return "";
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if (trimmed === "null") return null;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
    return raw;
  };

  const parseCondition = (condition?: string) => {
    if (!condition) {
      return {
        mode: "and" as const,
        conditions: [
          { id: "row-0", source: "response" as const, path: "", operator: "eq", valueText: "" }
        ]
      };
    }
    try {
      const parsed = JSON.parse(condition) as Record<string, any>;
      const mode = parsed.or ? ("or" as const) : ("and" as const);
      const items = (parsed.and || parsed.or || [parsed]) as any[];
      
      const conditions: ConditionRow[] = items.map((item, rowIdx) => {
        const operator = Object.keys(item)[0] || "eq";
        const operands = item[operator] as unknown[];
        const left = String(operands?.[0] ?? "");
        const value = operands?.[1];
        
        let source: "response" | "vars" = "response";
        let path = "";
        
        if (left.startsWith("{{response.")) {
          source = "response";
          path = left.replace("{{response.", "").replace("}}", "");
        } else if (left.startsWith("{{vars.")) {
          source = "vars";
          path = left.replace("{{vars.", "").replace("}}", "");
        }

        const valueText =
          typeof value === "string" || typeof value === "number" || typeof value === "boolean"
            ? String(value)
            : value === null
            ? "null"
            : "";
            
        return {
          id: `row-${rowIdx}`,
          source,
          path,
          operator,
          valueText
        };
      });
      
      return { mode, conditions };
    } catch {
      return { mode: "and" as const, conditions: [] as ConditionRow[] };
    }
  };

  const buildCondition = (mode: "and" | "or", conditions: ConditionRow[]) => {
    if (conditions.length === 0) return "";
    
    const mapped = conditions.map(c => {
      const left = `{{${c.source}.${c.path}}}`;
      const right = coerceValue(c.valueText);
      return { [c.operator]: [left, right] };
    });

    if (mapped.length === 1) {
      return JSON.stringify(mapped[0]);
    }

    return JSON.stringify({ [mode]: mapped });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Routing</h3>
          <p className="text-xs text-gray-500">
            Configure default and conditional routes.
          </p>
        </div>
        <button
          onClick={onAddRoute}
          className="text-xs bg-purple-50 text-purple-600 px-3 py-2 rounded-md hover:bg-purple-100 font-medium"
        >
          + Add Route
        </button>
      </div>

      <div>
        <div className="mb-2">
          <h4 className="text-sm font-medium text-gray-800">Default Path</h4>
          <p className="text-xs text-gray-500">
            Fallback if no conditions match.
          </p>
        </div>
        <TargetNodeDisplay
          nodeId={defaultNextNode}
          label="Default Next Node"
          title="Connect nodes on the canvas to set this value"
        />
      </div>

      <div className="border-t pt-4">
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-800">
            Conditional Routes
          </h4>
          <p className="text-xs text-gray-500">Evaluated in order.</p>
        </div>

        <div className="space-y-4">
          {routes.map((route, idx) => {
            const { mode, conditions } = parseCondition(route.condition);
            
            return (
              <div
                key={route.id || idx}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative group"
              >
                <button
                  onClick={() => onRemoveRoute(idx)}
                  className="hidden group-hover:block absolute top-2 right-2 text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 rounded z-10"
                  title="Remove route"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                <div className="space-y-3">
                  <div className="space-y-2">
                    {conditions.length === 0 && (
                      <div className="text-xs text-gray-400 italic py-1">
                        No conditions defined.
                      </div>
                    )}
                    {conditions.map((c, cIdx) => (
                      <div key={c.id} className="grid grid-cols-[36px_1.5fr_0.8fr_1fr_24px] gap-2 items-center min-w-0">
                        <span className="text-[10px] font-bold text-gray-500 uppercase bg-white px-1 border rounded text-center py-1 truncate">
                          {cIdx === 0 ? "If" : (mode === "and" ? "And" : "Or")}
                        </span>

                        <select
                          className="w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-xs text-gray-900 shadow-sm outline-none focus:ring-1 focus:ring-purple-500 overflow-hidden text-ellipsis"
                          value={c.path}
                          onChange={(e) => {
                            const newConditions = [...conditions];
                            newConditions[cIdx] = { ...c, path: e.target.value };
                            const condition = buildCondition(mode, newConditions);
                            onUpdateRoute(idx, { ...route, condition });
                          }}
                        >
                          <option value="">Field</option>
                          {options.map((option, oIdx) => (
                            <option key={oIdx} value={option}>{option}</option>
                          ))}
                        </select>

                        <select
                          className="w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-xs text-gray-900 shadow-sm outline-none focus:ring-1 focus:ring-purple-500"
                          value={c.operator}
                          onChange={(e) => {
                            const newConditions = [...conditions];
                            newConditions[cIdx] = { ...c, operator: e.target.value };
                            const condition = buildCondition(mode, newConditions);
                            onUpdateRoute(idx, { ...route, condition });
                          }}
                        >
                          {operatorOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>

                        <input
                          className="w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-xs text-gray-900 shadow-sm outline-none focus:ring-1 focus:ring-purple-500"
                          placeholder="Value"
                          value={c.valueText}
                          onChange={(e) => {
                            const newConditions = [...conditions];
                            newConditions[cIdx] = { ...c, valueText: e.target.value };
                            const condition = buildCondition(mode, newConditions);
                            onUpdateRoute(idx, { ...route, condition });
                          }}
                        />

                        <button
                          onClick={() => {
                            const newConditions = conditions.filter((_, i) => i !== cIdx);
                            const condition = buildCondition(mode, newConditions);
                            onUpdateRoute(idx, { ...route, condition });
                          }}
                          className="text-gray-300 hover:text-red-500 transition-colors flex justify-center"
                          title="Remove row"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        const newRow: ConditionRow = { id: Math.random().toString(36).substr(2, 9), source: "response", path: "", operator: "eq", valueText: "" };
                        const condition = buildCondition("and", [...conditions, newRow]);
                        onUpdateRoute(idx, { ...route, condition });
                      }}
                      className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-50 font-bold transition-colors"
                    >
                      + AND
                    </button>
                    <button
                      onClick={() => {
                        const newRow: ConditionRow = { id: Math.random().toString(36).substr(2, 9), source: "response", path: "", operator: "eq", valueText: "" };
                        const condition = buildCondition("or", [...conditions, newRow]);
                        onUpdateRoute(idx, { ...route, condition });
                      }}
                      className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-50 font-bold transition-colors"
                    >
                      + OR
                    </button>
                    <div className="flex-1" />
                    <div className="min-w-[170px] flex justify-end">
                      <TargetNodeDisplay
                        nodeId={route.nextNodeId || ""}
                        label=""
                        title="Connect this route handle on the canvas"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {routes.length === 0 && (
            <div className="text-center py-6 text-xs text-gray-400 bg-white rounded-lg border-2 border-dashed border-gray-100">
              No conditional routes defined. <br /> Flow will always proceed to
              the &quot;Default Path&quot;.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
