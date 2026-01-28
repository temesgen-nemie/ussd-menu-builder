"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { QrCode } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function QrScanDialog() {
  const [open, setOpen] = useState(false);
  const [qrBaseUrl] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  });

  const qrUrl = useMemo(() => {
    if (!qrBaseUrl) return "";
    const cleanedBase = qrBaseUrl.replace(/\/$/, "");
    return `${cleanedBase}/phone`;
  }, [qrBaseUrl]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center border border-border bg-background text-foreground shadow-sm hover:bg-muted rounded-full cursor-pointer"
        aria-label="Open QR scan"
      >
        <QrCode className="h-5 w-5 text-purple-600" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan to open USSD</DialogTitle>
            <DialogDescription>
              Scan this QR code with your phone to open the USSD session page.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
              {qrUrl ? (
                <Image
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    qrUrl
                  )}`}
                  alt="USSD QR Code"
                  width={220}
                  height={220}
                  className="h-55 w-55"
                  unoptimized
                />
              ) : (
                <div className="flex h-55 w-55 flex-col items-center justify-center gap-3 text-xs text-muted-foreground">
                  <span className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                  Generating QR...
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              This opens a mobile web page that mimics the native USSD overlay.
            </p>
            {qrUrl && (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(qrUrl);
                      toast.success("URL copied to clipboard");
                    } catch {
                      toast.error("Failed to copy URL");
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-border bg-muted px-4 py-2 text-[11px] font-semibold text-foreground shadow-sm hover:bg-muted/70"
                >
                  Copy URL
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
