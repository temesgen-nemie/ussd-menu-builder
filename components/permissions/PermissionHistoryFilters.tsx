import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
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
import { ChevronDownIcon } from "lucide-react";

type PermissionHistoryFiltersProps = {
  flowName: string;
  assigneeName: string;
  adminName: string;
  dateFrom: string;
  dateTo: string;
  pageSize: number;
  isLoading: boolean;
  isSearching: boolean;
  isResetting: boolean;
  onChange: (next: {
    flowName: string;
    assigneeName: string;
    adminName: string;
    dateFrom: string;
    dateTo: string;
    pageSize: number;
  }) => void;
  onSearch: () => void;
  onReset: () => void;
};

const parseDate = (value: string) => (value ? new Date(value) : null);

export default function PermissionHistoryFilters({
  flowName,
  assigneeName,
  adminName,
  dateFrom,
  dateTo,
  pageSize,
  isLoading,
  isSearching,
  isResetting,
  onChange,
  onSearch,
  onReset,
}: PermissionHistoryFiltersProps) {
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const fromDate = parseDate(dateFrom);
  const toDate = parseDate(dateTo);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-3">
          <Label className="px-1 text-xs uppercase text-muted-foreground">
            Flow Name
          </Label>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            value={flowName}
            onChange={(e) =>
              onChange({
                flowName: e.target.value,
                assigneeName,
                adminName,
                dateFrom,
                dateTo,
                pageSize,
              })
            }
            placeholder="e.g. seyaTest"
          />
        </div>
        <div className="flex flex-col gap-3">
          <Label className="px-1 text-xs uppercase text-muted-foreground">
            Assignee Name
          </Label>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            value={assigneeName}
            onChange={(e) =>
              onChange({
                flowName,
                assigneeName: e.target.value,
                adminName,
                dateFrom,
                dateTo,
                pageSize,
              })
            }
            placeholder="Assignee name"
          />
        </div>
        <div className="flex flex-col gap-3">
          <Label className="px-1 text-xs uppercase text-muted-foreground">
            Admin Name
          </Label>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            value={adminName}
            onChange={(e) =>
              onChange({
                flowName,
                assigneeName,
                adminName: e.target.value,
                dateFrom,
                dateTo,
                pageSize,
              })
            }
            placeholder="Admin name"
          />
        </div>
        <div className="flex flex-col gap-3">
          <Label className="px-1 text-xs uppercase text-muted-foreground">
            Date From
          </Label>
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild className="cursor-pointer">
              <Button
                variant="outline"
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
                  onChange({
                    flowName,
                    assigneeName,
                    adminName,
                    dateFrom: date ? date.toISOString() : "",
                    dateTo,
                    pageSize,
                  });
                  setFromOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex flex-col gap-3">
          <Label className="px-1 text-xs uppercase text-muted-foreground">
            Date To
          </Label>
          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger asChild className="cursor-pointer">
              <Button
                variant="outline"
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
                  onChange({
                    flowName,
                    assigneeName,
                    adminName,
                    dateFrom,
                    dateTo: date ? date.toISOString() : "",
                    pageSize,
                  });
                  setToOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex flex-col gap-3">
          <Label className="px-1 text-xs uppercase text-muted-foreground">
            Page Size
          </Label>
          <Select
            value={String(pageSize)}
            onValueChange={(value) =>
              onChange({
                flowName,
                assigneeName,
                adminName,
                dateFrom,
                dateTo,
                pageSize: Number(value),
              })
            }
          >
            <SelectTrigger className="cursor-pointer">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((value) => (
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
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onReset}
          disabled={isLoading || isResetting}
          className="inline-flex items-center rounded-md border border-border bg-neutral-800 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {isResetting ? "Resetting..." : "Reset"}
        </button>
        <button
          type="button"
          onClick={onSearch}
          disabled={isLoading || isSearching}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {isSearching && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          {isSearching ? "Searching..." : "Search"}
        </button>
      </div>
    </div>
  );
}
