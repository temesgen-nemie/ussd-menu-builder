"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DEFAULT_QR_BASE_URLS = [
  "http://172.21.220.1:3000",
  "http://localhost:3000",
];

export default function QrScanDialog() {
  const [open, setOpen] = useState(false);
  const [qrBaseUrl, setQrBaseUrl] = useState("");
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (qrBaseUrl) return;
    const match = DEFAULT_QR_BASE_URLS.find(
      (url) => url === window.location.origin
    );
    setQrBaseUrl(match ?? DEFAULT_QR_BASE_URLS[0]);
  }, [qrBaseUrl]);

  useEffect(() => {
    if (!open) return;
    if (!qrBaseUrl) return;
    const cleanedBase = qrBaseUrl.replace(/\/$/, "");
    setQrUrl(`${cleanedBase}/phone`);
  }, [open, qrBaseUrl]);

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
            <div className="flex w-full items-center justify-center gap-2">
              {DEFAULT_QR_BASE_URLS.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setQrBaseUrl(url)}
                  className={`rounded-full px-3 py-1 text-[10px] font-semibold transition-colors ${
                    qrBaseUrl === url
                      ? "bg-indigo-600 text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {url.includes("localhost") ? "Localhost" : "LAN IP"}
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
              {qrUrl ? (
                <Image
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    qrUrl
                  )}`}
                  alt="USSD QR Code"
                  width={220}
                  height={220}
                  className="h-[220px] w-[220px]"
                  unoptimized
                />
              ) : (
                <div className="flex h-[220px] w-[220px] items-center justify-center text-xs text-muted-foreground">
                  Generating QR...
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              This opens a mobile web page that mimics the native USSD overlay.
            </p>
            {qrUrl && (
              <p className="break-all text-[10px] text-muted-foreground text-center">
                {qrUrl}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
