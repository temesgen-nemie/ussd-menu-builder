"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  changeUserRole,
  createUser,
  getUsers,
  suspendUser,
  unsuspendUser,
  unlockUser,
} from "@/lib/api";
import SuspendDialog from "./SuspendDialog";
import {
  Dialog as InnerDialog,
  DialogContent as InnerDialogContent,
  DialogDescription as InnerDialogDescription,
  DialogHeader as InnerDialogHeader,
  DialogTitle as InnerDialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type UserItem = {
  id: string;
  username: string;
  isAdmin: boolean;
  isLocked: boolean;
  suspended: boolean;
  suspensionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

type UsersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function UsersDialog({ open, onOpenChange }: UsersDialogProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [suspendTarget, setSuspendTarget] = useState<UserItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createIsAdmin, setCreateIsAdmin] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [roleLoadingId, setRoleLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const data = await getUsers({ page, pageSize });
        const list = Array.isArray(data?.users) ? data.users : [];
        if (!active) return;
        setUsers(list);
        setTotalPages(Number(data?.totalPages ?? 1));
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load users."
        );
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [open, page, pageSize]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Users</DialogTitle>
            <DialogDescription>
              Manage users and access status.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Total pages: {totalPages}
            </div>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="cursor-pointer bg-linear-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-400"
            >
              Create User
            </Button>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Locked</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <TableRow key={`skeleton-${idx}`}>
                      <TableCell colSpan={6}>
                        <div className="h-6 w-full animate-pulse rounded-md bg-muted/60" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-sm text-muted-foreground"
                    >
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.username}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {u.isAdmin ? "Admin" : "User"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] uppercase ${
                            u.suspended ? "bg-rose-500/15 text-rose-600" : ""
                          }`}
                        >
                          {u.suspended ? "Suspended" : "Active"}
                        </Badge>
                        {u.suspended && u.suspensionReason ? (
                          <div className="mt-2 rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-600">
                            Reason: {u.suspensionReason}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] uppercase ${
                            u.isLocked ? "bg-amber-500/15 text-amber-600" : ""
                          }`}
                        >
                          {u.isLocked ? "Locked" : "Unlocked"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className={`cursor-pointer ${
                              u.isAdmin
                                ? "border-sky-500/40 text-sky-600 hover:bg-sky-500/10 hover:text-sky-700"
                                : "border-indigo-500/40 text-indigo-600 hover:bg-indigo-500/10 hover:text-indigo-700"
                            }`}
                            disabled={roleLoadingId === u.id}
                            onClick={async () => {
                              try {
                                setRoleLoadingId(u.id);
                                const actionType = u.isAdmin ? "demote" : "promote";
                                await changeUserRole({
                                  targetUserId: u.id,
                                  actionType,
                                });
                                setUsers((prev) =>
                                  prev.map((item) =>
                                    item.id === u.id
                                      ? { ...item, isAdmin: actionType === "promote" }
                                      : item
                                  )
                                );
                                toast.success(
                                  actionType === "promote"
                                    ? `Granted admin to ${u.username}.`
                                    : `Removed admin from ${u.username}.`
                                );
                              } catch (err) {
                                toast.error(
                                  err instanceof Error
                                    ? err.message
                                    : "Failed to change role."
                                );
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : "Failed to change role."
                                );
                              } finally {
                                setRoleLoadingId(null);
                              }
                            }}
                          >
                            {u.isAdmin ? "Remove Admin" : "Grant Admin"}
                          </Button>

                          {u.isLocked ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="cursor-pointer border-amber-500/40 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                              onClick={async () => {
                                try {
                                  await unlockUser({ userId: u.id });
                                  setUsers((prev) =>
                                    prev.map((item) =>
                                      item.id === u.id
                                        ? { ...item, isLocked: false }
                                        : item
                                    )
                                  );
                                } catch (err) {
                                  setError(
                                    err instanceof Error
                                      ? err.message
                                      : "Failed to unlock user."
                                  );
                                }
                              }}
                            >
                              Unlock
                            </Button>
                          ) : u.suspended ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="cursor-pointer border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                              onClick={async () => {
                                try {
                                  await unsuspendUser({ userId: u.id });
                                  setUsers((prev) =>
                                    prev.map((item) =>
                                      item.id === u.id
                                        ? {
                                            ...item,
                                            suspended: false,
                                            suspensionReason: null,
                                          }
                                        : item
                                    )
                                  );
                                } catch (err) {
                                  setError(
                                    err instanceof Error
                                      ? err.message
                                      : "Failed to unsuspend user."
                                  );
                                }
                              }}
                            >
                              Unsuspend
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="cursor-pointer border-red-500/40 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                              disabled={u.isLocked}
                              onClick={() => setSuspendTarget(u)}
                            >
                              Suspend
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {suspendTarget && (
        <SuspendDialog
          open={Boolean(suspendTarget)}
          onOpenChange={(next) => {
            if (!next) setSuspendTarget(null);
          }}
          username={suspendTarget.username}
          onConfirm={async (reason) => {
            await suspendUser({
              userId: suspendTarget.id,
              suspensionReason: reason,
            });
            setUsers((prev) =>
              prev.map((item) =>
                item.id === suspendTarget.id
                  ? { ...item, suspended: true, suspensionReason: reason }
                  : item
              )
            );
          }}
        />
      )}

      <InnerDialog open={createOpen} onOpenChange={setCreateOpen}>
        <InnerDialogContent className="max-w-sm">
          <InnerDialogHeader>
            <InnerDialogTitle>Create User</InnerDialogTitle>
            <InnerDialogDescription>
              Add a new user with a username and password.
            </InnerDialogDescription>
          </InnerDialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Username"
              value={createUsername}
              onChange={(event) => setCreateUsername(event.target.value)}
            />
            <Input
              placeholder="Password"
              type="password"
              value={createPassword}
              onChange={(event) => setCreatePassword(event.target.value)}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={createIsAdmin}
                onChange={(event) => setCreateIsAdmin(event.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border border-border bg-background text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="text-foreground">Is Admin?</span>
            </label>
            <Button
              disabled={createLoading}
              className="cursor-pointer bg-linear-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-400"
              onClick={async () => {
                setCreateLoading(true);
                try {
                  await createUser({
                    username: createUsername.trim(),
                    password: createPassword,
                    isAdmin: createIsAdmin,
                  });
                  setCreateUsername("");
                  setCreatePassword("");
                  setCreateIsAdmin(false);
                  setCreateOpen(false);
                  // Refresh users after create.
                  const data = await getUsers({ page, pageSize });
                  setUsers(Array.isArray(data?.users) ? data.users : []);
                  setTotalPages(Number(data?.totalPages ?? 1));
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Failed to create user."
                  );
                } finally {
                  setCreateLoading(false);
                }
              }}
            >
              {createLoading ? "Creating..." : "Create"}
            </Button>
          </div>
        </InnerDialogContent>
      </InnerDialog>
    </>
  );
}
