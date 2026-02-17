"use client";

type RequestBarProps = {
  method: string;
  endpoint: string;
  curlText: string;
  isSending: boolean;
  baseUrlToken?: string;
  baseUrlValue?: string;
  onClearBaseUrl?: () => void;
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
  onClearBaseUrl,
  onMethodChange,
  onEndpointChange,
  onCurlChange,
  onImportCurl,
  onSend,
}: RequestBarProps) {
  const parseAbsoluteUrl = (value: string): URL | null => {
    try {
      return new URL(value);
    } catch {
      return null;
    }
  };
  const LEVENSHTEIN_THRESHOLD = 2;

  const levenshtein = (left: string, right: string) => {
    const a = left.toLowerCase();
    const b = right.toLowerCase();
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const dp = Array.from({ length: a.length + 1 }, () =>
      Array<number>(b.length + 1).fill(0)
    );

    for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
    for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;

    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }

    return dp[a.length][b.length];
  };

  const token = baseUrlToken ?? "";
  const normalizedEndpoint = endpoint || "";
  const normalizedBase =
    baseUrlValue?.replace(/\/+$/, "") ?? "";
  const baseUrl = parseAbsoluteUrl(normalizedBase);
  const endpointUrl = parseAbsoluteUrl(normalizedEndpoint);

  const normalizePath = (value: string) => {
    const trimmed = value.replace(/\/+$/, "");
    return trimmed || "/";
  };

  const basePath = baseUrl ? normalizePath(baseUrl.pathname) : "";
  const endpointPath = endpointUrl ? normalizePath(endpointUrl.pathname) : "";
  const baseSegments =
    basePath === "/" ? [] : basePath.split("/").filter(Boolean);
  const endpointSegments =
    endpointPath === "/" ? [] : endpointPath.split("/").filter(Boolean);

  const isStrictPathMatch = Boolean(
    baseUrl &&
      endpointUrl &&
      basePath !== "/" &&
      (endpointPath === basePath || endpointPath.startsWith(`${basePath}/`))
  );

  const isStrictBaseMatch = (() => {
    // Prefer path-safe strict matching to avoid partial segment bugs:
    // e.g. "/v1/starpay" should NOT match "/v1/starpay-api".
    if (isStrictPathMatch) return true;

    // Fallback for non-URL values: still enforce boundary after base prefix.
    if (!normalizedBase || !normalizedEndpoint.startsWith(normalizedBase)) {
      return false;
    }
    const nextChar = normalizedEndpoint[normalizedBase.length];
    return !nextChar || nextChar === "/" || nextChar === "?" || nextChar === "#";
  })();
  const isLooseLevenshteinMatch = (() => {
    if (!baseUrl || !endpointUrl) return false;
    if (baseSegments.length === 0) return false;
    if (endpointSegments.length < baseSegments.length) return false;

    const sharedPrefixCount = baseSegments.length - 1;
    for (let i = 0; i < sharedPrefixCount; i += 1) {
      if (baseSegments[i].toLowerCase() !== endpointSegments[i].toLowerCase()) {
        return false;
      }
    }

    const baseLast = baseSegments[baseSegments.length - 1];
    const endpointComparable = endpointSegments[baseSegments.length - 1];
    return (
      levenshtein(baseLast, endpointComparable) <= LEVENSHTEIN_THRESHOLD
    );
  })();
  const isLoosePathMatch = Boolean(
    baseUrl &&
      endpointUrl &&
      basePath !== "/" &&
      (isStrictPathMatch || isLooseLevenshteinMatch)
  );

  const displayEndpoint = (() => {
    if (isStrictBaseMatch) {
      if (baseUrl && endpointUrl) {
        const relativePathSegments = endpointSegments.slice(baseSegments.length);
        const relativePath = relativePathSegments.join("/");
        const relative = `${relativePath}${endpointUrl.search}${endpointUrl.hash}`;
        return relative.replace(/^\/+/, "");
      }
      return normalizedEndpoint.slice(normalizedBase.length).replace(/^\/+/, "");
    }
    if (isLoosePathMatch && endpointUrl) {
      const relativePathSegments = endpointSegments.slice(baseSegments.length);
      const relativePath = relativePathSegments.join("/");
      const relative = `${relativePath}${endpointUrl.search}${endpointUrl.hash}`;
      return relative.replace(/^\/+/, "");
    }
    return normalizedEndpoint;
  })();

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
            <span className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
              <span title={baseUrlValue}>{baseUrlToken}</span>
              {onClearBaseUrl && (
                <button
                  type="button"
                  className="ml-0.5 inline-flex h-3 w-3 items-center justify-center rounded-full text-indigo-600 hover:bg-indigo-100 cursor-pointer"
                  aria-label="Remove base URL"
                  title="Remove base URL"
                  onClick={onClearBaseUrl}
                >
                  ×
                </button>
              )}
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
