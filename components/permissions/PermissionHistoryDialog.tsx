"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPermissionLogs } from "@/lib/api";
import PermissionHistoryFilters from "./PermissionHistoryFilters";
import PaginationControls from "@/components/ui/pagination-controls";

type PermissionLogEntry = {
  id: string;
  flowName: string;
  grantedAt: string | null;
  revokedAt: string | null;
  isActive: boolean;
  assigneeUsername?: string | null;
  actionType?: string | null;
  actionByAdminUsername?: string | null;
};

type PermissionLogsResponse = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  data: PermissionLogEntry[];
};

type PermissionHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const getInitialSize = () => {
  if (typeof window === "undefined") {
    return { width: 1200, height: 820 };
  }
  const width = Math.min(window.innerWidth * 0.94, 1350);
  const height = Math.min(window.innerHeight * 0.88, 820);
  return { width, height };
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function PermissionHistoryDialog({
  open,
  onOpenChange,
}: PermissionHistoryDialogProps) {
  const [logs, setLogs] = useState<PermissionLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const [filters, setFilters] = useState({
    flowName: "",
    assigneeName: "",
    adminName: "",
    actionType: "",
    dateFrom: "",
    dateTo: "",
  });
  const defaultFilters = useMemo(
    () => ({
      flowName: "",
      assigneeName: "",
      adminName: "",
      actionType: "",
      dateFrom: "",
      dateTo: "",
    }),
    []
  );

  const requestParams = useMemo(() => {
    const dateFrom = filters.dateFrom
      ? new Date(filters.dateFrom).toISOString()
      : undefined;
    const dateTo = filters.dateTo
      ? new Date(filters.dateTo).toISOString()
      : undefined;
    return {
      page,
      pageSize,
      flowName: filters.flowName || undefined,
      assigneeName: filters.assigneeName || undefined,
      adminName: filters.adminName || undefined,
      actionType: filters.actionType || undefined,
      dateFrom,
      dateTo,
    };
  }, [filters, page, pageSize]);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = (await getPermissionLogs(requestParams)) as PermissionLogsResponse;
      setLogs(Array.isArray(data?.data) ? data.data : []);
      setTotalPages(Number(data?.totalPages ?? 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch permission logs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, page, pageSize]);

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

  const handleSearch = async () => {
    setIsSearching(true);
    setError(null);
    setPage(1);
    try {
      const data = (await getPermissionLogs({
        page: 1,
        pageSize,
        flowName: filters.flowName || undefined,
        assigneeName: filters.assigneeName || undefined,
        adminName: filters.adminName || undefined,
        actionType: filters.actionType || undefined,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom).toISOString() : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo).toISOString() : undefined,
      })) as PermissionLogsResponse;
      setLogs(Array.isArray(data?.data) ? data.data : []);
      setTotalPages(Number(data?.totalPages ?? 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch permission logs.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    setFilters(defaultFilters);
    setPage(1);
    setPageSize(20);
    try {
      const data = (await getPermissionLogs({
        page: 1,
        pageSize: 20,
      })) as PermissionLogsResponse;
      setLogs(Array.isArray(data?.data) ? data.data : []);
      setTotalPages(Number(data?.totalPages ?? 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch permission logs.");
    } finally {
      setIsResetting(false);
    }
  };

  if (!open) return null;

  const modalStyle: CSSProperties = {
    position: "fixed",
    left: `calc(50% + ${offset.x}px + clamp(80px, 12vw, 300px))`,
    top: `calc(50% + ${offset.y}px + clamp(450px, 18vh, 450px))`,
    transform: "translate(-50%, -50%)",
    width: size.width > 0 ? size.width : undefined,
    height: size.height > 0 ? size.height : undefined,
    maxHeight: "90vh",
    maxWidth: "95vw",
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
            if ((event.target as HTMLElement).closest("button")) return;
            setDragStart({
              x: event.clientX - offset.x,
              y: event.clientY - offset.y,
            });
            setIsDragging(true);
          }}
          className="relative flex items-start justify-between gap-4 border-b border-border bg-card/95 px-6 py-4 cursor-grab active:cursor-grabbing"
        >
          <div>
            <div className="text-lg font-bold text-foreground">Permission History</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Review permission changes across flows.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Close permission history"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-6">
          <div className="flex h-full min-h-0 flex-col gap-4">
            <PermissionHistoryFilters
              flowName={filters.flowName}
              assigneeName={filters.assigneeName}
              adminName={filters.adminName}
              actionType={filters.actionType}
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              pageSize={pageSize}
              isLoading={isLoading}
              isSearching={isSearching}
              isResetting={isResetting}
              onChange={(next) => {
                setFilters({
                  flowName: next.flowName,
                  assigneeName: next.assigneeName,
                  adminName: next.adminName,
                  actionType: next.actionType,
                  dateFrom: next.dateFrom,
                  dateTo: next.dateTo,
                });
                setPageSize(next.pageSize);
              }}
              onSearch={handleSearch}
              onReset={handleReset}
            />

            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <div className="flex-1 min-h-0 rounded-xl border border-border bg-card overflow-hidden">
                {error ? (
                  <div className="p-4 text-sm text-destructive">{error}</div>
                ) : (
                  <div className="h-full overflow-auto">
                    <div className="min-w-245">
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-card">
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Flow</TableHead>
                            <TableHead>Assigned User</TableHead>
                            <TableHead>Assigned By</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading ? (
                            Array.from({ length: 10 }).map((_, row) => (
                              <TableRow key={`perm-skel-${row}`} className="animate-pulse">
                                {Array.from({ length: 5 }).map((__, col) => (
                                  <TableCell key={`perm-skel-${row}-${col}`}>
                                    <div className="h-3 w-full rounded-full bg-muted/60" />
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))
                          ) : logs.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                                No permission history found.
                              </TableCell>
                            </TableRow>
                          ) : (
                            logs.map((entry) => (
                              <TableRow key={entry.id}>
                                <TableCell className="text-xs text-muted-foreground">
                                  {formatDate(entry.revokedAt ?? entry.grantedAt)}
                                </TableCell>
                                <TableCell className="text-xs font-semibold">
                                  <span
                                    className={
                                      (entry.actionType ?? (entry.isActive ? "Granted" : "Revoked")) ===
                                      "Granted"
                                        ? "inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                                        : "inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800"
                                    }
                                  >
                                    {entry.actionType ?? (entry.isActive ? "Granted" : "Revoked")}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs">{entry.flowName}</TableCell>
                                <TableCell className="text-xs">{entry.assigneeUsername ?? "—"}</TableCell>
                                <TableCell className="text-xs">{entry.actionByAdminUsername ?? "—"}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
                <div>
                  Page {page} of {totalPages}
                </div>
                <PaginationControls
                  page={page}
                  totalPages={totalPages}
                  disabled={isLoading}
                  onPageChange={setPage}
                  className="w-auto"
                />
              </div>
            </div>
          </div>
        </div>

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
      </div>
    </div>
  );
}
