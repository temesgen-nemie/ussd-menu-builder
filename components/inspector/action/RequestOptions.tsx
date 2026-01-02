"use client";

type RequestOptionsProps = {
  apiBodyText: string;
  headersText: string;
  responseMapText: string;
  apiBodyError: string | null;
  headersError: string | null;
  responseMapError: string | null;
  persistResponseMapping: boolean;
  onApiBodyChange: (value: string) => void;
  onHeadersChange: (value: string) => void;
  onResponseMapChange: (value: string) => void;
  onPersistResponseMappingChange: (value: boolean) => void;
};

export default function RequestOptions({
  apiBodyText,
  headersText,
  responseMapText,
  apiBodyError,
  headersError,
  responseMapError,
  persistResponseMapping,
  onApiBodyChange,
  onHeadersChange,
  onResponseMapChange,
  onPersistResponseMappingChange,
}: RequestOptionsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-600">Headers (JSON)</label>
        <textarea
          className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm font-mono text-sm placeholder-gray-400 text-gray-900"
          value={headersText}
          rows={4}
          onChange={(e) => onHeadersChange(e.target.value)}
        />
        {headersError && (
          <div className="text-xs text-red-500 mt-1">{headersError}</div>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">Body (JSON)</label>
        <textarea
          className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm font-mono text-sm placeholder-gray-400 text-gray-900"
          value={apiBodyText}
          rows={6}
          onChange={(e) => onApiBodyChange(e.target.value)}
        />
        {apiBodyError && (
          <div className="text-xs text-red-500 mt-1">{apiBodyError}</div>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">
          Response Mapping (JSON)
        </label>
        <textarea
          className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm font-mono text-sm placeholder-gray-400 text-gray-900"
          value={responseMapText}
          rows={4}
          onChange={(e) => onResponseMapChange(e.target.value)}
        />
        {responseMapError && (
          <div className="text-xs text-red-500 mt-1">{responseMapError}</div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-gray-600">
          Persist Response Mapping
        </label>
        <input
          type="checkbox"
          checked={persistResponseMapping}
          onChange={(e) => onPersistResponseMappingChange(e.target.checked)}
        />
      </div>
    </div>
  );
}
