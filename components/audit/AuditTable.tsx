"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuditEvents } from "@/lib/api";
import AuditFilters from "@/components/audit/AuditFilters";
import AuditDiffDialog from "@/components/audit/AuditDiffDialog";
import PaginationControls from "@/components/ui/pagination-controls";
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
  totalPages?: number;
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
  return { from: now, to: now };
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
  const [limit, setLimit] = useState(10);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<AuditMeta>({});
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
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
      const data = await getAuditEvents({
        from,
        to,
        limit,
        page,
        q: query.trim() || undefined,
      });
      const entries: AuditEvent[] = Array.isArray(data?.data) ? data.data : [];
      setEvents(entries);
      setMeta({
        page: typeof data?.meta?.page === "number" ? data.meta.page : page,
        limit: typeof data?.meta?.limit === "number" ? data.meta.limit : limit,
        totalPages:
          typeof data?.meta?.totalPages === "number" ? data.meta.totalPages : undefined,
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
      setIsSearching(false);
    }
  }, [fromDate, limit, page, query, toDate]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchEvents();
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [fetchEvents]);

  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, limit, query]);

  const totalPages = useMemo(() => {
    if (typeof meta.totalPages === "number") {
      return Math.max(1, meta.totalPages);
    }
    return 1;
  }, [meta.totalPages]);

  return (
    <div className="flex h-full flex-col gap-4">
      <AuditFilters
        fromDate={fromDate}
        toDate={toDate}
        limit={limit}
        query={query}
        isSearching={isSearching}
        onFromChange={setFromDate}
        onToChange={setToDate}
        onLimitChange={setLimit}
        onQueryChange={(value) => {
          setIsSearching(true);
          setQuery(value);
        }}
      />
      {error && <div className="text-sm text-destructive">{error}</div>}
      <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-border bg-card">
        {isLoading ? (
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
              {Array.from({ length: 13 }).map((_, index) => (
                <TableRow key={`audit-skeleton-${index}`} className="animate-pulse">
                  {Array.from({ length: 7 }).map((__, cellIndex) => (
                    <TableCell key={`audit-skeleton-cell-${index}-${cellIndex}`}>
                      <div className="h-3 w-full rounded-full bg-muted/60" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
          {meta.totalPages !== undefined && (
            <span className="ml-2 text-muted-foreground/80">
              ({meta.totalPages} pages)
            </span>
          )}
        </div>
        <PaginationControls
          page={page}
          totalPages={totalPages}
          disabled={isLoading}
          onPageChange={setPage}
          className="w-auto"
        />
      </div>

      <AuditDiffDialog
        event={selectedEvent}
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
        onMutationSuccess={fetchEvents}
      />
    </div>
  );
}
