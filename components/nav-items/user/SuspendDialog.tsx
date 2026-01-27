"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SuspendDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  onConfirm: (reason: string) => Promise<void> | void;
};

export default function SuspendDialog({
  open,
  onOpenChange,
  username,
  onConfirm,
}: SuspendDialogProps) {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Suspend {username}</DialogTitle>
          <DialogDescription>
            Provide a suspension reason for audit purposes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Suspension reason"
          />
          <Button
            className="cursor-pointer bg-red-600 text-white hover:bg-red-500"
            onClick={async () => {
              await onConfirm(reason.trim() || "Suspended via dashboard");
              setReason("");
              onOpenChange(false);
            }}
          >
            Confirm Suspend
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
