"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { QrCode } from "lucide-react";
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
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm hover:bg-muted"
        aria-label="Open QR scan"
      >
        <QrCode className="h-4 w-4" />
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
                <div className="flex h-55 w-55 items-center justify-center text-xs text-muted-foreground">
                  Generating QR...
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              This opens a mobile web page that mimics the native USSD overlay.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
