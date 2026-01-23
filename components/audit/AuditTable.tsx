"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuditEvents } from "@/lib/api";
import AuditFilters from "@/components/audit/AuditFilters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type AuditEvent = {
  id: string;
  createdAt: string;
  userName?: string | null;
  operation?: string | null;
  name?: string | null;
  type?: string | null;
  flowName?: string | null;
};

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
  from.setDate(now.getDate() - 2);
  return { from, to: now };
};

const formatTimestamp = (value?: string) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function AuditTable() {
  const initialRange = useMemo(() => defaultRange(), []);
  const [fromDate, setFromDate] = useState<Date | null>(initialRange.from);
  const [toDate, setToDate] = useState<Date | null>(initialRange.to);
  const [limit, setLimit] = useState(50);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    const from = fromDate ? toIsoRange(fromDate, false) : "";
    const to = toDate ? toIsoRange(toDate, true) : "";
    if ((fromDate && !from) || (toDate && !to) || !from || !to) {
      setError("Please select a valid date range.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getAuditEvents({ from, to, limit });
      const entries = Array.isArray(data?.data) ? data.data : [];
      setEvents(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events.");
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, limit, toDate]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchEvents();
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [fetchEvents]);

  return (
    <div className="flex h-full flex-col gap-4">
      <AuditFilters
        fromDate={fromDate}
        toDate={toDate}
        limit={limit}
        isLoading={isLoading}
        onFromChange={setFromDate}
        onToChange={setToDate}
        onLimitChange={setLimit}
        onRefresh={fetchEvents}
      />
      {error && <div className="text-sm text-destructive">{error}</div>}
      <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-border bg-card">
        {isLoading && events.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No audit events found.
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="min-w-[180px]">Date/Time</TableHead>
                <TableHead className="min-w-[220px]">Id</TableHead>
                <TableHead className="min-w-[200px]">Name</TableHead>
                <TableHead className="min-w-[160px]">Flow</TableHead>
                <TableHead className="min-w-[120px]">Type</TableHead>
                <TableHead className="min-w-[120px]">Operation</TableHead>
                <TableHead className="min-w-[140px]">User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatTimestamp(event.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {event.id ?? "--"}
                  </TableCell>
                  <TableCell className="text-sm text-foreground">
                    {event.name ?? "--"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {event.flowName ?? "--"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {event.type ?? "--"}
                  </TableCell>
                  <TableCell className="text-sm font-semibold text-foreground">
                    {event.operation ?? "--"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {event.userName ?? "--"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
