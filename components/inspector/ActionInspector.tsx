"use client";

import React from "react";
import ActionHeader from "./action/ActionHeader";
import ActionRoutes from "./action/ActionRoutes";
import BodyEditor from "./action/BodyEditor";
import HeadersEditor from "./action/HeadersEditor";
import PersistToggle from "./action/PersistToggle";
import RequestBar from "./action/RequestBar";
import ResponseViewer from "./action/ResponseViewer";
import ResponseMappingEditor from "./action/ResponseMappingEditor";
import { ActionNode, ActionRoute } from "./action/types";

type ActionInspectorProps = {
  node: ActionNode;
  updateNodeData: (id: string, data: Partial<Record<string, unknown>>) => void;
};

export default function ActionInspector({
  node,
  updateNodeData,
}: ActionInspectorProps) {
  const [apiBodyText, setApiBodyText] = React.useState<string>(() =>
    JSON.stringify(node.data.apiBody ?? {}, null, 2)
  );
  const [headerPairs, setHeaderPairs] = React.useState<
    Array<{ id: string; key: string; value: string }>
  >(() => {
    const headers = node.data.headers || {};
    return Object.entries(headers).map(([key, value]) => ({
      id: Math.random().toString(36).substr(2, 9),
      key,
      value: String(value),
    }));
  });
  const [mappingPairs, setMappingPairs] = React.useState<
    Array<{ id: string; key: string; value: string }>
  >(() => {
    const mapping = node.data.responseMapping || {};
    return Object.entries(mapping).map(([key, value]) => ({
      id: Math.random().toString(36).substr(2, 9),
      key,
      value: String(value),
    }));
  });
  const [apiBodyError, setApiBodyError] = React.useState<string | null>(null);
  const [responseStatus, setResponseStatus] = React.useState<number | null>(null);
  const [responseStatusText, setResponseStatusText] = React.useState<string>("");
  const [responseHeaders, setResponseHeaders] = React.useState<
    Record<string, string>
  >({});
  const [responseBody, setResponseBody] = React.useState<string>("");
  const [responseError, setResponseError] = React.useState<string | null>(null);
  const [isSending, setIsSending] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<
    "headers" | "body" | "responseMapping" | "persist" | "routing"
  >("headers");
  const [curlText, setCurlText] = React.useState<string>("");

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const buildResponseOptions = React.useCallback((value: unknown) => {
    const paths = new Set<string>();

    const walk = (current: unknown, prefix: string) => {
      if (current && typeof current === "object" && !Array.isArray(current)) {
        const entries = Object.entries(current as Record<string, unknown>);
        entries.forEach(([key, val]) => {
          const next = prefix ? `${prefix}.${key}` : key;
          paths.add(next);
          walk(val, next);
        });
        return;
      }

      if (Array.isArray(current)) {
        if (prefix) {
          paths.add(prefix);
        }
        if (current.length > 0 && typeof current[0] === "object") {
          walk(current[0], prefix);
        }
      }
    };

    walk(value, "");
    return Array.from(paths);
  }, []);

  const responseOptions = React.useMemo(() => {
    if (!responseBody.trim()) return [];
    try {
      const parsed = JSON.parse(responseBody);
      return buildResponseOptions(parsed);
    } catch {
      return [];
    }
  }, [responseBody, buildResponseOptions]);

  const syncResponseMapping = React.useCallback(
    (pairs: Array<{ id: string; key: string; value: string }>) => {
      const mapping: Record<string, string> = {};
      pairs.forEach((pair) => {
        if (pair.key.trim()) {
          mapping[pair.key] = pair.value;
        }
      });
      updateNodeData(node.id, { responseMapping: mapping });
    },
    [node.id, updateNodeData]
  );
  const parseCurl = React.useCallback((raw: string) => {
    const cleaned = raw.replace(/\\\r?\n/g, " ").trim();
    if (!cleaned.toLowerCase().startsWith("curl ")) {
      return null;
    }

    const tokens: string[] = [];
    let current = "";
    let inSingle = false;
    let inDouble = false;

    for (let i = 0; i < cleaned.length; i += 1) {
      const ch = cleaned[i];
      if (ch === "'" && !inDouble) {
        inSingle = !inSingle;
        continue;
      }
      if (ch === `"` && !inSingle) {
        inDouble = !inDouble;
        continue;
      }
      if (!inSingle && !inDouble && /\s/.test(ch)) {
        if (current) {
          tokens.push(current);
          current = "";
        }
        continue;
      }
      current += ch;
    }
    if (current) {
      tokens.push(current);
    }

    let method = "";
    let url = "";
    const headers: Record<string, string> = {};
    let body = "";

    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (token === "curl") continue;

      if (token === "-X" || token === "--request") {
        method = tokens[i + 1] || method;
        i += 1;
        continue;
      }

      if (token === "-H" || token === "--header") {
        const headerLine = tokens[i + 1] || "";
        i += 1;
        const index = headerLine.indexOf(":");
        if (index !== -1) {
          const key = headerLine.slice(0, index).trim();
          const value = headerLine.slice(index + 1).trim();
          if (key) {
            headers[key] = value;
          }
        }
        continue;
      }

      if (
        token === "--data" ||
        token === "--data-raw" ||
        token === "--data-binary" ||
        token === "-d"
      ) {
        body = tokens[i + 1] || "";
        i += 1;
        continue;
      }

      if (!token.startsWith("-") && !url) {
        url = token;
      }
    }

    if (!method) {
      method = body ? "POST" : "GET";
    }

    return { method, url, headers, body };
  }, []);

  const syncHeaders = React.useCallback(
    (pairs: Array<{ id: string; key: string; value: string }>) => {
      const headers: Record<string, string> = {};
      pairs.forEach((pair) => {
        if (pair.key.trim()) {
          headers[pair.key] = pair.value;
        }
      });
      updateNodeData(node.id, { headers });
    },
    [node.id, updateNodeData]
  );

  return (
    <div className="space-y-6">
      <ActionHeader
        nodeId={node.id}
        name={String(node.data.name ?? "")}
        endpoint={String(node.data.endpoint ?? "")}
        onNameChange={(value) => updateNodeData(node.id, { name: value })}
        onEndpointChange={(value) => updateNodeData(node.id, { endpoint: value })}
      />

      <div className="space-y-3">
        <div className="text-xs font-medium text-gray-600">Request</div>
        <RequestBar
          method={String(node.data.method ?? "POST")}
          endpoint={String(node.data.endpoint ?? "")}
          curlText={curlText}
          isSending={isSending}
          onMethodChange={(value) => updateNodeData(node.id, { method: value })}
          onEndpointChange={(value) =>
            updateNodeData(node.id, { endpoint: value })
          }
          onCurlChange={(value) => setCurlText(value)}
          onImportCurl={() => {
            const parsed = parseCurl(curlText);
            if (!parsed) {
              setResponseError(
                "Invalid curl input. Paste a curl command that starts with 'curl'."
              );
              return;
            }

            updateNodeData(node.id, { method: parsed.method });
            updateNodeData(node.id, { endpoint: parsed.url });

            const pairs = Object.entries(parsed.headers).map(([key, value]) => ({
              id: generateId(),
              key,
              value,
            }));
            setHeaderPairs(pairs);
            syncHeaders(pairs);

            if (parsed.body) {
              setApiBodyText(parsed.body);
              try {
                const parsedBody = JSON.parse(parsed.body);
                setApiBodyError(null);
                updateNodeData(node.id, { apiBody: parsedBody });
              } catch (err) {
                setApiBodyError(
                  err instanceof Error ? err.message : "Invalid JSON"
                );
              }
            }
          }}
          onSend={async () => {
            setResponseError(null);
            setResponseStatus(null);
            setResponseStatusText("");
            setResponseHeaders({});
            setResponseBody("");
            setIsSending(true);

            const endpoint = String(node.data.endpoint ?? "").trim();
            if (!endpoint) {
              setResponseError("Endpoint URL is required.");
              setIsSending(false);
              return;
            }

            const method = String(node.data.method ?? "POST").toUpperCase();
            const headers: Record<string, string> = {};
            headerPairs.forEach((pair) => {
              if (pair.key.trim()) {
                headers[pair.key] = pair.value;
              }
            });

            let body: string | undefined;
            if (method !== "GET" && method !== "HEAD") {
              body = apiBodyText ? apiBodyText : undefined;
            }

            try {
              const response = await fetch(endpoint, {
                method,
                headers,
                body,
              });

              setResponseStatus(response.status);
              setResponseStatusText(response.statusText);

              const headerRecord: Record<string, string> = {};
              response.headers.forEach((value, key) => {
                headerRecord[key] = value;
              });
              setResponseHeaders(headerRecord);

              const text = await response.text();
              setResponseBody(text);
            } catch (err) {
              setResponseError(
                err instanceof Error ? err.message : "Request failed."
              );
            } finally {
              setIsSending(false);
            }
          }}
        />
      </div>

      

      <div>
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
          <button
            className={`px-3 py-1 text-xs font-medium rounded-md ${
              activeSection === "headers"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setActiveSection("headers")}
          >
            Headers
          </button>
          <button
            className={`px-3 py-1 text-xs font-medium rounded-md ${
              activeSection === "body"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setActiveSection("body")}
          >
            Body
          </button>
          <button
            className={`px-3 py-1 text-xs font-medium rounded-md ${
              activeSection === "responseMapping"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setActiveSection("responseMapping")}
          >
            Response Mapping
          </button>
          <button
            className={`px-3 py-1 text-xs font-medium rounded-md ${
              activeSection === "persist"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setActiveSection("persist")}
          >
            Persist Response Mapping
          </button>
          <button
            className={`px-3 py-1 text-xs font-medium rounded-md ${
              activeSection === "routing"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setActiveSection("routing")}
          >
            Routing
          </button>
        </div>

        <div className="mt-4">
          {activeSection === "headers" && (
            <HeadersEditor
              headers={headerPairs}
              onAdd={() => {
                const next = [
                  ...headerPairs,
                  { id: generateId(), key: "", value: "" },
                ];
                setHeaderPairs(next);
              }}
              onRemove={(id) => {
                const next = headerPairs.filter((pair) => pair.id !== id);
                setHeaderPairs(next);
                syncHeaders(next);
              }}
              onUpdate={(id, key, value) => {
                const next = headerPairs.map((pair) =>
                  pair.id === id ? { ...pair, key, value } : pair
                );
                setHeaderPairs(next);
                syncHeaders(next);
              }}
            />
          )}

          {activeSection === "body" && (
            <BodyEditor
              apiBodyText={apiBodyText}
              apiBodyError={apiBodyError}
              onApiBodyChange={(value) => {
                setApiBodyText(value);
                try {
                  const parsed = JSON.parse(value || "{}");
                  setApiBodyError(null);
                  updateNodeData(node.id, { apiBody: parsed });
                } catch (err) {
                  setApiBodyError(
                    err instanceof Error ? err.message : "Invalid JSON"
                  );
                }
              }}
            />
          )}

          {activeSection === "responseMapping" && (
            <ResponseMappingEditor
              mappings={mappingPairs}
              options={responseOptions}
              onAdd={() => {
                const next = [
                  ...mappingPairs,
                  { id: generateId(), key: "", value: "" },
                ];
                setMappingPairs(next);
              }}
              onRemove={(id) => {
                const next = mappingPairs.filter((pair) => pair.id !== id);
                setMappingPairs(next);
                syncResponseMapping(next);
              }}
              onUpdate={(id, key, value) => {
                const next = mappingPairs.map((pair) =>
                  pair.id === id ? { ...pair, key, value } : pair
                );
                setMappingPairs(next);
                syncResponseMapping(next);
              }}
            />
          )}

          {activeSection === "persist" && (
            <PersistToggle
              persistResponseMapping={Boolean(node.data.persistResponseMapping)}
              onPersistResponseMappingChange={(value) =>
                updateNodeData(node.id, { persistResponseMapping: value })
              }
            />
          )}

          {activeSection === "routing" && (
            <ActionRoutes
              routes={node.data.routes || []}
              options={responseOptions}
              defaultNextNode={String(node.data.nextNode ?? "")}
              onAddRoute={() => {
                const currentRoutes = node.data.routes || [];
                const defaultPath = responseOptions[0] || "";
                const condition = defaultPath
                  ? JSON.stringify({
                      eq: [`{{response.${defaultPath}}}`, ""],
                    })
                  : "";
                updateNodeData(node.id, {
                  routes: [
                    ...currentRoutes,
                    {
                      id: generateId(),
                      condition,
                      nextNodeId: "",
                    },
                  ],
                });
              }}
              onRemoveRoute={(index) => {
                const currentRoutes = node.data.routes || [];
                updateNodeData(node.id, {
                  routes: currentRoutes.filter((_, i) => i !== index),
                });
              }}
              onUpdateRoute={(index, route) => {
                const newRoutes: ActionRoute[] = [...(node.data.routes || [])];
                newRoutes[index] = route;
                updateNodeData(node.id, { routes: newRoutes });
              }}
            />
          )}
        </div>
      </div>

      <ResponseViewer
        status={responseStatus}
        statusText={responseStatusText}
        headers={responseHeaders}
        body={responseBody}
        error={responseError}
      />
    </div>
  );
}
