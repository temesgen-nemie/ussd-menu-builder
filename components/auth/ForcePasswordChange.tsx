"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
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

const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(2, "Password must be at least 6 characters")
      .max(12, "Current password is too long"),
    newPassword: z
      .string()
      .min(2, "Password must be at least 6 characters")
      .max(12, "New password is too long"),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "New password must be different.",
    path: ["newPassword"],
  });

export default function ForcePasswordChange() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (!user?.userId) {
      setFormError("Missing user id. Please log in again.");
      return;
    }

    const result = passwordChangeSchema.safeParse({
      currentPassword,
      newPassword,
    });

    if (!result.success) {
      const nextErrors = result.error.flatten().fieldErrors;
      setFieldErrors({
        currentPassword: nextErrors.currentPassword?.[0],
        newPassword: nextErrors.newPassword?.[0],
      });
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
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                if (fieldErrors.currentPassword) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    currentPassword: undefined,
                  }));
                }
              }}
              autoComplete="current-password"
            />
            {fieldErrors.currentPassword && (
              <div className="text-[11px] font-medium text-rose-600">
                {fieldErrors.currentPassword}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="force-new-password">New Password</Label>
            <Input
              id="force-new-password"
              type="password"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                if (fieldErrors.newPassword) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    newPassword: undefined,
                  }));
                }
              }}
              autoComplete="new-password"
            />
            {fieldErrors.newPassword && (
              <div className="text-[11px] font-medium text-rose-600">
                {fieldErrors.newPassword}
              </div>
            )}
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
