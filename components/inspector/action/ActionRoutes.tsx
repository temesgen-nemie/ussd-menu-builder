"use client";

import { ActionRoute } from "./types";
import TargetNodeDisplay from "../TargetNodeDisplay";

type ActionRoutesProps = {
  routes: ActionRoute[];
  options: string[];
  defaultNextNode: string;
  onAddRoute: () => void;
  onRemoveRoute: (index: number) => void;
  onUpdateRoute: (index: number, route: ActionRoute) => void;
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
    { value: "contains", label: "Contains" },
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
    if (!condition) return { path: "", operator: "eq", valueText: "" };
    try {
      const parsed = JSON.parse(condition) as Record<string, unknown>;
      const operator = Object.keys(parsed)[0] || "eq";
      const operands = parsed[operator] as unknown[];
      const left = String(operands?.[0] ?? "");
      const value = operands?.[1];
      const path = left.startsWith("{{response.")
        ? left.replace("{{response.", "").replace("}}", "")
        : "";
      const valueText =
        typeof value === "string" || typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : value === null
          ? "null"
          : "";
      return { path, operator, valueText };
    } catch {
      return { path: "", operator: "eq", valueText: "" };
    }
  };

  const buildCondition = (path: string, operator: string, valueText: string) => {
    if (!path) return "";
    const left = `{{response.${path}}}`;
    const right = coerceValue(valueText);
    return JSON.stringify({ [operator]: [left, right] });
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
          {options.length === 0 && (
            <div className="text-xs text-gray-400">
              Send a request to populate response fields for condition building.
            </div>
          )}
          {routes.map((route, idx) => (
            <div
              key={route.id || idx}
              className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative group"
            >
              <button
                onClick={() => onRemoveRoute(idx)}
                className="hidden group-hover:block absolute top-2 right-2 text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 rounded"
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
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase bg-white px-1 border rounded">
                      If
                    </span>
                    <label className="text-xs text-gray-500">
                      Response Condition
                    </label>
                  </div>
                  {(() => {
                    const parsed = parseCondition(route.condition);
                    return (
                      <div className="grid grid-cols-[1.2fr_0.8fr_1fr] gap-2 min-w-0">
                        <div className="min-w-0">
                          <select
                            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 shadow-sm overflow-hidden text-ellipsis"
                            value={parsed.path}
                            onChange={(e) => {
                              const condition = buildCondition(
                                e.target.value,
                                parsed.operator,
                                parsed.valueText
                              );
                              onUpdateRoute(idx, { ...route, condition });
                            }}
                          >
                            <option value="">Field</option>
                            {options.map((path, optionIndex) => (
                              <option
                                key={`${path}-${optionIndex}`}
                                value={path}
                              >
                                {path}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="min-w-0">
                          <select
                            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 shadow-sm"
                            value={parsed.operator}
                            onChange={(e) => {
                              const condition = buildCondition(
                                parsed.path,
                                e.target.value,
                                parsed.valueText
                              );
                              onUpdateRoute(idx, { ...route, condition });
                            }}
                          >
                            {operatorOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="min-w-0">
                          <input
                            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 shadow-sm"
                            placeholder="Value"
                            value={parsed.valueText}
                            onChange={(e) => {
                              const condition = buildCondition(
                                parsed.path,
                                parsed.operator,
                                e.target.value
                              );
                              onUpdateRoute(idx, { ...route, condition });
                            }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                  <TargetNodeDisplay
                    nodeId={route.nextNodeId || ""}
                    label="Go to Node"
                    title="Connect this route handle on the canvas"
                  />
              </div>
            </div>
          ))}

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
