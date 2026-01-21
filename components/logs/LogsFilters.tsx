"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
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

type LogsFiltersProps = {
  fromDate: Date | null;
  toDate: Date | null;
  limit: number;
  query: string;
  sessionId: string;
  status: string;
  isLoading: boolean;
  onFromChange: (value: Date | null) => void;
  onToChange: (value: Date | null) => void;
  onLimitChange: (value: number) => void;
  onQueryChange: (value: string) => void;
  onSessionIdChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onRefresh: () => void;
};

export default function LogsFilters({
  fromDate,
  toDate,
  limit,
  query,
  sessionId,
  status,
  isLoading,
  onFromChange,
  onToChange,
  onLimitChange,
  onQueryChange,
  onSessionIdChange,
  onStatusChange,
  onRefresh,
}: LogsFiltersProps) {
  const [fromOpen, setFromOpen] = React.useState(false);
  const [toOpen, setToOpen] = React.useState(false);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
        <div className="flex flex-col gap-3">
          <Label htmlFor="from-date" className="px-1 text-xs uppercase text-muted-foreground">
            From
          </Label>
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild className="cursor-pointer">
              <Button
                variant="outline"
                id="from-date"
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
                  onFromChange(date ?? null);
                  setFromOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex flex-col gap-3">
          <Label htmlFor="to-date" className="px-1 text-xs uppercase text-muted-foreground">
            To
          </Label>
          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger asChild className="cursor-pointer">
              <Button
                variant="outline"
                id="to-date"
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
                  onToChange(date ?? null);
                  setToOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex flex-col gap-3">
          <Label htmlFor="limit" className="px-1 text-xs uppercase text-muted-foreground">
            Limit
          </Label>
          <Select
            value={String(limit)}
            onValueChange={(value) => onLimitChange(Number(value))}
          >
            <SelectTrigger id="limit" className="cursor-pointer">
              <SelectValue placeholder="Select limit" />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100, 200, 500].map((value) => (
                <SelectItem key={value} value={String(value)} className="cursor-pointer">
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            onClick={onRefresh}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 text-white shadow-md shadow-indigo-200/40 hover:from-indigo-500 hover:via-purple-500 hover:to-violet-500 dark:from-slate-800 dark:via-slate-700 dark:to-slate-700 dark:text-slate-100 dark:shadow-slate-900/40 dark:hover:from-slate-700 dark:hover:via-slate-600 dark:hover:to-slate-600 cursor-pointer"
          >
            {isLoading ? "Loading..." : "Fetch Logs"}
          </Button>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]">
        <div className="flex flex-col gap-2">
          <Label htmlFor="search-query" className="px-1 text-xs uppercase text-muted-foreground">
            Search (Lucene)
          </Label>
          <input
            id="search-query"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search any log content..."
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="session-id" className="px-1 text-xs uppercase text-muted-foreground">
            Session ID
          </Label>
          <input
            id="session-id"
            value={sessionId}
            onChange={(event) => onSessionIdChange(event.target.value)}
            placeholder="879197"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="status" className="px-1 text-xs uppercase text-muted-foreground">
            Status
          </Label>
          <input
            id="status"
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            placeholder="200"
            inputMode="numeric"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>
    </div>
  );
}
