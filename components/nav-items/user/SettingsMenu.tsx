"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFlowStore } from "@/store/flowStore";
import {
  createFlowSettings,
  deleteFlowSettings,
  fetchFlowSettings,
  updateFlowSettings,
} from "@/lib/api";
import { toast } from "sonner";

type SettingsMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const parseSettingsResponse = (data: unknown) => {
  const settings =
    (data as { settings?: Record<string, unknown> })?.settings ??
    (data as { data?: Record<string, unknown> })?.data ??
    (data as Record<string, unknown>) ??
    {};
  const rest = { ...settings };
  delete (rest as Record<string, unknown>).flowName;
  return rest as Record<string, unknown>;
};

const coerceValue = (value: string) => {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  const numberValue = Number(trimmed);
  if (!Number.isNaN(numberValue)) return numberValue;
  return trimmed;
};

export default function SettingsMenu({ open, onOpenChange }: SettingsMenuProps) {
  const nodes = useFlowStore((state) => state.nodes);
  const publishedGroupIds = useFlowStore((state) => state.publishedGroupIds);
  const [selectedFlow, setSelectedFlow] = useState("");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [originalSettings, setOriginalSettings] = useState<Record<string, string>>({});
  const [deleteKeys, setDeleteKeys] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flowOptions = useMemo(() => {
    const groups = nodes.filter(
      (node) =>
        node.type === "group" &&
        !node.parentNode &&
        publishedGroupIds.includes(node.id)
    );
    const seen = new Set<string>();
    return groups
      .map((group) => {
        const children = nodes.filter((n) => n.parentNode === group.id);
        const startNode = children.find((n) => n.type === "start");
        const flowName = (startNode?.data as { flowName?: string } | undefined)?.flowName;
        if (!flowName || seen.has(flowName)) return null;
        seen.add(flowName);
        return { id: group.id, name: flowName };
      })
      .filter(Boolean) as { id: string; name: string }[];
  }, [nodes, publishedGroupIds]);

  useEffect(() => {
    if (!open) return;
    if (!selectedFlow && flowOptions.length > 0) {
      setSelectedFlow(flowOptions[0].name);
    }
  }, [flowOptions, open, selectedFlow]);

  useEffect(() => {
    if (!open || !selectedFlow) return;
    let isActive = true;
    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchFlowSettings(selectedFlow);
        const next = parseSettingsResponse(data);
        if (!isActive) return;
        const normalized = Object.fromEntries(
          Object.entries(next).map(([key, value]) => [
            key,
            value === null || value === undefined ? "" : String(value),
          ])
        );
        setSettings(normalized);
        setOriginalSettings(normalized);
        setDeleteKeys({});
      } catch (err) {
        if (!isActive) return;
        setSettings({});
        setOriginalSettings({});
        setDeleteKeys({});
        setError(err instanceof Error ? err.message : "Unable to load settings.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadSettings();
    return () => {
      isActive = false;
    };
  }, [open, selectedFlow]);

  const handleSave = async () => {
    if (!selectedFlow) {
      setError("Please select a flow.");
      return;
    }
    setIsSaving(true);
    setError(null);
    const payloadSettings = Object.fromEntries(
      Object.entries(settings).map(([key, value]) => [key, coerceValue(value)])
    );
    const hasAny = Object.keys(payloadSettings).length > 0;
    const fieldList = Object.keys(payloadSettings);
    const changedKeys = fieldList.filter(
      (key) => String(settings[key] ?? "") !== String(originalSettings[key] ?? "")
    );

    try {
      if (!hasAny) {
        setError("Add at least one field before saving.");
        return;
      }
      const payload = { flowName: selectedFlow, settings: payloadSettings };
      await updateFlowSettings(payload);
      toast.success(
        changedKeys.length
          ? `${changedKeys.join(", ")} updated`
          : "No changes to update."
      );
      setOriginalSettings(settings);
    } catch {
      try {
        const payload = { flowName: selectedFlow, settings: payloadSettings };
        await createFlowSettings(payload);
        toast.success(
          fieldList.length
            ? `${fieldList.join(", ")} created`
            : "Settings created."
        );
        setOriginalSettings(settings);
      } catch (innerErr) {
        const message =
          innerErr instanceof Error ? innerErr.message : "Unable to save settings.";
        setError(message);
        toast.error(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedFlow) {
      setError("Please select a flow.");
      return;
    }
    const keys = Object.entries(deleteKeys)
      .filter(([, value]) => value)
      .map(([key]) => key);
    if (keys.length === 0) return;

    setIsDeleting(true);
    setError(null);
    try {
      await deleteFlowSettings({ flowName: selectedFlow, keys });
      setSettings((prev) => {
        const next = { ...prev };
        keys.forEach((key) => delete next[key]);
        return next;
      });
      setDeleteKeys((prev) => {
        const next = { ...prev };
        keys.forEach((key) => delete next[key]);
        return next;
      });
      toast.success(
        keys.length === 1
          ? `${keys[0]} deleted`
          : `${keys.join(", ")} deleted`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to delete settings.";
      setError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddField = async () => {
    if (!selectedFlow) {
      setError("Please select a flow.");
      return;
    }
    const key = newKey.trim();
    if (!key) {
      setError("Field name is required.");
      return;
    }
    setIsAdding(true);
    setError(null);
    const mergedSettings = {
      ...Object.fromEntries(
        Object.entries(settings).map(([k, v]) => [k, coerceValue(v)])
      ),
      [key]: coerceValue(newValue),
    };

    try {
      await createFlowSettings({
        flowName: selectedFlow,
        settings: mergedSettings,
      });
      setSettings((prev) => ({
        ...prev,
        [key]: newValue,
      }));
      setNewKey("");
      setNewValue("");
      setIsAddOpen(false);
      toast.success(`${key} created`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to add field.";
      setError(message);
      toast.error(message);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Flow Settings</DialogTitle>
          <DialogDescription>
            Configure settings for a specific flow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Flow</label>
            <Select
              value={selectedFlow}
              onValueChange={(value) => {
                setSelectedFlow(value);
                setError(null);
              }}
            >
              <SelectTrigger className="cursor-pointer w-1/2">
                <SelectValue placeholder="Select a flow" />
              </SelectTrigger>
              <SelectContent>
                {flowOptions.map((flow) => (
                  <SelectItem key={flow.id} value={flow.name}>
                    {flow.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {Object.keys(settings).length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(settings).map(([key, value]) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    {key}
                  </label>
                  <Input
                    value={value}
                    onChange={(event) =>
                      setSettings((prev) => ({ ...prev, [key]: event.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              No settings found for this flow.
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-muted-foreground uppercase">
                Additional fields
              </div>
              <button
                type="button"
                className="text-xs text-foreground/80 hover:text-foreground cursor-pointer"
                onClick={() => setIsAddOpen(true)}
              >
                + Add field
              </button>
            </div>
          </div>

          {Object.keys(settings).length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase">
                Delete keys
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {Object.keys(settings).map((key) => (
                  <label key={key} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={Boolean(deleteKeys[key])}
                      onChange={(event) =>
                        setDeleteKeys((prev) => ({
                          ...prev,
                          [key]: event.target.checked,
                        }))
                      }
                    />
                    {key}
                  </label>
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="text-xs text-muted-foreground">
              Loading settings...
            </div>
          )}
          {error && <div className="text-xs text-destructive">{error}</div>}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            disabled={
              isDeleting ||
              isLoading ||
              Object.values(deleteKeys).every((value) => !value)
            }
            className="cursor-pointer border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="cursor-pointer"
          >
            {isSaving ? "Saving..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Field</DialogTitle>
            <DialogDescription>
              Add a new setting key/value for this flow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Field Name
              </label>
              <Input
                value={newKey}
                onChange={(event) => setNewKey(event.target.value)}
                placeholder="e.g. timeoutMs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Value
              </label>
              <Input
                value={newValue}
                onChange={(event) => setNewValue(event.target.value)}
                placeholder="e.g. 10000"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddField}
              disabled={isAdding}
              className="cursor-pointer"
            >
              {isAdding ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
