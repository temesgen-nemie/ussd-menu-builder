"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import LogsAccordion, { type LogEntry } from "@/components/logs/LogsAccordion";
import BackendLogsTable from "@/components/logs/BackendLogsTable";
import LogsTable from "@/components/logs/LogsTable";
import RedisInspector from "@/components/logs/RedisInspector";
import { API_BASE_URL } from "@/lib/api";

type LogsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type LogsCategory = "flow" | "backend" | "redis";
type TabKey = "fetch" | "live";

type LogsModalContentProps = {
  onOpenChange: (open: boolean) => void;
};

const getInitialSize = () => {
  if (typeof window === "undefined") {
    return { width: 1100, height: 760 };
  }
  const isCompact = window.innerWidth < 768;
  const width = Math.min(window.innerWidth * (isCompact ? 0.98 : 0.9), 1100);
  const height = Math.min(window.innerHeight * (isCompact ? 0.94 : 0.85), 760);
  return { width, height };
};

const BACKEND_LIVE_LOGS_URL =
  "wss://sau.eaglelionsystems.com/v1.0/superappussd/cps/logs/live";

type BackendLiveMessage = {
  type?: string;
  timestamp?: string;
  data?: {
    timestamp?: string;
    level?: string;
    message?: string;
    raw?: string;
    service?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number | string;
    networkLog?: unknown;
    [key: string]: unknown;
  };
};

const normalizeBackendLiveLog = (
  payload: BackendLiveMessage,
  sequence: number
): LogEntry | null => {
  if (payload.type === "heartbeat") return null;

  const entry = payload.data;
  if (!entry) return null;

  return {
    __logId: `backend-live-${Date.now()}-${sequence}`,
    timestamp: entry.timestamp ?? payload.timestamp,
    level: entry.level,
    method: entry.method,
    path: typeof entry.endpoint === "string" ? entry.endpoint : undefined,
    statusCode: entry.statusCode,
    message: entry.message,
    service_name: typeof entry.service === "string" ? entry.service : undefined,
    Response: entry.networkLog,
    raw: entry.raw,
    sourceType: payload.type,
    ...entry,
  };
};

function LogsModalContent({ onOpenChange }: LogsModalContentProps) {
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 1440 : window.innerWidth,
    height: typeof window === "undefined" ? 900 : window.innerHeight,
  }));
  const [activeCategory, setActiveCategory] = useState<LogsCategory>("flow");
  const [activeFlowTab, setActiveFlowTab] = useState<TabKey>("fetch");
  const [activeBackendTab, setActiveBackendTab] = useState<TabKey>("fetch");
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);
  const [liveRaw, setLiveRaw] = useState<string[]>([]);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [backendLiveLogs, setBackendLiveLogs] = useState<LogEntry[]>([]);
  const [backendLiveRaw, setBackendLiveRaw] = useState<string[]>([]);
  const [isBackendLiveConnected, setIsBackendLiveConnected] = useState(false);
  const [isTerminalMode, setIsTerminalMode] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState(getInitialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const modalRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const liveLogSeqRef = useRef(0);
  const backendLiveLogSeqRef = useRef(0);
  const isCompactViewport = viewport.width < 640;

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let socketUrl = API_BASE_URL + "/admin/logs/stream";

  socketUrl = socketUrl
    .replace("https://", "wss://")
    .replace("http://", "ws://");

  const socket = new WebSocket(socketUrl);

  socket.addEventListener("open", () => {
    setIsLiveConnected(true);
  });

  socket.addEventListener("close", () => {
    setIsLiveConnected(false);
  });

  socket.addEventListener("error", () => {
    setIsLiveConnected(false);
  });

  socket.addEventListener("message", (event) => {
    setLiveRaw((prev) => {
      const next = [event.data, ...prev];
      return next.slice(0, 500);
    });

    try {
      const parsed = JSON.parse(event.data) as LogEntry;
      const liveLog = {
        ...parsed,
        __logId: `live-${Date.now()}-${liveLogSeqRef.current++}`,
      } as LogEntry;

      setLiveLogs((prev) => {
        const next = [liveLog, ...prev];
        return next.slice(0, 500);
      });
    } catch {
      // ignore malformed messages
    }
  });

  return () => {
    socket.close();
  };
}, []);

  useEffect(() => {
    if (activeCategory !== "backend" || activeBackendTab !== "live") return;

    const socket = new WebSocket(BACKEND_LIVE_LOGS_URL);

    socket.addEventListener("open", () => {
      setIsBackendLiveConnected(true);
    });

    socket.addEventListener("close", () => {
      setIsBackendLiveConnected(false);
    });

    socket.addEventListener("error", () => {
      setIsBackendLiveConnected(false);
    });

    socket.addEventListener("message", (event) => {
      try {
        const parsed = JSON.parse(event.data) as BackendLiveMessage;
        if (parsed.type === "heartbeat") return;

        setBackendLiveRaw((prev) => {
          const next = [event.data, ...prev];
          return next.slice(0, 500);
        });

        const normalized = normalizeBackendLiveLog(
          parsed,
          backendLiveLogSeqRef.current++
        );

        if (!normalized) return;

        setBackendLiveLogs((prev) => {
          const next = [normalized, ...prev];
          return next.slice(0, 500);
        });
      } catch {
        // ignore malformed messages
      }
    });

    return () => {
      socket.close();
    };
  }, [activeBackendTab, activeCategory]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging) {
        setOffset({
          x: event.clientX - dragStart.x,
          y: event.clientY - dragStart.y,
        });
      } else if (isResizing) {
        const deltaX = event.clientX - resizeStart.x;
        const deltaY = event.clientY - resizeStart.y;
        setSize({
          width: Math.max(720, resizeStart.width + deltaX),
          height: Math.max(420, resizeStart.height + deltaY),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragStart, isDragging, isResizing, resizeStart]);

  useEffect(() => {
    const isFlowTerminalActive =
      activeCategory === "flow" && activeFlowTab === "live";
    const isBackendTerminalActive =
      activeCategory === "backend" && activeBackendTab === "live";

    if ((!isFlowTerminalActive && !isBackendTerminalActive) || !isTerminalMode) {
      return;
    }

    const node = terminalRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [activeBackendTab, activeCategory, activeFlowTab, backendLiveRaw, isTerminalMode, liveRaw]);

  const parseNestedJson = (value: unknown, depth = 0): unknown => {
    if (depth > 4) return value;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        try {
          const parsed = JSON.parse(trimmed);
          return parseNestedJson(parsed, depth + 1);
        } catch {
          return value;
        }
      }
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => parseNestedJson(item, depth + 1));
    }
    if (value && typeof value === "object") {
      return Object.entries(value as Record<string, unknown>).reduce(
        (acc, [key, val]) => {
          acc[key] = parseNestedJson(val, depth + 1);
          return acc;
        },
        {} as Record<string, unknown>,
      );
    }
    return value;
  };

  const formatTerminalLine = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      const normalized = parseNestedJson(parsed);
      return JSON.stringify(normalized, null, 2);
    } catch {
      return value;
    }
  };

  const modalStyle: CSSProperties = {
    position: "fixed",
    left: isCompactViewport
      ? "1vw"
      : `calc(50% + ${offset.x}px + clamp(80px, 12vw, 300px))`,
    top: isCompactViewport
      ? "2vh"
      : `calc(50% + ${offset.y}px + clamp(450px, 18vh, 450px))`,
    transform: isCompactViewport ? undefined : "translate(-50%, -50%)",
    width: isCompactViewport
      ? "98vw"
      : size.width > 0
        ? Math.min(size.width, viewport.width * 0.95)
        : undefined,
    height: isCompactViewport
      ? "96vh"
      : size.height > 0
        ? Math.min(size.height, viewport.height * 0.9)
        : undefined,
    maxHeight: isCompactViewport ? "96vh" : "90vh",
    maxWidth: isCompactViewport ? "98vw" : "95vw",
  };

  return (
    <div className="fixed inset-0 z-100000 pointer-events-none">
      <div
        ref={modalRef}
        style={modalStyle}
        className="rounded-xl bg-card text-card-foreground shadow-2xl ring-1 ring-black/5 flex flex-col overflow-hidden pointer-events-auto transition-none"
      >
        <div
          onMouseDown={(event) => {
            if (isCompactViewport) return;
            if ((event.target as HTMLElement).closest("button")) return;
            setDragStart({
              x: event.clientX - offset.x,
              y: event.clientY - offset.y,
            });
            setIsDragging(true);
          }}
          className={`relative flex flex-col gap-4 border-b border-border bg-card/95 px-4 py-4 md:px-6 ${
            isCompactViewport ? "" : "cursor-grab active:cursor-grabbing"
          }`}
        >
          <div className="flex items-start justify-between gap-3 md:justify-start">
            <div>
            <div className="text-lg font-bold text-foreground">USSD Logs</div>
            {activeCategory === "flow" && activeFlowTab === "live" ? (
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isLiveConnected
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                      : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200"
                  }`}
                >
                  {isLiveConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            ) : activeCategory === "backend" && activeBackendTab === "live" ? (
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isBackendLiveConnected
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                      : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200"
                  }`}
                >
                  {isBackendLiveConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            ) : null}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground md:hidden"
              aria-label="Close logs"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:pointer-events-none md:absolute md:left-1/2 md:top-4 md:-translate-x-1/2">
            <button
              type="button"
              onClick={() => setActiveCategory("flow")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all md:pointer-events-auto ${
                activeCategory === "flow"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Flow Logs
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("backend")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all md:pointer-events-auto ${
                activeCategory === "backend"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Backend Logs
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("redis")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all md:pointer-events-auto ${
                activeCategory === "redis"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Redis
            </button>
          </div>
          <div className="hidden flex-col items-end gap-2 md:flex">
            <div className="flex items-center gap-2">
              {(activeCategory === "flow" && activeFlowTab === "live") ||
              (activeCategory === "backend" && activeBackendTab === "live") ? (
                <button
                  type="button"
                  onClick={() => setIsTerminalMode((prev) => !prev)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    isTerminalMode
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Terminal Mode
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label="Close logs"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div
          className={`flex-1 p-3 md:p-6 ${
            isCompactViewport ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden"
          }`}
        >
          {activeCategory === "flow" ? (
            <div
              className={`flex flex-col gap-4 ${
                isCompactViewport ? "min-h-full" : "h-full overflow-hidden"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveFlowTab("fetch")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeFlowTab === "fetch"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Fetch Logs
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFlowTab("live")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeFlowTab === "live"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Live Logs
                </button>
              </div>

              <div className={isCompactViewport ? "" : "flex-1 overflow-hidden"}>
                {activeFlowTab === "fetch" ? (
                  <LogsTable />
                ) : (
                  <div className="flex h-full min-h-0 flex-col overflow-hidden">
                    {isTerminalMode ? (
                      <div className="flex h-full flex-col rounded-2xl border border-border bg-slate-50 text-slate-900 shadow-sm dark:bg-slate-900/70 dark:text-slate-100">
                        <div className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                          Live Stream
                        </div>
                        <div
                          ref={terminalRef}
                          className="min-h-0 flex-1 overflow-auto px-4 py-3 font-mono text-[11px] leading-5 text-slate-900 dark:text-slate-100"
                        >
                          {liveRaw.length === 0 ? (
                            <div className="text-slate-500 dark:text-slate-400">
                              Waiting for logs...
                            </div>
                          ) : (
                            liveRaw
                              .slice()
                              .reverse()
                              .map((line, index, lines) => (
                                <pre
                                  key={`${index}-${line.slice(0, 24)}`}
                                  className={`mb-3 whitespace-pre-wrap wrap-break-word rounded-lg border bg-white/80 p-3 shadow-sm last:mb-0 dark:bg-slate-900/60 ${
                                    index === lines.length - 1
                                      ? "border-blue-400 ring-1 ring-blue-400/60 dark:border-blue-300 dark:ring-blue-300/50"
                                      : "border-border/60"
                                  }`}
                                >
                                  {formatTerminalLine(line)}
                                </pre>
                              ))
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 min-h-0 overflow-auto">
                        <LogsAccordion logs={liveLogs} isLoading={!isLiveConnected} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : activeCategory === "backend" ? (
            <div
              className={`flex flex-col gap-4 ${
                isCompactViewport ? "min-h-full" : "h-full overflow-hidden"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveBackendTab("fetch")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeBackendTab === "fetch"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Fetch Backend Logs
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBackendTab("live")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeBackendTab === "live"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Live Backend Logs
                </button>
              </div>

              <div className={isCompactViewport ? "" : "flex-1 overflow-hidden"}>
                {activeBackendTab === "fetch" ? (
                  <BackendLogsTable />
                ) : (
                  <div className="flex h-full min-h-0 flex-col overflow-hidden">
                    {isTerminalMode ? (
                      <div className="flex h-full flex-col rounded-2xl border border-border bg-slate-50 text-slate-900 shadow-sm dark:bg-slate-900/70 dark:text-slate-100">
                        <div className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                          Live Stream
                        </div>
                        <div
                          ref={terminalRef}
                          className="min-h-0 flex-1 overflow-auto px-4 py-3 font-mono text-[11px] leading-5 text-slate-900 dark:text-slate-100"
                        >
                          {backendLiveRaw.length === 0 ? (
                            <div className="text-slate-500 dark:text-slate-400">
                              Waiting for logs...
                            </div>
                          ) : (
                            backendLiveRaw
                              .slice()
                              .reverse()
                              .map((line, index, lines) => (
                                <pre
                                  key={`${index}-${line.slice(0, 24)}`}
                                  className={`mb-3 whitespace-pre-wrap wrap-break-word rounded-lg border bg-white/80 p-3 shadow-sm last:mb-0 dark:bg-slate-900/60 ${
                                    index === lines.length - 1
                                      ? "border-blue-400 ring-1 ring-blue-400/60 dark:border-blue-300 dark:ring-blue-300/50"
                                      : "border-border/60"
                                  }`}
                                >
                                  {formatTerminalLine(line)}
                                </pre>
                              ))
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 min-h-0 overflow-auto">
                        <LogsAccordion
                          logs={backendLiveLogs}
                          isLoading={!isBackendLiveConnected}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              className={`flex flex-col gap-4 ${
                isCompactViewport ? "min-h-full" : "h-full overflow-hidden"
              }`}
            >
              <div className={isCompactViewport ? "" : "flex-1 overflow-hidden"}>
                <RedisInspector />
              </div>
            </div>
          )}
        </div>

        {!isCompactViewport ? (
          <div
            onMouseDown={(event) => {
              event.stopPropagation();
              setResizeStart({
                x: event.clientX,
                y: event.clientY,
                width: modalRef.current?.offsetWidth || size.width,
                height: modalRef.current?.offsetHeight || size.height,
              });
              setIsResizing(true);
            }}
            className="absolute bottom-2 right-2 h-4 w-4 cursor-nwse-resize"
          >
            <div className="h-full w-full border-b-2 border-r-2 border-muted-foreground/40" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function LogsModal({ open, onOpenChange }: LogsModalProps) {
  if (!open) return null;
  return <LogsModalContent onOpenChange={onOpenChange} />;
}
