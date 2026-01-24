"use client";

import React from "react";
import ActionHeader from "./action/ActionHeader";
import ActionRoutes from "./action/ActionRoutes";
import BodyEditor from "./action/BodyEditor";
import HeadersEditor from "./action/HeadersEditor";

import RequestBar from "./action/RequestBar";
import ResponseViewer from "./action/ResponseViewer";
import ResponseMappingEditor from "./action/ResponseMappingEditor";
import ParamsEditor from "./action/ParamsEditor";
import { ActionNode, ActionRoute } from "./action/types";
import { useActionRequestStore, type StoredResponse } from "@/store/actionRequestStore";

type ActionInspectorProps = {
  node: ActionNode;
  updateNodeData: (id: string, data: Partial<Record<string, unknown>>) => void;
};

export default function ActionInspector({
  node,
  updateNodeData,
}: ActionInspectorProps) {
  const bodyMode = (node.data.bodyMode as "json" | "soap") ?? "json";
  const [apiBodyText, setApiBodyText] = React.useState<string>(() => {
    if (bodyMode === "soap") {
      return String(node.data.apiBodyRaw ?? "");
    }
    return JSON.stringify(node.data.apiBody ?? {}, null, 2);
  });
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
    Array<{ id: string; key: string; value: string; persist: boolean; encrypt: boolean }>
  >(() => {
    const mapping = node.data.responseMapping || {};
    const persisted = new Set(node.data.persistResponseMappingKeys || []);
    const encrypted = new Set(node.data.encryptResponseMappingKeys || []);
    return Object.entries(mapping).map(([key, value]) => ({
      id: Math.random().toString(36).substr(2, 9),
      key,
      value: String(value),
      persist: persisted.has(key),
      encrypt: encrypted.has(key),
    }));
  });
  const [apiBodyError, setApiBodyError] = React.useState<string | null>(null);
  const {
    curlTextByNodeId,
    responsesByNodeId,
    setCurlText,
    setResponse,
    updateResponse,
  } = useActionRequestStore();
  const storedResponse = React.useMemo<StoredResponse>(
    () =>
      responsesByNodeId[node.id] ?? {
        status: null,
        statusText: "",
        headers: {},
        body: "",
        error: null,
      },
    [node.id, responsesByNodeId]
  );
  const [isSending, setIsSending] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<
    "params" | "headers" | "body" | "responseMapping" | "routing"
  >("params");
  const [sourceMode, setSourceMode] = React.useState<"api" | "local">(
    (node.data.requestSource as "api" | "local") ?? "api"
  );
  const curlText = curlTextByNodeId[node.id] ?? "";

  const [paramPairs, setParamPairs] = React.useState<
    Array<{ id: string; key: string; value: string }>
  >(() => {
    const ep = String(node.data.endpoint ?? "");
    try {
      if (ep.includes("?")) {
        const query = ep.split("?")[1];
        const searchParams = new URLSearchParams(query);
        return Array.from(searchParams.entries()).map(([key, value]) => ({
          id: Math.random().toString(36).substr(2, 9),
          key,
          value,
        }));
      }
    } catch {}
    return [];
  });

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

  const buildXmlResponseOptions = React.useCallback((xmlText: string) => {
    if (typeof window === "undefined") return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    if (doc.getElementsByTagName("parsererror").length > 0) {
      return [];
    }

    const paths = new Set<string>();
    const walk = (node: Element, prefix: string) => {
      const children = Array.from(node.children);
      if (children.length === 0) {
        if (prefix) paths.add(prefix);
        return;
      }
      children.forEach((child) => {
        const tag = child.tagName;
        const next = prefix ? `${prefix}.${tag}` : tag;
        paths.add(next);
        walk(child, next);
      });
    };

    const root = doc.documentElement;
    if (!root) return [];
    walk(root, root.tagName);
    return Array.from(paths);
  }, []);

  const responseOptions = React.useMemo(() => {
    const body = storedResponse.body.trim();
    if (!body) return [];
    try {
      const parsed = JSON.parse(body);
      return buildResponseOptions(parsed);
    } catch {
      if (body.startsWith("<")) {
        return buildXmlResponseOptions(body);
      }
      return [];
    }
  }, [storedResponse.body, buildResponseOptions, buildXmlResponseOptions]);

  React.useEffect(() => {
    if (bodyMode === "soap") {
      setApiBodyText(String(node.data.apiBodyRaw ?? ""));
      setApiBodyError(null);
      return;
    }
    setApiBodyText(JSON.stringify(node.data.apiBody ?? {}, null, 2));
    setApiBodyError(null);
  }, [bodyMode, node.data.apiBody, node.data.apiBodyRaw, node.id]);

  React.useEffect(() => {
    const current = String(node.data.dataSource ?? "").trim();
    if (!current) {
      updateNodeData(node.id, { dataSource: "Input Manager" });
    }
  }, [node.data.dataSource, node.id, updateNodeData]);

  React.useEffect(() => {
    if (!node.data.requestSource) {
      updateNodeData(node.id, { requestSource: "api" });
    }
  }, [node.data.requestSource, node.id, updateNodeData]);

  const syncResponseMapping = React.useCallback(
    (pairs: Array<{ id: string; key: string; value: string; persist: boolean; encrypt: boolean }>) => {
      const mapping: Record<string, string> = {};
      const persistKeys: string[] = [];
      const encryptKeys: string[] = [];
      pairs.forEach((pair) => {
        if (pair.key.trim()) {
          mapping[pair.key] = pair.value;
          if (pair.persist) persistKeys.push(pair.key.trim());
          if (pair.encrypt) encryptKeys.push(pair.key.trim());
        }
      });
      updateNodeData(node.id, { 
        responseMapping: mapping,
        persistResponseMappingKeys: persistKeys,
        encryptResponseMappingKeys: encryptKeys
      });
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

  const syncParamsToUrl = (
    pairs: Array<{ id: string; key: string; value: string }>
  ) => {
    const currentEp = String(node.data.endpoint ?? "");
    const baseUrl = currentEp.split("?")[0];

    const queryString = pairs
      .filter((p) => p.key.trim())
      .map((p) => `${p.key}=${p.value ?? ""}`)
      .join("&");

    const newEndpoint = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    updateNodeData(node.id, { endpoint: newEndpoint });
  };

  const syncUrlToParams = (newUrl: string) => {
    try {
      if (newUrl.includes("?")) {
        const query = newUrl.split("?")[1];
        const newPairs = query
          .split("&")
          .filter((pair) => pair !== "")
          .map((pair) => {
            const [rawKey, ...rest] = pair.split("=");
            return {
              id: generateId(),
              key: rawKey ?? "",
              value: rest.join("=") ?? "",
            };
          });
        setParamPairs(newPairs);
      } else {
        setParamPairs([]);
      }
    } catch {}
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <ActionHeader
        nodeId={node.id}
        name={String(node.data.name ?? "")}
        endpoint={String(node.data.endpoint ?? "")}
        onNameChange={(value) => updateNodeData(node.id, { name: value })}
        onEndpointChange={(value) => {
          updateNodeData(node.id, { endpoint: value });
          syncUrlToParams(value);
        }}
      />

      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          className={`px-3 py-1 text-xs font-medium rounded-md ${
            sourceMode === "api"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          onClick={() => {
            setSourceMode("api");
            updateNodeData(node.id, { requestSource: "api" });
          }}
        >
          From API
        </button>
        <button
          className={`px-3 py-1 text-xs font-medium rounded-md ${
            sourceMode === "local"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          onClick={() => {
            setSourceMode("local");
            updateNodeData(node.id, { requestSource: "local" });
          }}
        >
          From Local Storage
        </button>
      </div>

      {sourceMode === "api" && (
        <>
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
              onCurlChange={(value) => setCurlText(node.id, value)}
              onImportCurl={() => {
                const parsed = parseCurl(curlText);
                if (!parsed) {
                  updateResponse(node.id, {
                    error:
                      "Invalid curl input. Paste a curl command that starts with 'curl'.",
                  });
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
                  const trimmed = parsed.body.trim();
                  const looksXml = trimmed.startsWith("<");
                  if (looksXml) {
                    updateNodeData(node.id, {
                      bodyMode: "soap",
                      apiBodyRaw: parsed.body,
                    });
                    setApiBodyText(parsed.body);
                    setApiBodyError(null);
                  } else {
                    updateNodeData(node.id, { bodyMode: "json" });
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
                }
              }}
              onSend={async () => {
                setResponse(node.id, {
                  status: null,
                  statusText: "",
                  headers: {},
                  body: "",
                  error: null,
                });
                setIsSending(true);

                const endpoint = String(node.data.endpoint ?? "").trim();
                if (!endpoint) {
                  updateResponse(node.id, {
                    error: "Endpoint URL is required.",
                  });
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

                  updateResponse(node.id, {
                    status: response.status,
                    statusText: response.statusText,
                  });

                  const headerRecord: Record<string, string> = {};
                  response.headers.forEach((value, key) => {
                    headerRecord[key] = value;
                  });
                  updateResponse(node.id, { headers: headerRecord });

                  const text = await response.text();
                  updateResponse(node.id, { body: text });
                } catch (err) {
                  updateResponse(node.id, {
                    error: err instanceof Error ? err.message : "Request failed.",
                  });
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
                  activeSection === "params"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                onClick={() => setActiveSection("params")}
              >
                Params
              </button>
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
              {activeSection === "params" && (
                <ParamsEditor
                  params={paramPairs}
                  onAdd={() => {
                    const next = [...paramPairs, { id: generateId(), key: "", value: "" }];
                    setParamPairs(next);
                  }}
                  onRemove={(id: string) => {
                    const next = paramPairs.filter((p) => p.id !== id);
                    setParamPairs(next);
                    syncParamsToUrl(next);
                  }}
                  onUpdate={(id: string, key: string, value: string) => {
                    const next = paramPairs.map((p) =>
                      p.id === id ? { ...p, key, value } : p
                    );
                    setParamPairs(next);
                    syncParamsToUrl(next);
                  }}
                />
              )}

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
                  bodyMode={bodyMode}
                  onBodyModeChange={(value) => {
                    updateNodeData(node.id, { bodyMode: value });
                    if (value === "soap") {
                      updateNodeData(node.id, { apiBodyRaw: apiBodyText });
                      setApiBodyError(null);
                      return;
                    }
                    try {
                      const parsed = JSON.parse(apiBodyText || "{}");
                      setApiBodyError(null);
                      updateNodeData(node.id, { apiBody: parsed });
                    } catch (err) {
                      setApiBodyError(
                        err instanceof Error ? err.message : "Invalid JSON"
                      );
                    }
                  }}
                  onApiBodyChange={(value) => {
                    setApiBodyText(value);
                    if (bodyMode === "soap") {
                      updateNodeData(node.id, { apiBodyRaw: value });
                      setApiBodyError(null);
                      return;
                    }
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
                      { id: generateId(), key: "", value: "", persist: false, encrypt: false },
                    ];
                    setMappingPairs(next);
                  }}
                  onRemove={(id) => {
                    const next = mappingPairs.filter((pair) => pair.id !== id);
                    setMappingPairs(next);
                    syncResponseMapping(next);
                  }}
                  onUpdate={(id, key, value, persist, encrypt) => {
                    const next = mappingPairs.map((pair) =>
                      pair.id === id ? { ...pair, key, value, persist, encrypt } : pair
                    );
                    setMappingPairs(next);
                    syncResponseMapping(next);
                  }}
                />
              )}



              {activeSection === "routing" && (
                <ActionRoutes
                  routes={node.data.routes || []}
                  options={responseOptions}
                  defaultNextNode={node.data.nextNode}
                  onAddRoute={() => {
                    const currentRoutes = node.data.routes || [];
                    const defaultPath = responseOptions[0] || "";
                    const condition = JSON.stringify({
                      eq: [`{{response.${defaultPath}}}`, ""],
                    });
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
            status={storedResponse.status}
            statusText={storedResponse.statusText}
            headers={storedResponse.headers}
            body={storedResponse.body}
            error={storedResponse.error}
          />
        </>
      )}

      {sourceMode === "local" && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">
                Data Source
              </label>
              <input
                className="mt-2 w-full rounded-md border border-gray-200 p-2 bg-white shadow-sm text-sm text-gray-900"
                placeholder="source"
                value={String(node.data.dataSource ?? "")}
                onChange={(e) =>
                  updateNodeData(node.id, { dataSource: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">
                Field
              </label>
              <input
                className="mt-2 w-full rounded-md border border-gray-200 p-2 bg-white shadow-sm text-sm text-gray-900"
                placeholder="e.g. userAccounts"
                value={String(node.data.field ?? "")}
                onChange={(e) =>
                  updateNodeData(node.id, { field: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">
                Output Variable
              </label>
              <input
                className="mt-2 w-full rounded-md border border-gray-200 p-2 bg-white shadow-sm text-sm text-gray-900"
                placeholder="e.g. accountsMenu"
                value={String(node.data.outputVar ?? "")}
                onChange={(e) =>
                  updateNodeData(node.id, { outputVar: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">
                Format
              </label>
              <select
                className="mt-2 w-full rounded-md border border-gray-200 p-2 bg-white shadow-sm text-sm text-gray-900"
                value={String(node.data.format ?? "indexedList")}
                onChange={(e) =>
                  updateNodeData(node.id, {
                    format: e.target.value as "indexedList" | "singleValue",
                  })
                }
              >
                <option value="indexedList">indexedList</option>
                <option value="singleValue">singleValue</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
