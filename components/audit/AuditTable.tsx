"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuditEvents } from "@/lib/api";
import AuditFilters from "@/components/audit/AuditFilters";
import AuditDiffDialog from "@/components/audit/AuditDiffDialog";
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
  before?: unknown;
  after?: unknown;
};

type AuditMeta = {
  page?: number;
  limit?: number;
  total?: number;
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
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<AuditMeta>({});
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
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
      const data = await getAuditEvents({ from, to, limit, page });
      const entries: AuditEvent[] = Array.isArray(data?.data) ? data.data : [];
      setEvents(entries);
      setMeta({
        page: typeof data?.meta?.page === "number" ? data.meta.page : page,
        limit: typeof data?.meta?.limit === "number" ? data.meta.limit : limit,
        total: typeof data?.meta?.total === "number" ? data.meta.total : undefined,
      });
      setSelectedEvent((current) => {
        if (!current) return current;
        const next = entries.find((entry) => entry.id === current.id);
        return next ?? current;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events.");
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, limit, page, toDate]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchEvents();
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [fetchEvents]);

  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, limit]);

  const totalPages = useMemo(() => {
    if (!meta.total || !limit) return 1;
    return Math.max(1, Math.ceil(meta.total / limit));
  }, [limit, meta.total]);

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
                <TableHead className="min-w-45">Date/Time</TableHead>
                <TableHead className="min-w-55">Id</TableHead>
                <TableHead className="min-w-50">Name</TableHead>
                <TableHead className="min-w-40">Flow</TableHead>
                <TableHead className="min-w-30">Type</TableHead>
                <TableHead className="min-w-30">Operation</TableHead>
                <TableHead className="min-w-35">User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow
                  key={event.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => setSelectedEvent(event)}
                >
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
        <div>
          Page {page} of {totalPages}
          {meta.total !== undefined && (
            <span className="ml-2 text-muted-foreground/80">
              ({meta.total} total)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={isLoading || page <= 1}
          >
            Prev
          </button>
          <button
            type="button"
            className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={isLoading || page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>

      <AuditDiffDialog
        event={selectedEvent}
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
      />
    </div>
  );
}
