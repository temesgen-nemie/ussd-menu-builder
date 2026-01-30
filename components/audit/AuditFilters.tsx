"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
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
import { Button } from "../ui/button";

type AuditFiltersProps = {
  fromDate: Date | null;
  toDate: Date | null;
  limit: number;
  query: string;
  isLoading: boolean;
  onFromChange: (value: Date | null) => void;
  onToChange: (value: Date | null) => void;
  onLimitChange: (value: number) => void;
  onQueryChange: (value: string) => void;
};

export default function AuditFilters({
  fromDate,
  toDate,
  limit,
  query,
  isLoading,
  onFromChange,
  onToChange,
  onLimitChange,
  onQueryChange,
}: AuditFiltersProps) {
  const [fromOpen, setFromOpen] = React.useState(false);
  const [toOpen, setToOpen] = React.useState(false);
  const [draftQuery, setDraftQuery] = React.useState(query);

  React.useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="flex flex-col gap-3">
          <Label
            htmlFor="audit-from-date"
            className="px-1 text-xs uppercase text-muted-foreground"
          >
            From
          </Label>
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild className="cursor-pointer">
              <Button
                variant="outline"
                id="audit-from-date"
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
          <Label
            htmlFor="audit-to-date"
            className="px-1 text-xs uppercase text-muted-foreground"
          >
            To
          </Label>
          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger asChild className="cursor-pointer">
              <Button
                variant="outline"
                id="audit-to-date"
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
          <Label
            htmlFor="audit-limit"
            className="px-1 text-xs uppercase text-muted-foreground"
          >
            Limit
          </Label>
          <Select
            value={String(limit)}
            onValueChange={(value) => onLimitChange(Number(value))}
          >
            <SelectTrigger id="audit-limit" className="cursor-pointer">
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
        <div className="flex flex-col gap-3">
          <Label
            htmlFor="audit-search"
            className="px-1 text-xs uppercase text-muted-foreground"
          >
            Search
          </Label>
          <div className="flex gap-2">
            <input
              id="audit-search"
              type="text"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onQueryChange(draftQuery);
                }
              }}
              placeholder="Flow, username, node id"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              type="button"
              onClick={() => onQueryChange(draftQuery)}
              className="h-10 cursor-pointer px-4 text-xs font-semibold bg-teal-600 text-white shadow-sm hover:bg-teal-500"
              disabled={isLoading || draftQuery === query}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Searching...
                </span>
              ) : (
                "Search"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
