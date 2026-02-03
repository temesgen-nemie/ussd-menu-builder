"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuditEvents, updateNodeById, updateFlow, type UpdateFlowPayload } from "@/lib/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

type DiffStatus = "added" | "removed";

type Line = {
  text: string;
  status?: DiffStatus;
};

type DiffMaps = {
  beforeMap: Record<string, DiffStatus>;
  afterMap: Record<string, DiffStatus>;
};

type AuditHistoryItem = {
  id: string;
  createdAt: string;
  name?: string | null;
  userName?: string | null;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
};

const isObjectLike = (value: unknown) =>
  typeof value === "object" && value !== null;

const isPlainObject = (value: unknown) =>
  isObjectLike(value) && !Array.isArray(value);

const safeStringify = (value: unknown) => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const deepEqual = (a: unknown, b: unknown) => safeStringify(a) === safeStringify(b);

const markPath = (map: Record<string, DiffStatus>, path: string, status: DiffStatus) => {
  map[path] = status;
};

const diffValues = (
  before: unknown,
  after: unknown,
  path: string,
  maps: DiffMaps,
) => {
  if (before === undefined && after === undefined) return;

  if (before === undefined) {
    markPath(maps.afterMap, path, "added");
    return;
  }

  if (after === undefined) {
    markPath(maps.beforeMap, path, "removed");
    return;
  }

  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([
      ...Object.keys(before as Record<string, unknown>),
      ...Object.keys(after as Record<string, unknown>),
    ]);

    keys.forEach((key) => {
      diffValues(
        (before as Record<string, unknown>)[key],
        (after as Record<string, unknown>)[key],
        `${path}.${key}`,
        maps,
      );
    });
    return;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const max = Math.max(before.length, after.length);
    for (let index = 0; index < max; index += 1) {
      diffValues(before[index], after[index], `${path}.${index}`, maps);
    }
    return;
  }

  if (!deepEqual(before, after)) {
    markPath(maps.beforeMap, path, "removed");
    markPath(maps.afterMap, path, "added");
  }
};

const indent = (depth: number) => "  ".repeat(depth);

const normalizeLine = (text: string) => text.trimStart();

const buildJsonLines = (
  value: unknown,
  diffMap: Record<string, DiffStatus>,
  path = "root",
  depth = 0,
): Line[] => {
  const status = diffMap[path];

  if (!isObjectLike(value)) {
    return [
      {
        text: `${indent(depth)}${JSON.stringify(value)}`,
        status,
      },
    ];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [{ text: `${indent(depth)}[]`, status }];
    }

    const lines: Line[] = [{ text: `${indent(depth)}[`, status }];
    value.forEach((item, index) => {
      const childPath = `${path}.${index}`;
      const childStatus = diffMap[childPath] ?? status;
      const childLines = buildJsonLines(item, diffMap, childPath, depth + 1);
      childLines.forEach((line, lineIndex) => {
        const isLastLine = lineIndex === childLines.length - 1;
        const isLastItem = index === value.length - 1;
        const comma = isLastLine && !isLastItem ? "," : "";
        lines.push({
          text: `${indent(depth + 1)}${normalizeLine(line.text)}${comma}`,
          status: childStatus ?? line.status,
        });
      });
    });
    lines.push({ text: `${indent(depth)}]`, status });
    return lines;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return [{ text: `${indent(depth)}{}`, status }];
  }

  const lines: Line[] = [{ text: `${indent(depth)}{`, status }];
  entries.forEach(([key, childValue], entryIndex) => {
    const childPath = `${path}.${key}`;
    const childStatus = diffMap[childPath] ?? status;
    const childLines = buildJsonLines(childValue, diffMap, childPath, depth + 1);
    childLines.forEach((line, lineIndex) => {
      const isFirst = lineIndex === 0;
      const isLastLine = lineIndex === childLines.length - 1;
      const isLastEntry = entryIndex === entries.length - 1;
      const comma = isLastLine && !isLastEntry ? "," : "";

      if (isFirst) {
        lines.push({
          text: `${indent(depth + 1)}"${key}": ${normalizeLine(line.text)}${comma}`,
          status: childStatus ?? line.status,
        });
        return;
      }

      lines.push({
        text: `${indent(depth + 1)}${normalizeLine(line.text)}${comma}`,
        status: childStatus ?? line.status,
      });
    });
  });
  lines.push({ text: `${indent(depth)}}`, status });
  return lines;
};

const getMarkerClass = (status?: DiffStatus) => {
  if (status === "added") return "text-emerald-600";
  if (status === "removed") return "text-rose-600";
  return "text-muted-foreground";
};

const getLineHighlightClass = (status?: DiffStatus) => {
  if (status === "added") return "bg-emerald-50 text-emerald-900";
  if (status === "removed") return "bg-rose-50 text-rose-900";
  return "";
};

const getMarker = (status?: DiffStatus) => {
  if (status === "added") return "+";
  if (status === "removed") return "-";
  return " ";
};

type AuditRevertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queryId: string | null;
  entityType?: string | null;
  flowName?: string | null;
  mode: "revert" | "merge";
  onSuccess?: () => void;
};

const formatTimestamp = (value?: string) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const toJsonText = (value: unknown) => JSON.stringify(value ?? null, null, 2);

const copyJsonToClipboard = (label: string, value: unknown) => {
  let payload = "null";
  if (typeof value === "string") {
    payload = value;
  } else {
    try {
      payload = JSON.stringify(value ?? null, null, 2);
    } catch {
      payload = String(value ?? "");
    }
  }
  navigator.clipboard
    .writeText(payload)
    .then(() => toast.success(`${label} JSON copied`))
    .catch(() => toast.error("Failed to copy JSON"));
};

export default function AuditRevertDialog({
  open,
  onOpenChange,
  queryId,
  entityType,
  flowName,
  mode,
  onSuccess,
}: AuditRevertDialogProps) {
  const beforeScrollRef = useRef<HTMLDivElement>(null);
  const afterScrollRef = useRef<HTMLDivElement>(null);
  const editableScrollRef = useRef<HTMLTextAreaElement>(null);
  const isSyncingRef = useRef(false);
  const [syncEnabled, setSyncEnabled] = useState(true);

  const [items, setItems] = useState<AuditHistoryItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editableJson, setEditableJson] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const selectedItem = items[selectedIndex];

  const latestAfter = useMemo(() => (items[0]?.after ?? null), [items]);
  const selectedBefore = useMemo(() => selectedItem?.before ?? null, [selectedItem]);
  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const canViewMore = visibleCount < items.length;
  const canViewLess = visibleCount > 10;
  const { beforeLines, afterLines } = useMemo(() => {
    const maps: DiffMaps = { beforeMap: {}, afterMap: {} };
    diffValues(selectedBefore ?? null, latestAfter ?? null, "root", maps);
    return {
      beforeLines: buildJsonLines(selectedBefore ?? null, maps.beforeMap),
      afterLines: buildJsonLines(latestAfter ?? null, maps.afterMap),
    };
  }, [latestAfter, selectedBefore]);

  const loadHistory = useCallback(async () => {
    if (!queryId) return;
    setIsLoading(true);
    setError(null);
    try {
      const from = new Date(0).toISOString();
      const to = new Date().toISOString();
      const data = await getAuditEvents({ from, to, limit: 50, page: 1, q: queryId });
      const entries: AuditHistoryItem[] = Array.isArray(data?.data)
        ? data.data.map((entry: AuditHistoryItem & { username?: string | null }) => ({
            ...entry,
            userName: entry.userName ?? entry.username ?? null,
          }))
        : [];
      setItems(entries);
      setSelectedIndex(0);
      setEditableJson(toJsonText(entries[0]?.after ?? null));
      setVisibleCount(10);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history.");
    } finally {
      setIsLoading(false);
    }
  }, [queryId]);

  useEffect(() => {
    if (!open) return;
    loadHistory();
  }, [loadHistory, open]);

  useEffect(() => {
    if (!open) return;
    setSaveError(null);
    setSaveSuccess(null);
  }, [open, mode]);

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
  };

  const handleConfirm = async () => {
    if (!selectedItem?.entityId) {
      setSaveError("Missing entity id for revert.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const isFlow = String(entityType ?? "").toLowerCase() === "flow";
      if (mode === "revert") {
        if (isFlow) {
          if (!flowName) {
            setSaveError("Missing flow name for flow revert.");
            setIsSaving(false);
            return;
          }
          const basePayload = selectedItem.before ?? null;
          const flowPayload: UpdateFlowPayload =
            (basePayload && typeof basePayload === "object"
              ? (basePayload as UpdateFlowPayload)
              : ({} as UpdateFlowPayload));
          await updateFlow(flowName, flowPayload, "revert");
        } else {
          await updateNodeById(
            selectedItem.entityId,
            { node: selectedItem.before ?? null },
            "revert"
          );
        }
      } else {
        let parsed: unknown;
        try {
          parsed = JSON.parse(editableJson);
        } catch {
          setSaveError("Edited JSON is invalid.");
          setIsSaving(false);
          return;
        }
        if (isFlow) {
          if (!flowName) {
            setSaveError("Missing flow name for flow merge.");
            setIsSaving(false);
            return;
          }
          const flowPayload: UpdateFlowPayload =
            parsed && typeof parsed === "object"
              ? (parsed as UpdateFlowPayload)
              : ({} as UpdateFlowPayload);
          await updateFlow(flowName, flowPayload, "merge");
        } else {
          await updateNodeById(
            selectedItem.entityId,
            { node: parsed },
            "merge"
          );
        }
      }
      setSaveSuccess("Update applied successfully.");
      toast.success(mode === "merge" ? "Merge applied." : "Revert applied.");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to update.");
    } finally {
      setIsSaving(false);
    }
  };

  const title =
    mode === "merge"
      ? "Merge Changes"
      : "Revert Changes";

  const syncScroll = useCallback(
    (source: "before" | "after" | "editable") =>
      (event: React.UIEvent<HTMLElement>) => {
        if (!syncEnabled) return;
        if (isSyncingRef.current) return;
        const scrollTop = event.currentTarget.scrollTop;
        const scrollLeft = event.currentTarget.scrollLeft;
        const targets = [
          source !== "before" ? beforeScrollRef.current : null,
          source !== "after" ? afterScrollRef.current : null,
          source !== "editable" ? editableScrollRef.current : null,
        ].filter(Boolean) as HTMLElement[];
        if (targets.length === 0) return;
        isSyncingRef.current = true;
        targets.forEach((target) => {
          target.scrollTop = scrollTop;
          target.scrollLeft = scrollLeft;
        });
        window.requestAnimationFrame(() => {
          isSyncingRef.current = false;
        });
      },
    [syncEnabled]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] w-[min(1700px,98vw)] max-w-none flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle className="text-left text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-left">
            Browse history and confirm a revert to a previous version.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 pb-6 pt-4 overflow-y-auto">
          {error && <div className="text-sm text-destructive">{error}</div>}
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Loading history...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              No history found.
            </div>
          ) : mode === "merge" ? (
            <div className="grid h-full min-h-0 flex-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-card">
                <div className="border-b border-border/60 px-4 py-3 text-sm font-semibold">
                  History
                </div>
                <div className="flex-1 overflow-auto p-2">
                  {visibleItems.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(index)}
                      className={`mb-2 w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                        index === selectedIndex
                          ? "bg-indigo-50 text-indigo-900"
                          : "hover:bg-muted/60"
                      }`}
                    >
                      <div className="font-semibold">{item.name ?? "Untitled"}</div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {formatTimestamp(item.createdAt)}
                      </div>
                      <div className="text-sm text-teal-500">
                        {item.userName ? item.userName : "Unknown user"}
                      </div>
                    </button>
                  ))}
                </div>
                {(canViewMore || canViewLess) && (
                  <div className="border-t border-border/60 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setVisibleCount((prev) => Math.min(items.length, prev + 10))}
                        disabled={!canViewMore}
                        className="text-xs font-semibold text-foreground hover:text-foreground/80 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        View more
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibleCount(10)}
                        disabled={!canViewLess}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        View less
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                  <div className="text-sm font-semibold text-foreground">Selected Before</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSyncEnabled((prev) => !prev)}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold text-foreground shadow-sm hover:bg-muted cursor-pointer"
                      aria-pressed={syncEnabled}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          syncEnabled ? "bg-emerald-500" : "bg-muted-foreground/40"
                        }`}
                      />
                      Sync Scroll
                    </button>
                    <button
                      type="button"
                      onClick={() => copyJsonToClipboard("Before", selectedBefore)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                      aria-label="Copy before JSON"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div ref={beforeScrollRef} onScroll={syncScroll("before")} className="flex-1 overflow-auto p-3">
                  <pre className="whitespace-pre-wrap wrap-break-word font-mono text-[12px] leading-5 text-foreground">
                    {beforeLines.map((line, index) => (
                      <div
                        key={`merge-before-${index}`}
                        className="grid w-full grid-cols-[16px_minmax(0,1fr)] gap-2 px-2 py-0.5 text-muted-foreground"
                      >
                        <span
                          className={`select-none text-center font-bold ${getMarkerClass(
                            line.status,
                          )}`}
                        >
                          {getMarker(line.status)}
                        </span>
                        <span
                          className={`block min-w-0 wrap-break-word ${getLineHighlightClass(
                            line.status,
                          )}`}
                        >
                          {line.text}
                        </span>
                      </div>
                    ))}
                  </pre>
                </div>
              </div>

              <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                  <div className="text-sm font-semibold text-foreground">Latest After</div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                      After
                    </span>
                    <button
                      type="button"
                      onClick={() => copyJsonToClipboard("After", latestAfter)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                      aria-label="Copy after JSON"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div
                  ref={afterScrollRef}
                  onScroll={syncScroll("after")}
                  className="flex-1 overflow-auto p-3 text-xs text-muted-foreground"
                >
                  <pre className="whitespace-pre-wrap wrap-break-word font-mono text-[12px] leading-5 text-foreground">
                    {afterLines.map((line, index) => (
                      <div
                        key={`merge-after-${index}`}
                        className="grid w-full grid-cols-[16px_minmax(0,1fr)] gap-2 px-2 py-0.5 text-muted-foreground"
                      >
                        <span
                          className={`select-none text-center font-bold ${getMarkerClass(
                            line.status,
                          )}`}
                        >
                          {getMarker(line.status)}
                        </span>
                        <span
                          className={`block min-w-0 wrap-break-word ${getLineHighlightClass(
                            line.status,
                          )}`}
                        >
                          {line.text}
                        </span>
                      </div>
                    ))}
                  </pre>
                </div>
              </div>

              <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                  <div className="text-sm font-semibold text-foreground">Editable JSON</div>
                  <button
                    type="button"
                    onClick={() => copyJsonToClipboard("Editable", editableJson)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                    aria-label="Copy editable JSON"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden p-3">
                  <textarea
                    ref={editableScrollRef}
                    onScroll={syncScroll("editable")}
                    value={editableJson}
                    onChange={(event) => setEditableJson(event.target.value)}
                    className="h-full w-full resize-none rounded-lg border border-border bg-background p-3 font-mono text-[12px] leading-5 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid h-full min-h-0 flex-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)_minmax(0,1fr)]">
              <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-card">
                <div className="border-b border-border/60 px-4 py-3 text-sm font-semibold">
                  History
                </div>
                <div className="flex-1 overflow-auto p-2">
                  {visibleItems.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(index)}
                      className={`mb-2 w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                        index === selectedIndex
                          ? "bg-indigo-50 text-indigo-900"
                          : "hover:bg-muted/60"
                      }`}
                    >
                      <div className="font-semibold">{item.name ?? "Untitled"}</div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {formatTimestamp(item.createdAt)}
                      </div>
                      <div className="text-sm text-teal-500">
                        {item.userName ? item.userName : "Unknown user"}
                      </div>
                    </button>
                  ))}
                </div>
                {(canViewMore || canViewLess) && (
                  <div className="border-t border-border/60 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setVisibleCount((prev) => Math.min(items.length, prev + 10))}
                        disabled={!canViewMore}
                        className="text-xs font-semibold text-foreground hover:text-foreground/80 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        View more
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibleCount(10)}
                        disabled={!canViewLess}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        View less
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                  <div className="text-sm font-semibold text-foreground">Selected Before</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSyncEnabled((prev) => !prev)}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold text-foreground shadow-sm hover:bg-muted cursor-pointer"
                      aria-pressed={syncEnabled}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          syncEnabled ? "bg-emerald-500" : "bg-muted-foreground/40"
                        }`}
                      />
                      Sync Scroll
                    </button>
                    <button
                      type="button"
                      onClick={() => copyJsonToClipboard("Before", selectedBefore)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                      aria-label="Copy before JSON"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div ref={beforeScrollRef} onScroll={syncScroll("before")} className="flex-1 overflow-auto p-3">
                  <pre className="whitespace-pre-wrap wrap-break-word font-mono text-[12px] leading-5 text-foreground">
                    {beforeLines.map((line, index) => (
                      <div
                        key={`revert-before-${index}`}
                        className="grid w-full grid-cols-[16px_minmax(0,1fr)] gap-2 px-2 py-0.5 text-muted-foreground"
                      >
                        <span
                          className={`select-none text-center font-bold ${getMarkerClass(
                            line.status,
                          )}`}
                        >
                          {getMarker(line.status)}
                        </span>
                        <span
                          className={`block min-w-0 wrap-break-word ${getLineHighlightClass(
                            line.status,
                          )}`}
                        >
                          {line.text}
                        </span>
                      </div>
                    ))}
                  </pre>
                </div>
              </div>

              <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                  <div className="text-sm font-semibold text-foreground">Latest After</div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                      After
                    </span>
                    <button
                      type="button"
                      onClick={() => copyJsonToClipboard("After", latestAfter)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                      aria-label="Copy after JSON"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div
                  ref={afterScrollRef}
                  onScroll={syncScroll("after")}
                  className="flex-1 overflow-auto p-3 text-xs text-muted-foreground"
                >
                  <pre className="whitespace-pre-wrap wrap-break-word font-mono text-[12px] leading-5 text-foreground">
                    {afterLines.map((line, index) => (
                      <div
                        key={`revert-after-${index}`}
                        className="grid w-full grid-cols-[16px_minmax(0,1fr)] gap-2 px-2 py-0.5 text-muted-foreground"
                      >
                        <span
                          className={`select-none text-center font-bold ${getMarkerClass(
                            line.status,
                          )}`}
                        >
                          {getMarker(line.status)}
                        </span>
                        <span
                          className={`block min-w-0 wrap-break-word ${getLineHighlightClass(
                            line.status,
                          )}`}
                        >
                          {line.text}
                        </span>
                      </div>
                    ))}
                  </pre>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <div className="text-xs text-muted-foreground">
              {saveError && <span className="text-destructive">{saveError}</span>}
              {saveSuccess && <span className="text-emerald-600">{saveSuccess}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="cursor-pointer"
                disabled={isSaving}
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                className="cursor-pointer bg-linear-to-r from-indigo-600 via-purple-600 to-violet-600 text-white shadow-md shadow-indigo-200/40 hover:from-indigo-500 hover:via-purple-500 hover:to-violet-500"
                disabled={isSaving || !selectedItem}
              >
                {isSaving ? "Applying..." : mode === "merge" ? "Confirm Merge" : "Confirm Revert"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
