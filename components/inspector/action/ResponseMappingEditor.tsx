"use client";

type ResponseMappingEditorProps = {
  mappings: Array<{ id: string; key: string; value: string }>;
  options: string[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, key: string, value: string) => void;
};

export default function ResponseMappingEditor({
  mappings,
  options,
  onAdd,
  onRemove,
  onUpdate,
}: ResponseMappingEditorProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600">
          Response Mapping
        </label>
        <button
          className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100"
          onClick={onAdd}
        >
          + Add Mapping
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {mappings.length === 0 && (
          <div className="text-xs text-gray-400">
            No mappings added yet.
          </div>
        )}
        {mappings.map((mapping) => {
          const optionValues = options.map(
            (path) => `{{response.${path}}}`
          );
          const hasValue =
            mapping.value !== "" && optionValues.includes(mapping.value);

          return (
            <div
              key={mapping.id}
              className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center"
            >
              <input
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 shadow-sm"
                placeholder="Field name"
                value={mapping.key}
                onChange={(e) =>
                  onUpdate(mapping.id, e.target.value, mapping.value)
                }
              />
              <select
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 shadow-sm"
                value={mapping.value}
                onChange={(e) =>
                  onUpdate(mapping.id, mapping.key, e.target.value)
                }
              >
                <option value="">Select response field</option>
                {options.map((path, index) => {
                  const value = `{{response.${path}}}`;
                  return (
                    <option key={`${value}-${index}`} value={value}>
                      {path}
                    </option>
                  );
                })}
                {!hasValue && mapping.value && (
                  <option value={mapping.value}>
                    Custom: {mapping.value}
                  </option>
                )}
              </select>
              <button
                className="text-xs text-gray-400 hover:text-red-500 px-2"
                onClick={() => onRemove(mapping.id)}
                title="Remove mapping"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
