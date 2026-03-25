"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LogsAccordion, { type LogEntry } from "@/components/logs/LogsAccordion";
import { fetchBackendLogs } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDownIcon } from "lucide-react";

const toIsoRange = (value: Date | null, isEnd: boolean) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (isEnd) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date.toISOString();
};

const defaultRange = () => {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - 1);
  return { from, to: now };
};

function BackendLogsSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-slate-50/80 text-card-foreground shadow-sm dark:bg-slate-900/40 overflow-hidden">
      <div className="grid grid-cols-[120px_90px_90px_1fr_90px_90px_160px] gap-2 border-b border-border px-4 py-3 text-xs font-medium uppercase text-left bg-linear-to-r from-indigo-500/80 via-purple-500/80 to-violet-500/80 text-white/90 shadow-sm shadow-indigo-200/30 backdrop-blur dark:from-slate-800 dark:via-slate-700 dark:to-slate-700 dark:text-slate-100 dark:shadow-slate-900/40">
        <div>Time</div>
        <div>Level</div>
        <div>Method</div>
        <div>Endpoint</div>
        <div>Status</div>
        <div>Duration</div>
        <div>IP</div>
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-[120px_90px_90px_1fr_90px_90px_160px] gap-2 px-4 py-4 animate-pulse"
          >
            <div className="h-4 w-16 rounded bg-muted/70" />
            <div className="h-4 w-12 rounded bg-muted/70" />
            <div className="h-6 w-12 rounded-full bg-muted/70" />
            <div className="h-4 w-4/5 rounded bg-muted/70" />
            <div className="h-6 w-10 rounded-full bg-muted/70" />
            <div className="h-6 w-8 rounded-full bg-muted/70" />
            <div className="h-4 w-20 rounded bg-muted/70" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BackendLogsTable() {
  const initialRange = useMemo(() => defaultRange(), []);
  const hasFetchedInitially = useRef(false);
  const [fromDate, setFromDate] = useState<Date | null>(initialRange.from);
  const [toDate, setToDate] = useState<Date | null>(initialRange.to);
  const [limit, setLimit] = useState(10);
  const previousLimit = useRef(limit);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [meta, setMeta] = useState<{
    total?: number;
    returned?: number;
    logDir?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const handleFetch = useCallback(async () => {
    const from = fromDate ? toIsoRange(fromDate, false) : "";
    const to = toDate ? toIsoRange(toDate, true) : "";

    if (!from || !to) {
      setError("Please select a valid date range.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchBackendLogs({
        from,
        to,
        limit,
      });

      const items = Array.isArray(response.data?.items) ? response.data.items : [];
      const normalizedLogs: LogEntry[] = items.map((item, index) => ({
        __logId: `backend-${item.timestamp ?? "no-time"}-${index}`,
        timestamp: item.timestamp,
        level: item.level,
        method: item.method,
        path: typeof item.endpoint === "string" ? item.endpoint : undefined,
        statusCode: item.statusCode,
        message: item.message,
        service_name: typeof item.service === "string" ? item.service : undefined,
        Response: item.networkLog,
        raw: item.raw,
        ...item,
      }));

      setLogs(normalizedLogs);
      setMeta({
        total: response.data?.total,
        returned: response.data?.returned,
        logDir: response.data?.logDir,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load backend logs.");
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate, limit]);

  useEffect(() => {
    if (hasFetchedInitially.current) return;
    hasFetchedInitially.current = true;
    void handleFetch();
  }, [handleFetch]);

  useEffect(() => {
    if (!hasFetchedInitially.current) return;
    if (previousLimit.current === limit) return;
    previousLimit.current = limit;
    void handleFetch();
  }, [handleFetch, limit]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
          <div className="flex flex-col gap-3">
            <Label className="px-1 text-xs uppercase text-muted-foreground">
              From
            </Label>
            <Popover open={fromOpen} onOpenChange={setFromOpen}>
              <PopoverTrigger asChild className="cursor-pointer">
                <Button
                  variant="outline"
                  className="w-full justify-between font-normal"
                >
                  {fromDate ? fromDate.toLocaleDateString() : "Select date"}
                  <ChevronDownIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate ?? undefined}
                  captionLayout="dropdown"
                  onSelect={(date) => {
                    setFromDate(date ?? null);
                    setFromOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-3">
            <Label className="px-1 text-xs uppercase text-muted-foreground">
              To
            </Label>
            <Popover open={toOpen} onOpenChange={setToOpen}>
              <PopoverTrigger asChild className="cursor-pointer">
                <Button
                  variant="outline"
                  className="w-full justify-between font-normal"
                >
                  {toDate ? toDate.toLocaleDateString() : "Select date"}
                  <ChevronDownIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate ?? undefined}
                  captionLayout="dropdown"
                  onSelect={(date) => {
                    setToDate(date ?? null);
                    setToOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-3">
            <Label className="px-1 text-xs uppercase text-muted-foreground">
              Limit
            </Label>
            <Select
              value={String(limit)}
              onValueChange={(value) => setLimit(Number(value))}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder="Select limit" />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100, 200, 500].map((value) => (
                  <SelectItem
                    key={value}
                    value={String(value)}
                    className="cursor-pointer"
                  >
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleFetch}
              disabled={isLoading}
              className="h-10 w-full cursor-pointer rounded-md bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-200/40 hover:from-indigo-500 hover:via-purple-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-60 dark:from-slate-800 dark:via-slate-700 dark:to-slate-700 dark:text-slate-100 dark:shadow-slate-900/40 dark:hover:from-slate-700 dark:hover:via-slate-600 dark:hover:to-slate-600"
            >
              {isLoading ? "Loading..." : "Fetch Backend Logs"}
            </button>
          </div>
        </div>

        {meta ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Total: {meta.total ?? "--"}</span>
            <span>Returned: {meta.returned ?? "--"}</span>
            {meta.logDir ? <span>Dir: {meta.logDir}</span> : null}
          </div>
        ) : null}
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <div className="flex-1 min-h-0 overflow-auto">
        {isLoading ? <BackendLogsSkeleton /> : <LogsAccordion logs={logs} isLoading={isLoading} />}
      </div>
    </div>
  );
}
