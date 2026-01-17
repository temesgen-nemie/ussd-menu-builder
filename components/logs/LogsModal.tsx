"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LogsTable from "@/components/logs/LogsTable";

type LogsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function LogsModal({ open, onOpenChange }: LogsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>USSD Logs</DialogTitle>
        </DialogHeader>
        <LogsTable />
      </DialogContent>
    </Dialog>
  );
}
