"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { assignFlowPermissions, getAssignableUsers, revokeFlowPermissions } from "@/lib/api";
import { toast } from "sonner";
import PaginationControls from "@/components/ui/pagination-controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FlowAccess = {
  canPublish: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

type AssignableUser = {
  id: string;
  username: string;
  flowAccess: FlowAccess | null;
};

type FlowPermissionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flowName: string | null;
};

const emptyAccess: FlowAccess = {
  canPublish: false,
  canUpdate: false,
  canDelete: false,
};

export default function FlowPermissionsDialog({
  open,
  onOpenChange,
  flowName,
}: FlowPermissionsDialogProps) {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [permissions, setPermissions] = useState<Record<string, FlowAccess>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasFlowName = Boolean(flowName);

  useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [open, flowName]);

  const loadAssignableUsers = useCallback(async () => {
    if (!flowName) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAssignableUsers(flowName, { page, pageSize: 10 });
      const list: AssignableUser[] = Array.isArray(data?.users) ? data.users : [];
      setUsers(list);
      setTotalPages(Number(data?.totalPages ?? 1));

      // Always derive checkbox state from backend truth.
      const nextPermissions = list.reduce<Record<string, FlowAccess>>(
        (acc, entry) => {
          acc[entry.id] = entry.flowAccess ?? { ...emptyAccess };
          return acc;
        },
        {}
      );
      setPermissions(nextPermissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  }, [flowName, page]);

  useEffect(() => {
    if (!open || !flowName) return;
    loadAssignableUsers();
  }, [flowName, open, page, loadAssignableUsers]);


  const handleAssignToggle = (userId: string) => {
    setPermissions((prev) => {
      const current = prev[userId] ?? { ...emptyAccess };
      const isAssigned =
        current.canPublish && current.canUpdate && current.canDelete;
      const next = isAssigned
        ? { ...emptyAccess }
        : { canPublish: true, canUpdate: true, canDelete: true };
      return { ...prev, [userId]: next };
    });
  };

  const handleSave = async () => {
    if (!flowName) return;
    if (!user?.userId) {
      toast.error("Missing current user id.");
      return;
    }
    setIsSaving(true);
    try {
      const actorUserId = user.userId;
      const targets = users
        .map((entry) => ({
          id: entry.id,
          permissions: permissions[entry.id] ?? { ...emptyAccess },
        }))
        .filter((entry) =>
          entry.permissions.canPublish ||
          entry.permissions.canUpdate ||
          entry.permissions.canDelete
        );

      if (targets.length === 0) {
        toast.error("Select at least one user to assign.");
        return;
      }

      await Promise.all(
        targets.map((entry) =>
          assignFlowPermissions(flowName, {
            targetUserId: entry.id,
            user: { userId: actorUserId },
            permissions: entry.permissions,
          })
        )
      );
      toast.success("Permissions assigned.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign permissions");
      await loadAssignableUsers();
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevoke = async (targetUserId: string) => {
    if (!flowName) return;
    if (!user?.userId) {
      toast.error("Missing current user id.");
      return;
    }
    setRevokingUserId(targetUserId);
    try {
      await revokeFlowPermissions(flowName, {
        targetUserId,
        user: { userId: user.userId },
      });
      toast.success("Permissions revoked.");
      onOpenChange(false);
      setUsers((prev) =>
        prev.map((entry) =>
          entry.id === targetUserId ? { ...entry, flowAccess: null } : entry
        )
      );
      setPermissions((prev) => ({ ...prev, [targetUserId]: { ...emptyAccess } }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke permissions");
    } finally {
      setRevokingUserId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Flow Permissions</DialogTitle>
          <DialogDescription>
            {flowName ? `Manage permissions for ${flowName}.` : "Select a flow."}
          </DialogDescription>
        </DialogHeader>

        {!hasFlowName ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            Flow name not found.
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="max-h-[55vh] overflow-auto rounded-xl border border-border">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-left">User</TableHead>
                    <TableHead className="text-center">Assign</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={`permissions-skeleton-${index}`} className="animate-pulse">
                        {Array.from({ length: 3 }).map((__, cellIndex) => (
                          <TableCell key={`permissions-skeleton-cell-${index}-${cellIndex}`}>
                            <div className="h-3 w-full rounded-full bg-muted/60" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No eligible users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((entry) => {
                    const perms = permissions[entry.id] ?? emptyAccess;
                    const isAssigned =
                      perms.canPublish && perms.canUpdate && perms.canDelete;
                    const hasSavedPermission = Boolean(entry.flowAccess);
                    return (
                      <TableRow key={entry.id}>
                          <TableCell className="font-semibold text-foreground">
                            {entry.username}
                          </TableCell>
                          <TableCell className="text-center">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => handleAssignToggle(entry.id)}
                              className="h-4 w-4 cursor-pointer rounded border border-border"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {hasSavedPermission ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="cursor-pointer"
                                disabled={Boolean(revokingUserId)}
                                onClick={() => handleRevoke(entry.id)}
                              >
                                {revokingUserId === entry.id ? "Revoking..." : "Revoke"}
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                Page {page} of {totalPages}
              </span>
              <PaginationControls
                page={page}
                totalPages={totalPages}
                disabled={isLoading}
                onPageChange={setPage}
                className="w-auto"
              />
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="cursor-pointer bg-linear-to-r from-indigo-600 via-purple-600 to-violet-600 text-white shadow-md shadow-indigo-200/40 hover:from-indigo-500 hover:via-purple-500 hover:to-violet-500"
              >
                {isSaving ? "Saving..." : "Save Permissions"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
