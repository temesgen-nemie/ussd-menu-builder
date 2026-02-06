"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
import { changePassword, changeUsername, logoutSession } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

type ProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  username: string;
  isAdmin: boolean;
};

export default function ProfileDialog({
  open,
  onOpenChange,
  userId,
  username,
  isAdmin,
}: ProfileDialogProps) {
  const router = useRouter();
  const { logout, setUser, user } = useAuthStore();
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeUsernameOpen, setChangeUsernameOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUsernameSubmitting, setIsUsernameSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setIsSubmitting(false);
    setFormError(null);
    setFormSuccess(null);
  };

  const resetUsernameForm = () => {
    setNewUsername("");
    setIsUsernameSubmitting(false);
    setUsernameError(null);
  };

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!userId) {
      setFormError("Missing user id for password change.");
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
        userId,
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      try {
        await logoutSession();
      } catch {
        // Ignore backend logout errors and clear the local session anyway.
      }
      logout();
      onOpenChange(false);
      router.replace("/login");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeUsername = async (event: FormEvent) => {
    event.preventDefault();
    setUsernameError(null);

    if (!userId) {
      setUsernameError("Missing user id for username change.");
      return;
    }
    if (!newUsername.trim()) {
      setUsernameError("Please enter a username.");
      return;
    }

    setIsUsernameSubmitting(true);
    try {
      await changeUsername({
        targetUserId: userId,
        newUserName: newUsername.trim(),
      });
      setUser(
        user
          ? { ...user, username: newUsername.trim() }
          : { username: newUsername.trim(), isAdmin }
      );
      toast.success(`Username updated to ${newUsername.trim()}.`);
      setNewUsername("");
      setChangeUsernameOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to change username."
      );
      setUsernameError(
        err instanceof Error ? err.message : "Failed to change username."
      );
    } finally {
      setIsUsernameSubmitting(false);
    }
  };

  return (
    <>
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
          <div className="mt-5 flex justify-between gap-2">
            <Button
              type="button"
              // variant="outline"
              className="cursor-pointer"
              onClick={() => {
                resetUsernameForm();
                setChangeUsernameOpen(true);
              }}
            >
              Change Username
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              onClick={() => {
                resetForm();
                setChangeOpen(true);
              }}
            >
              Change Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={changeUsernameOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) resetUsernameForm();
          setChangeUsernameOpen(nextOpen);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Username</DialogTitle>
            <DialogDescription>
              Update your account username.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleChangeUsername}>
            <div className="space-y-2">
              <Label htmlFor="new-username">New Username</Label>
              <Input
                id="new-username"
                value={newUsername}
                onChange={(event) => setNewUsername(event.target.value)}
                autoComplete="username"
              />
            </div>

            {usernameError && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {usernameError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => setChangeUsernameOpen(false)}
                disabled={isUsernameSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={isUsernameSubmitting}
              >
                {isUsernameSubmitting ? "Updating..." : "Update Username"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={changeOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) resetForm();
          setChangeOpen(nextOpen);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Update your password for the current session.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleChangePassword}>
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
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
            {formSuccess && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {formSuccess}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => setChangeOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Changing..." : "Change Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
