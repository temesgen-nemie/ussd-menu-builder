"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DiffStatus = "added" | "removed";

export type AuditDiffEvent = {
  id: string;
  createdAt: string;
  operation?: string | null;
  name?: string | null;
  type?: string | null;
  flowName?: string | null;
  userName?: string | null;
  before?: unknown;
  after?: unknown;
};

type Line = {
  text: string;
  status?: DiffStatus;
};

type DiffMaps = {
  beforeMap: Record<string, DiffStatus>;
  afterMap: Record<string, DiffStatus>;
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

const markPathWithAncestors = (
  map: Record<string, DiffStatus>,
  path: string,
  status: DiffStatus,
) => {
  const parts = path.split(".");
  for (let i = 1; i <= parts.length; i += 1) {
    const key = parts.slice(0, i).join(".");
    map[key] = status;
  }
};

const diffValues = (
  before: unknown,
  after: unknown,
  path: string,
  maps: DiffMaps,
) => {
  if (before === undefined && after === undefined) return;

  if (before === undefined) {
    markPathWithAncestors(maps.afterMap, path, "added");
    return;
  }

  if (after === undefined) {
    markPathWithAncestors(maps.beforeMap, path, "removed");
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
    markPathWithAncestors(maps.beforeMap, path, "removed");
    markPathWithAncestors(maps.afterMap, path, "added");
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

const getLineClass = (status?: DiffStatus) => {
  if (status === "added") {
    return "bg-emerald-50 text-emerald-900";
  }
  if (status === "removed") {
    return "bg-rose-50 text-rose-900";
  }
  return "text-muted-foreground";
};

const getMarkerClass = (status?: DiffStatus) => {
  if (status === "added") return "text-emerald-600";
  if (status === "removed") return "text-rose-600";
  return "text-muted-foreground";
};

const getMarker = (status?: DiffStatus) => {
  if (status === "added") return "+";
  if (status === "removed") return "-";
  return " ";
};

type JsonPaneProps = {
  title: string;
  lines: Line[];
  emptyLabel: string;
};

function JsonPane({ title, lines, emptyLabel }: JsonPaneProps) {
  const hasLines = lines.length > 0;
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col rounded-2xl border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="text-sm font-semibold text-foreground">{title}</div>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {hasLines ? (
          <pre className="whitespace-pre-wrap wrap-break-word font-mono text-[12px] leading-5 text-foreground">
            {lines.map((line, index) => (
              <div
                // Using index is acceptable here because the lines are derived content.
                key={`${title}-${index}`}
                className={`grid w-full grid-cols-[16px_minmax(0,1fr)] gap-2 px-2 py-0.5 ${getLineClass(
                  line.status,
                )}`}
              >
                <span
                  className={`select-none text-center font-bold ${getMarkerClass(
                    line.status,
                  )}`}
                >
                  {getMarker(line.status)}
                </span>
                <span className="min-w-0 wrap-break-word">{line.text}</span>
              </div>
            ))}
          </pre>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  );
}

type AuditDiffDialogProps = {
  event: AuditDiffEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AuditDiffDialog({ event, open, onOpenChange }: AuditDiffDialogProps) {
  const { beforeLines, afterLines } = useMemo(() => {
    if (!event) {
      return { beforeLines: [] as Line[], afterLines: [] as Line[] };
    }

    const maps: DiffMaps = { beforeMap: {}, afterMap: {} };
    diffValues(event.before, event.after, "root", maps);

    const beforeValue = event.before === undefined ? null : event.before;
    const afterValue = event.after === undefined ? null : event.after;

    return {
      beforeLines: buildJsonLines(beforeValue, maps.beforeMap),
      afterLines: buildJsonLines(afterValue, maps.afterMap),
    };
  }, [event]);

  const title = event?.name ? `${event.name} changes` : "Event changes";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] w-[min(1300px,98vw)] max-w-none flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle className="text-left text-lg font-semibold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-left">
            Before and after snapshots for this audit event.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex flex-col gap-3 px-6 pb-4 pt-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge className="inline-flex max-w-65 truncate rounded-md border-0 bg-muted px-2.5 py-1 text-foreground shadow-none">
                Operation: {event?.operation ?? "--"}
              </Badge>
              <Badge className="inline-flex max-w-65 truncate rounded-md border-0 bg-muted px-2.5 py-1 text-foreground shadow-none">
                Event Type: {event?.type ?? "--"}
              </Badge>
              <Badge className="inline-flex max-w-65 truncate rounded-md border-0 bg-muted px-2.5 py-1 text-foreground shadow-none">
                Flow Name: {event?.flowName ?? "--"}
              </Badge>
              <Badge className="inline-flex max-w-65 truncate rounded-md border-0 bg-muted px-2.5 py-1 text-foreground shadow-none">
                Username: {event?.userName ?? "--"}
              </Badge>
            </div>
          </div>

          <div className="min-h-0 flex-1 px-6 pb-6">
            <div className="grid h-full min-h-0 gap-4 lg:grid-cols-2">
              <JsonPane
                title="Before"
                lines={beforeLines}
                emptyLabel="No previous snapshot."
              />
              <JsonPane
                title="After"
                lines={afterLines}
                emptyLabel="No updated snapshot."
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
