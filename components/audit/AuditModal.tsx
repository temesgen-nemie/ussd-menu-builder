"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import AuditTable from "@/components/audit/AuditTable";

type AuditModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const getInitialSize = () => {
  if (typeof window === "undefined") {
    return { width: 1100, height: 760 };
  }
  const width = Math.min(window.innerWidth * 0.9, 1100);
  const height = Math.min(window.innerHeight * 0.85, 760);
  return { width, height };
};

function AuditModalContent({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
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
            <div className="text-lg font-bold text-foreground">Audit Events</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Review recent changes across flows and nodes.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Close audit events"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-6">
          <AuditTable />
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

export default function AuditModal({ open, onOpenChange }: AuditModalProps) {
  if (!open) return null;
  return <AuditModalContent onOpenChange={onOpenChange} />;
}
