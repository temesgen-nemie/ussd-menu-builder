"use client";

import NodeNameInput from "./NodeNameInput";
import TargetNodeDisplay from "./TargetNodeDisplay";

type ConditionInspectorProps = {
  node: any;
  updateNodeData: (id: string, data: Partial<Record<string, unknown>>) => void;
};

type ConditionRoute = {
  when?: Record<string, [string, string | number]>;
  goto?: string;
};

export default function ConditionInspector({
  node,
  updateNodeData,
}: ConditionInspectorProps) {
  
  // Helpers to manage routes
  const routes = (node.data.nextNode?.routes as ConditionRoute[]) || [];
  const defaultRoute = node.data.nextNode?.default || "";

  const addRoute = () => {
      const newRoutes: ConditionRoute[] = [
          ...routes,
          { when: { eq: ["", ""] }, goto: "" }
      ];
      updateRoutes(newRoutes);
  };

  const removeRoute = (idx: number) => {
      const newRoutes = routes.filter((_, i) => i !== idx);
      updateRoutes(newRoutes);
  };

  const updateRoutes = (newRoutes: ConditionRoute[]) => {
      updateNodeData(node.id, {
          nextNode: {
              ...(node.data.nextNode || {}),
              routes: newRoutes
          }
      });
  };

  const updateRouteLogic = (idx: number, field: string, value: any) => {
      const newRoutes = [...routes];
      const currentWhen = newRoutes[idx].when || {};
      const currentOp = Object.keys(currentWhen)[0] || "eq";
      const currentArgs = currentWhen[currentOp] || ["", ""];

      
      if (field === "operator") {
          // Change operator key but keep values
          newRoutes[idx] = {
              ...newRoutes[idx],
              when: { [value]: currentArgs }
          };
      } else if (field === "left") {
          newRoutes[idx] = {
              ...newRoutes[idx],
             when: { [currentOp]: [value, currentArgs[1]] }
          };
      } else if (field === "right") {
           newRoutes[idx] = {
              ...newRoutes[idx],
             when: { [currentOp]: [currentArgs[0], value] }
          };
      }

      updateRoutes(newRoutes);
  };

  const updateDefault = (val: string) => {
       updateNodeData(node.id, {
          nextNode: {
              ...(node.data.nextNode || {}),
              default: val
          }
      });
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <NodeNameInput
          nodeId={node.id}
          name={String(node.data.name ?? "")}
          onNameChange={(val) => updateNodeData(node.id, { name: val })}
        />
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg text-xs text-blue-700 border border-blue-200/50 flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>Define conditions to route based on variable comparisons. Connect route handles on the canvas to set destinations.</span>
        </div>
      </div>

       {/* Routes Editor */}
       <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Conditional Routes
                </label>
                <p className="text-xs text-gray-500 mt-0.5">Evaluated in order from top to bottom</p>
              </div>
              <button
                onClick={addRoute}
                className="text-xs bg-gradient-to-r from-pink-600 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-pink-700 hover:to-pink-600 transition-all shadow-sm hover:shadow-md font-medium flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Condition
              </button>
            </div>

            <div className="space-y-3">
                {routes.map((route, idx) => {
                     const operator = route.when ? Object.keys(route.when)[0] : "eq";
                     const args = route.when ? route.when[operator] : ["", ""];
                     const leftValue = args?.[0] || "";
                     const rightValue = args?.[1] || "";

                    return (
                        <div key={idx} className="p-4 bg-gradient-to-br from-white to-gray-50/50 border-2 border-gray-200 rounded-xl relative group transition-all hover:border-pink-300 hover:shadow-lg">
                             <button
                                onClick={() => removeRoute(idx)}
                                className="absolute top-3 right-3 text-gray-300 hover:text-red-500 p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-md"
                                title="Remove Condition"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                              </button>

                            {/* Condition Logic */}
                            <div className="mb-3 pr-8">
                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2.5 block flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                                  </svg>
                                  Condition Logic
                                </label>
                                <div className="flex gap-2.5 items-end">
                                    {/* Left Side */}
                                    <div className="flex-1">
                                        <div className="text-[10px] text-gray-500 mb-1.5 ml-1 font-semibold">Left operand</div>
                                        <input 
                                            className="w-full text-sm p-2.5 rounded-lg border-2 border-gray-200 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none font-mono text-gray-800 placeholder-gray-400 bg-white shadow-sm transition-all"
                                            placeholder="{{vars.amount}}"
                                            value={leftValue}
                                            onChange={(e) => updateRouteLogic(idx, "left", e.target.value)}
                                        />
                                    </div>

                                    {/* Operator */}
                                    <div className="pb-0.5">
                                         <select
                                            className="text-xs px-2 py-2.5 rounded-lg border-2 border-pink-300 bg-gradient-to-b from-white to-pink-50 font-bold text-pink-600 cursor-pointer hover:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-100 min-w-[100px] shadow-sm transition-all"
                                            value={operator}
                                            onChange={(e) => updateRouteLogic(idx, "operator", e.target.value)}
                                         >
                                             <option value="eq">= (equals)</option>
                                             <option value="ne">!= (not equals)</option>
                                             <option value="gt">&gt; (greater than)</option>
                                             <option value="gte">&gt;= (greater or equal)</option>
                                             <option value="lt">&lt; (less than)</option>
                                             <option value="lte">&lt;= (less or equal)</option>
                                             <option value="and">AND (all true)</option>
                                             <option value="or">OR (any true)</option>
                                             <option value="not">NOT (negate)</option>
                                             <option value="matches">MATCHES (regex)</option>
                                             <option value="like">LIKE (wildcard)</option>
                                             <option value="exists">EXISTS (has value)</option>
                                         </select>
                                    </div>

                                    {/* Right Side */}
                                    <div className="flex-1">
                                        <div className="text-[10px] text-gray-500 mb-1.5 ml-1 font-semibold">Right operand</div>
                                        <input 
                                            className="w-full text-sm p-2.5 rounded-lg border-2 border-gray-200 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none font-mono text-gray-800 placeholder-gray-400 bg-white shadow-sm transition-all"
                                            placeholder="1000 or {{vars.max}}"
                                            value={rightValue}
                                            onChange={(e) => updateRouteLogic(idx, "right", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Target Display */}
                            <div className="pt-3 border-t border-gray-200/70">
                                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2 block flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                  </svg>
                                  Then Go To
                                </label>
                                <TargetNodeDisplay
                                    nodeId={route.goto || ""}
                                    label=""
                                    title="Connect this route handle on the canvas to set destination"
                                />
                            </div>
                        </div>
                    );
                })}

                {routes.length === 0 && (
                    <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-white">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M6 3v12"/><path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/><path d="M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6"/><path d="M18 19a3 3 0 1 1-2.14-5.18"/>
                          </svg>
                        </div>
                        <div className="text-sm text-gray-600 font-semibold">No conditions defined yet</div>
                        <div className="text-xs text-gray-400 mt-1">Click "Add Condition" to create your first rule</div>
                    </div>
                )}
            </div>
       </div>

       {/* Default Route */}
       <div className="border-t-2 border-gray-100 pt-6">
            <div className="mb-3">
                <label className="text-sm font-bold text-gray-800 block flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Default Route (Else)
                </label>
                <p className="text-xs text-gray-500 mt-0.5">Fallback when no conditions match</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                <TargetNodeDisplay
                    nodeId={defaultRoute}
                    label=""
                    title="Connect the default handle on the canvas to set fallback destination"
                />
            </div>
       </div>
    </div>
  );
}
