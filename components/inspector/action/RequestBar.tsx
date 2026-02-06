"use client";

type RequestBarProps = {
  method: string;
  endpoint: string;
  curlText: string;
  isSending: boolean;
  baseUrlToken?: string;
  baseUrlValue?: string;
  onMethodChange: (value: string) => void;
  onEndpointChange: (value: string) => void;
  onCurlChange: (value: string) => void;
  onImportCurl: () => void;
  onSend: () => void;
};

export default function RequestBar({
  method,
  endpoint,
  curlText,
  isSending,
  baseUrlToken,
  baseUrlValue,
  onMethodChange,
  onEndpointChange,
  onCurlChange,
  onImportCurl,
  onSend,
}: RequestBarProps) {
  const token = baseUrlToken ?? "";
  const normalizedEndpoint = endpoint || "";
  const normalizedBase =
    baseUrlValue?.replace(/\/+$/, "") ?? "";
  const displayEndpoint =
    normalizedBase && normalizedEndpoint.startsWith(normalizedBase)
      ? normalizedEndpoint.slice(normalizedBase.length).replace(/^\/+/, "")
      : normalizedEndpoint;

  return (
    <div className="space-y-3">
         <div className="rounded-md border border-gray-200 bg-white p-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold text-gray-500 uppercase">
            cURL Import
          </label>
          <button
            className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100"
            onClick={onImportCurl}
          >
            Import cURL
          </button>
        </div>
        <textarea
          className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm font-mono text-xs placeholder-gray-400 text-gray-900"
          rows={4}
          value={curlText}
          onChange={(e) => onCurlChange(e.target.value)}
          placeholder="Paste a curl command here..."
        />
      </div>
      <div className="flex items-stretch gap-2">
        <select
          className="w-28 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm"
          value={method}
          onChange={(e) => onMethodChange(e.target.value)}
        >
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>DELETE</option>
        </select>
        <div className="relative flex-1">
          {baseUrlToken && (
            <span
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700"
              title={baseUrlValue}
            >
              {baseUrlToken}
            </span>
          )}
          <input
            className={`w-full rounded-md border border-gray-200 bg-white py-2 text-sm text-gray-900 shadow-sm ${
              baseUrlToken ? "pl-24 pr-3" : "px-3"
            }`}
            value={displayEndpoint}
            placeholder="https://api.example.com"
            onChange={(e) => {
              const value = e.target.value;
              if (token && normalizedBase) {
                const trimmed = value.replace(/^\/+/, "");
                onEndpointChange(trimmed ? `${normalizedBase}/${trimmed}` : normalizedBase);
                return;
              }
              onEndpointChange(value);
            }}
          />
        </div>
        <button
          className={`rounded-md px-4 text-sm font-semibold text-white shadow-sm cursor-pointer ${
            isSending
              ? "bg-indigo-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
          onClick={onSend}
          disabled={isSending}
        >
          <span className="inline-flex items-center gap-2">
            {isSending && (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {isSending ? "Sending" : "Send"}
          </span>
        </button>
      </div>
   
    </div>
  );
}
