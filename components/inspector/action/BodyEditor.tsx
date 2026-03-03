"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type BodyEditorProps = {
  apiBodyText: string;
  apiBodyError: string | null;
  bodyMode: "json" | "soap" | "x-www-form-urlencoded";
  formRows: Array<{ id: string; key: string; value: string; description: string }>;
  onBodyModeChange: (value: "json" | "soap" | "x-www-form-urlencoded") => void;
  onApiBodyChange: (value: string) => void;
  onAddFormRow: () => void;
  onRemoveFormRow: (id: string) => void;
  onUpdateFormRow: (
    id: string,
    field: "key" | "value" | "description",
    value: string
  ) => void;
};

export default function BodyEditor({
  apiBodyText,
  apiBodyError,
  bodyMode,
  formRows,
  onBodyModeChange,
  onApiBodyChange,
  onAddFormRow,
  onRemoveFormRow,
  onUpdateFormRow,
}: BodyEditorProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const modeLabel =
    bodyMode === "soap"
      ? "SOAP XML"
      : bodyMode === "x-www-form-urlencoded"
      ? "x-www-form-urlencoded"
      : "JSON";

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-gray-600">Body</label>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase text-gray-500">
            Raw
          </span>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-7 min-w-28 items-center justify-between rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 shadow-sm hover:bg-gray-50 cursor-pointer"
              >
                {modeLabel}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-32 z-100001 bg-white text-gray-900 border border-gray-200 shadow-md"
            >
              <DropdownMenuItem
                className="cursor-pointer focus:bg-gray-100 focus:text-gray-900"
                onClick={() => {
                  onBodyModeChange("json");
                  setMenuOpen(false);
                }}
              >
                JSON
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer focus:bg-gray-100 focus:text-gray-900"
                onClick={() => {
                  onBodyModeChange("soap");
                  setMenuOpen(false);
                }}
              >
                SOAP XML
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer focus:bg-gray-100 focus:text-gray-900"
                onClick={() => {
                  onBodyModeChange("x-www-form-urlencoded");
                  setMenuOpen(false);
                }}
              >
                x-www-form-urlencoded
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {bodyMode === "x-www-form-urlencoded" ? (
        <div className="mt-2 rounded-md border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-600 uppercase">
            <span>Key</span>
            <span>Value</span>
            <span>Description</span>
            <span />
          </div>
          <div className="divide-y divide-gray-100">
            {formRows.map((row) => (
              <div key={row.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-3 py-2 items-center">
                <input
                  className="rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-900"
                  placeholder="key"
                  value={row.key}
                  onChange={(e) =>
                    onUpdateFormRow(row.id, "key", e.target.value)
                  }
                />
                <input
                  className="rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-900"
                  placeholder="value"
                  value={row.value}
                  onChange={(e) =>
                    onUpdateFormRow(row.id, "value", e.target.value)
                  }
                />
                <input
                  className="rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-900"
                  placeholder="description"
                  value={row.description}
                  onChange={(e) =>
                    onUpdateFormRow(row.id, "description", e.target.value)
                  }
                />
                <button
                  type="button"
                  className="text-xs text-gray-400 hover:text-red-500 px-2 cursor-pointer"
                  onClick={() => onRemoveFormRow(row.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 cursor-pointer"
              onClick={onAddFormRow}
            >
              + Add Row
            </button>
          </div>
        </div>
      ) : (
        <>
          <textarea
            className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm font-mono text-sm placeholder-gray-400 text-gray-900"
            value={apiBodyText}
            rows={8}
            onChange={(e) => onApiBodyChange(e.target.value)}
          />
          {apiBodyError && (
            <div className="text-xs text-red-500 mt-1">{apiBodyError}</div>
          )}
        </>
      )}
    </div>
  );
}
