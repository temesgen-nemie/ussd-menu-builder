"use client";

type ParamsEditorProps = {
  params: Array<{ id: string; key: string; value: string }>;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, key: string, value: string) => void;
};

export default function ParamsEditor({
  params,
  onAdd,
  onRemove,
  onUpdate,
}: ParamsEditorProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600">Query Parameters</label>
        <button
          className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded hover:bg-purple-100 transition-colors"
          onClick={onAdd}
        >
          + Add Param
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {params.length === 0 && (
          <div className="text-xs text-gray-400 italic bg-gray-50/50 p-2 rounded-md border border-dashed border-gray-100">
            No query parameters. Adding them here will update the URL.
          </div>
        )}
        {params.map((param) => (
          <div
            key={param.id}
            className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center animate-in fade-in slide-in-from-left-2 duration-200"
          >
            <input
              className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs text-gray-900 shadow-sm focus:border-purple-300 focus:ring-4 focus:ring-purple-500/5 outline-none transition-all"
              placeholder="Key"
              value={param.key}
              onChange={(e) => onUpdate(param.id, e.target.value, param.value)}
            />
            <input
              className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs text-gray-900 shadow-sm focus:border-purple-300 focus:ring-4 focus:ring-purple-500/5 outline-none transition-all"
              placeholder="Value"
              value={param.value}
              onChange={(e) => onUpdate(param.id, param.key, e.target.value)}
            />
            <button
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              onClick={() => onRemove(param.id)}
              title="Remove parameter"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
