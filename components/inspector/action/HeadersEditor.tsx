"use client";

type HeadersEditorProps = {
  headers: Array<{ id: string; key: string; value: string }>;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, key: string, value: string) => void;
};

export default function HeadersEditor({
  headers,
  onAdd,
  onRemove,
  onUpdate,
}: HeadersEditorProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600">Headers</label>
        <button
          className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100"
          onClick={onAdd}
        >
          + Add Header
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {headers.length === 0 && (
          <div className="text-xs text-gray-400">
            No headers added yet.
          </div>
        )}
        {headers.map((header) => (
          <div
            key={header.id}
            className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center"
          >
            <input
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 shadow-sm"
              placeholder="Header name"
              value={header.key}
              onChange={(e) => onUpdate(header.id, e.target.value, header.value)}
            />
            <input
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 shadow-sm"
              placeholder="Header value"
              value={header.value}
              onChange={(e) => onUpdate(header.id, header.key, e.target.value)}
            />
            <button
              className="text-xs text-gray-400 hover:text-red-500 px-2"
              onClick={() => onRemove(header.id)}
              title="Remove header"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
