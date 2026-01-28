"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  isAdmin: boolean;
};

export default function ProfileDialog({
  open,
  onOpenChange,
  username,
  isAdmin,
}: ProfileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
          <DialogDescription>Signed-in user details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Username</span>
            <span className="font-semibold">{username}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Role</span>
            <Badge
              variant="secondary"
              className={`text-[10px] uppercase font-bold ${
                isAdmin
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : "bg-blue-100 text-blue-800 hover:bg-blue-100"
              }`}
            >
              {isAdmin ? "Admin" : "User"}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
