"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword, logoutSession } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export default function ForcePasswordChange() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!user?.userId) {
      setFormError("Missing user id. Please log in again.");
      return;
    }
    if (!currentPassword.trim() || !newPassword.trim()) {
      setFormError("Please fill in both password fields.");
      return;
    }
    if (currentPassword === newPassword) {
      setFormError("New password must be different.");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword({
        userId: user.userId,
        currentPassword,
        newPassword,
      });
      await logoutSession();
      setCurrentPassword("");
      setNewPassword("");
      logout();
      router.replace("/login");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Change Your Password</DialogTitle>
          <DialogDescription>
            Your temporary password must be changed before you can use the app.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="force-current-password">Current Password</Label>
            <Input
              id="force-current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="force-new-password">New Password</Label>
            <Input
              id="force-new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>

          {formError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
