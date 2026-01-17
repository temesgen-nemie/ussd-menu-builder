"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getLogs } from "@/lib/api";
import LogsAccordion, { type LogEntry } from "@/components/logs/LogsAccordion";
import LogsFilters from "@/components/logs/LogsFilters";

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
  from.setDate(now.getDate() - 3);
  return { from, to: now };
};

export default function LogsTable() {
  const initialRange = useMemo(() => defaultRange(), []);
  const [fromDate, setFromDate] = useState<Date | null>(initialRange.from);
  const [toDate, setToDate] = useState<Date | null>(initialRange.to);
  const [limit, setLimit] = useState(100);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    const from = toIsoRange(fromDate, false);
    const to = toIsoRange(toDate, true);
    if (!from || !to) {
      setError("Please select a valid date range.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getLogs({ from, to, limit });
      const entries = Array.isArray(data?.data) ? data.data : [];
      setLogs(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs.");
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, limit, toDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="flex flex-col gap-4">
      <LogsFilters
        fromDate={fromDate}
        toDate={toDate}
        limit={limit}
        isLoading={isLoading}
        onFromChange={setFromDate}
        onToChange={setToDate}
        onLimitChange={setLimit}
        onRefresh={fetchLogs}
      />
      {error && <div className="text-sm text-destructive">{error}</div>}
      <div className="max-h-[60vh] overflow-auto">
        <LogsAccordion logs={logs} isLoading={isLoading} />
      </div>
    </div>
  );
}
