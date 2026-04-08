"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteRedisEntry,
  fetchRedisEntries,
  fetchRedisIndexes,
  type RedisInspectorEntry,
  type RedisInspectorIndex,
} from "@/lib/api";

const DEFAULT_LIMIT = 50;

const parseNestedJson = (value: unknown, depth = 0): unknown => {
  if (depth > 5) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))
    ) {
      try {
        return parseNestedJson(JSON.parse(trimmed), depth + 1);
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
      (acc, [key, current]) => {
        acc[key] = parseNestedJson(current, depth + 1);
        return acc;
      },
      {} as Record<string, unknown>
    );
  }
  return value;
};

const formatRedisValue = (value: unknown): string => {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") {
    const parsed = parseNestedJson(value);
    if (typeof parsed === "string") {
      return parsed;
    }
    return JSON.stringify(parsed, null, 2);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(parseNestedJson(value), null, 2);
};

const formatTtl = (ttl: number): string => {
  if (ttl === -1) return "No expiry";
  if (ttl === -2) return "Missing";
  return `${ttl}s`;
};

const typeChipClass = (type: string): string => {
  switch (type) {
    case "set":
      return "bg-slate-100 text-slate-700";
    case "hash":
      return "bg-emerald-100 text-emerald-700";
    case "list":
      return "bg-sky-100 text-sky-700";
    case "string":
      return "bg-violet-100 text-violet-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

export default function RedisInspector() {
  const [indexes, setIndexes] = useState<RedisInspectorIndex[]>([]);
  const [selectedDb, setSelectedDb] = useState<number | null>(null);
  const [pattern, setPattern] = useState("*");
  const [entries, setEntries] = useState<RedisInspectorEntry[]>([]);
  const [cursor, setCursor] = useState("0");
  const [hasMore, setHasMore] = useState(false);
  const [hasLoadedEntries, setHasLoadedEntries] = useState(false);
  const [isLoadingIndexes, setIsLoadingIndexes] = useState(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [isDeletingKey, setIsDeletingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedIndex = useMemo(
    () => indexes.find((item) => item.db === selectedDb) ?? null,
    [indexes, selectedDb]
  );

  const loadIndexes = useCallback(
    async (opts?: { refreshCurrentDb?: boolean; currentDb?: number | null }) => {
      setIsLoadingIndexes(true);
      setError(null);
      try {
        const response = await fetchRedisIndexes();
        const nextIndexes = Array.isArray(response.data) ? response.data : [];
        setIndexes(nextIndexes);
        setSelectedDb((current) => {
          if (current !== null && nextIndexes.some((item) => item.db === current)) {
            return current;
          }
          return nextIndexes[0]?.db ?? null;
        });

        if (opts?.refreshCurrentDb && opts.currentDb !== null && opts.currentDb !== undefined) {
          setIsLoadingEntries(true);
          const entriesResponse = await fetchRedisEntries({
            db: opts.currentDb,
            pattern: pattern.trim() || "*",
            cursor: "0",
            limit: DEFAULT_LIMIT,
          });
          setEntries(entriesResponse.data.items ?? []);
          setCursor(entriesResponse.data.nextCursor ?? "0");
          setHasMore(Boolean(entriesResponse.data.hasMore));
          setHasLoadedEntries(true);
          setIsLoadingEntries(false);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load Redis indexes."
        );
      } finally {
        setIsLoadingIndexes(false);
      }
    },
    [pattern]
  );

  useEffect(() => {
    void loadIndexes();
  }, []);

  const refreshEntries = useCallback(async () => {
    if (selectedDb === null) return;
    setIsLoadingEntries(true);
    setError(null);
    try {
      const response = await fetchRedisEntries({
        db: selectedDb,
        pattern: pattern.trim() || "*",
        cursor: "0",
        limit: DEFAULT_LIMIT,
      });
      setEntries(response.data.items ?? []);
      setCursor(response.data.nextCursor ?? "0");
      setHasMore(Boolean(response.data.hasMore));
      setHasLoadedEntries(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load Redis entries."
      );
    } finally {
      setIsLoadingEntries(false);
    }
  }, [pattern, selectedDb]);

  const loadMore = useCallback(async () => {
    if (selectedDb === null || !hasMore || cursor === "0") return;
    setIsLoadingEntries(true);
    setError(null);
    try {
      const response = await fetchRedisEntries({
        db: selectedDb,
        pattern: pattern.trim() || "*",
        cursor,
        limit: DEFAULT_LIMIT,
      });
      setEntries((current) => [...current, ...(response.data.items ?? [])]);
      setCursor(response.data.nextCursor ?? "0");
      setHasMore(Boolean(response.data.hasMore));
      setHasLoadedEntries(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load more Redis entries."
      );
    } finally {
      setIsLoadingEntries(false);
    }
  }, [cursor, hasMore, pattern, selectedDb]);

  const handleDelete = useCallback(
    async (key: string) => {
      if (selectedDb === null) return;
      setIsDeletingKey(key);
      setError(null);
      try {
        await deleteRedisEntry({ db: selectedDb, key });
        setEntries((current) => current.filter((entry) => entry.key !== key));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete Redis key."
        );
      } finally {
        setIsDeletingKey(null);
      }
    },
    [selectedDb]
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-white/8 bg-[#151d33] shadow-[0_10px_30px_rgba(0,0,0,0.16)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/8 px-4 py-3.5">
          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-white">
              Redis Viewer
            </h3>
            <p className="mt-1 text-[11px] leading-4 text-slate-400">
              Browse configured Redis DB indexes and inspect saved values.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              void loadIndexes({ refreshCurrentDb: true, currentDb: selectedDb })
            }
            className="rounded-xl bg-[#5a43ff] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(90,67,255,0.28)] transition hover:bg-[#6a57ff] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoadingIndexes || isLoadingEntries}
          >
            Refresh Indexes
          </button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[212px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-hidden border-b border-white/8 px-3 py-3 lg:border-b-0 lg:border-r">
            <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              Redis Indexes
            </div>
            <div className="h-full min-h-0 space-y-2.5 overflow-auto pr-1">
              {indexes.length === 0 && !isLoadingIndexes ? (
                <div className="rounded-2xl border border-white/8 bg-[#0a1021] px-3 py-3 text-xs text-slate-400">
                  No Redis indexes found.
                </div>
              ) : (
                indexes.map((index) => (
                  <button
                    key={`${index.name}-${index.db}`}
                    type="button"
                    onClick={() => {
                      setSelectedDb(index.db);
                      setEntries([]);
                      setCursor("0");
                      setHasMore(false);
                      setHasLoadedEntries(false);
                    }}
                    className={`w-full rounded-[16px] border px-3.5 py-2.5 text-left transition ${
                      selectedDb === index.db
                        ? "border-[#8683ff] bg-[#f3f5ff] text-[#4f46ff] shadow-[0_10px_24px_rgba(91,67,255,0.18)]"
                        : "border-white/6 bg-[#070d1f] text-white hover:border-white/12 hover:bg-[#0b1226]"
                    }`}
                  >
                    <div className="text-[14px] font-semibold leading-none">
                      {index.name}
                    </div>
                    <div
                      className={`mt-1.5 text-xs ${
                        selectedDb === index.db ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      DB {index.db}
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col overflow-hidden">
            <div className="border-b border-white/8 px-4 py-3">
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-[200px] flex-1">
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                    Match Pattern
                  </div>
                  <input
                    value={pattern}
                    onChange={(event) => setPattern(event.target.value)}
                    placeholder="*"
                    className="h-10 w-full rounded-xl border border-white/8 bg-[#060b19] px-3.5 text-[13px] text-white outline-none transition placeholder:text-slate-500 focus:border-[#6d6cff]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void refreshEntries()}
                  disabled={selectedDb === null || isLoadingEntries}
                  className="h-10 rounded-xl bg-[#5a43ff] px-3.5 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(90,67,255,0.24)] transition hover:bg-[#6a57ff] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {selectedIndex ? `Refresh DB ${selectedIndex.db}` : "Refresh DB"}
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3.5">
              {error ? (
                <div className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-200">
                  {error}
                </div>
              ) : null}

              {!selectedIndex ? (
                <div className="flex min-h-[150px] items-start rounded-[16px] border border-white/8 bg-[#060b19] px-4 py-4 text-sm text-slate-400">
                  Select a Redis index from the left panel.
                </div>
              ) : !hasLoadedEntries ? (
                <div className="flex min-h-[150px] items-start rounded-[16px] border border-white/8 bg-[#060b19] px-4 py-4 text-sm text-slate-400">
                  Press <span className="mx-1 font-semibold text-white">Refresh DB</span> to load entries for this index.
                </div>
              ) : entries.length === 0 && !isLoadingEntries ? (
                <div className="flex min-h-[150px] items-start rounded-[16px] border border-white/8 bg-[#060b19] px-4 py-4 text-sm text-slate-400">
                  No entries found for this index.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {entries.map((entry) => (
                    <div
                      key={`${entry.key}-${entry.type}`}
                      className="rounded-[16px] border border-white/8 bg-[#060b19] p-3.5 shadow-[0_8px_20px_rgba(0,0,0,0.16)]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                          <div className="max-w-full rounded-lg bg-[#27324a] px-2.5 py-1.5 font-mono text-[11px] font-semibold text-slate-100">
                            <div className="truncate">{entry.key}</div>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${typeChipClass(
                              entry.type
                            )}`}
                          >
                            {entry.type}
                          </span>
                          <span className="rounded-full bg-[#ffe8a3] px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                            TTL {formatTtl(entry.ttl)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDelete(entry.key)}
                          disabled={isDeletingKey === entry.key}
                          className="rounded-lg bg-[#fff2f0] px-3 py-1.5 text-[11px] font-semibold text-red-500 transition hover:bg-[#ffe2dd] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>

                      <pre className="mt-2.5 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-[14px] bg-[#f4f6fb] p-3 font-mono text-[11px] leading-6 text-slate-700">
                        {formatRedisValue(entry.value)}
                      </pre>
                    </div>
                  ))}

                  {hasMore ? (
                    <div className="flex justify-center pt-1">
                      <button
                        type="button"
                        onClick={() => void loadMore()}
                        disabled={isLoadingEntries}
                        className="rounded-xl border border-white/10 bg-[#0a1021] px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#11192f] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Load More
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              {isLoadingEntries ? (
                <div className="mt-4 text-sm text-slate-400">Loading entries...</div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
