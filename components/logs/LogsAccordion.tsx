"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export type LogEntry = {
  timestamp?: string;
  level?: string;
  method?: string;
  path?: string;
  status?: number | string;
  statusCode?: number | string;
  durationMs?: number;
  ip?: string;
  ip_address?: string;
  message?: string;
  Message?: string;
  action?: string;
  service_name?: string;
  environment?: string;
  session_id?: string | null;
  trace_id?: string | null;
  user_id?: string | null;
  Request?: unknown;
  Response?: unknown;
  device_info?: unknown;
};

type LogsAccordionProps = {
  logs: LogEntry[];
  isLoading: boolean;
};

const formatTime = (value?: string) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "--";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return JSON.stringify(value, null, 2);
};

const formatTimestamp = (value: unknown) => {
  if (!value) return "--";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const statusStyle = (value: unknown) => {
  const statusNum = Number(value);
  if (Number.isNaN(statusNum)) return "bg-muted text-muted-foreground";
  if (statusNum >= 200 && statusNum < 300) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
  }
  if (statusNum >= 300 && statusNum < 400) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200";
  }
  return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
};

const methodStyle = (value: string | undefined) => {
  switch ((value || "").toUpperCase()) {
    case "GET":
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200";
    case "POST":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
    case "DELETE":
      return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
    case "PUT":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200";
    case "PATCH":
      return "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const durationStyle = (value: unknown) => {
  const durationNum = Number(value);
  if (Number.isNaN(durationNum)) return "bg-muted text-muted-foreground";
  if (durationNum < 100) return "bg-muted text-muted-foreground";
  if (durationNum <= 500) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200";
  }
  return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
};

export default function LogsAccordion({ logs, isLoading }: LogsAccordionProps) {
  return (
    <div className="rounded-2xl border border-border bg-slate-50/80 text-card-foreground shadow-sm dark:bg-slate-900/40">
      <div className="min-w-[900px]">
        <div className="grid grid-cols-[120px_90px_90px_1fr_90px_90px_160px] gap-2 border-b border-border px-4 py-3 text-xs font-medium uppercase text-left bg-gradient-to-r from-indigo-500/80 via-purple-500/80 to-violet-500/80 text-white/90 shadow-sm shadow-indigo-200/30 backdrop-blur dark:from-slate-800 dark:via-slate-700 dark:to-slate-700 dark:text-slate-100 dark:shadow-slate-900/40">
          <div>Time</div>
          <div>Level</div>
          <div>Method</div>
          <div>Endpoint</div>
          <div>Status</div>
          <div>Duration</div>
          <div>IP</div>
        </div>
        <Accordion type="single" collapsible>
          {logs.length === 0 && !isLoading ? (
            <div className="py-10 text-center text-muted-foreground">
              No logs found for this range.
            </div>
          ) : (
            logs.map((log, index) => {
              const status = log.status ?? log.statusCode ?? "--";
              const ip = log.ip ?? log.ip_address ?? "--";
              const duration =
                typeof log.durationMs === "number"
                  ? `${log.durationMs}ms`
                  : "--";

              const details: Array<[string, unknown]> = [
                ["Timestamp", formatTimestamp(log.timestamp)],
                ["Level", log.level],
                ["Method", log.method],
                ["Endpoint", log.path],
                ["Status", log.status],
                ["Status Code", log.statusCode],
                ["Duration (ms)", log.durationMs],
                ["IP", log.ip ?? log.ip_address],
                ["Message", log.message ?? log.Message],
                ["Action", log.action],
                ["Service", log.service_name],
                ["Environment", log.environment],
                ["Session ID", log.session_id],
                ["Trace ID", log.trace_id],
                ["User ID", log.user_id],
                ["Request", log.Request],
                ["Response", log.Response],
                ["Device Info", log.device_info],
              ];

              return (
                <AccordionItem key={`${log.timestamp}-${index}`} value={`${index}`}>
                  <AccordionTrigger className="px-4 py-0 hover:no-underline cursor-pointer">
                    <div className="grid w-full grid-cols-[120px_90px_90px_1fr_90px_90px_160px] gap-2 py-3 text-sm text-foreground">
                      <div className="font-medium">{formatTime(log.timestamp)}</div>
                      <div className="uppercase text-muted-foreground">
                        {log.level ?? "--"}
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${methodStyle(
                            log.method
                          )}`}
                        >
                          {log.method ?? "--"}
                        </span>
                      </div>
                      <div className="truncate text-muted-foreground">
                        {log.path ?? "--"}
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${durationStyle(
                            log.durationMs
                          )}`}
                        >
                          {duration}
                        </span>
                      </div>
                      <div>{ip}</div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      {details.map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-lg border border-border bg-slate-100/70 p-3 dark:bg-slate-800/50"
                        >
                          <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                            {label}
                          </div>
                          {label === "Status" || label === "Status Code" ? (
                            <div className="mt-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle(
                                  value
                                )}`}
                              >
                                {formatValue(value)}
                              </span>
                            </div>
                          ) : label === "Duration (ms)" ? (
                            <div className="mt-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${durationStyle(
                                  value
                                )}`}
                              >
                                {formatValue(value)}
                              </span>
                            </div>
                          ) : label === "Method" ? (
                            <div className="mt-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${methodStyle(
                                  typeof value === "string" ? value : ""
                                )}`}
                              >
                                {formatValue(value)}
                              </span>
                            </div>
                          ) : (
                            <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-foreground">
                              {formatValue(value)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })
          )}
        </Accordion>
      </div>
    </div>
  );
}
