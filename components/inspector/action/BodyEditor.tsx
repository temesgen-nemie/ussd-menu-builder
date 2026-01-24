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
  bodyMode: "json" | "soap";
  onBodyModeChange: (value: "json" | "soap") => void;
  onApiBodyChange: (value: string) => void;
};

export default function BodyEditor({
  apiBodyText,
  apiBodyError,
  bodyMode,
  onBodyModeChange,
  onApiBodyChange,
}: BodyEditorProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);

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
                className="inline-flex h-7 w-28 items-center justify-between rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 shadow-sm hover:bg-gray-50 cursor-pointer"
              >
                {bodyMode === "soap" ? "SOAP XML" : "JSON"}
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <textarea
        className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm font-mono text-sm placeholder-gray-400 text-gray-900"
        value={apiBodyText}
        rows={8}
        onChange={(e) => onApiBodyChange(e.target.value)}
      />
      {apiBodyError && (
        <div className="text-xs text-red-500 mt-1">{apiBodyError}</div>
      )}
    </div>
  );
}
