"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { updateFlow } from "../../lib/api";
import { useFlowStore, type FlowJson } from "../../store/flowStore";

export default function GroupJsonModal() {
  const { groupJsonModal, closeGroupJson, nodes, applyGroupJson } =
    useFlowStore();
  const publishedFlows = useFlowStore((state) => state.publishedFlows);
  const [draftJson, setDraftJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveInProgress, setSaveInProgress] = useState(false);

  const isOpen = Boolean(groupJsonModal?.isOpen);
  useEffect(() => {
    if (isOpen && groupJsonModal) {
      setDraftJson(groupJsonModal.json);
      setError(null);
    }
  }, [isOpen, groupJsonModal]);

  if (!isOpen || !groupJsonModal) return null;

  const groupName =
    nodes.find((n) => n.id === groupJsonModal.groupId)?.data.name || "Subflow";

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-indigo-950/40 backdrop-blur-md animate-in fade-in duration-300"
        onClick={closeGroupJson}
      />
      <div className="relative w-[90vw] max-w-4xl max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-indigo-100 flex flex-col overflow-hidden transform animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between px-8 py-5 border-b border-indigo-50 bg-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>
            <div>
              <div className="text-lg font-black text-gray-800 tracking-tight">
                Subflow JSON Export
              </div>
              <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest">
                {groupName}
              </div>
            </div>
          </div>
          <button
            className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-indigo-600 transition-all active:scale-95"
            onClick={closeGroupJson}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 p-8 overflow-auto bg-gray-50/50 font-mono text-sm leading-relaxed">
          <div className="bg-white rounded-2xl border border-indigo-50 shadow-inner p-6">
            <textarea
              value={draftJson}
              onChange={(event) => setDraftJson(event.target.value)}
              spellCheck={false}
              className="w-full min-h-[40vh] text-gray-800 whitespace-pre-wrap bg-transparent outline-none resize-none"
            />
          </div>
          {error && (
            <div className="mt-3 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="px-8 py-4 bg-indigo-50/30 border-t border-indigo-50 flex justify-end gap-3">
          <button
            onClick={async () => {
              if (saveInProgress) return;
              setSaveInProgress(true);
              try {
                let parsed: FlowJson | null = null;
                try {
                  parsed = JSON.parse(draftJson) as FlowJson;
                } catch {
                  parsed = null;
                }

                const flowName = parsed?.flowName;
                const isPublished =
                  Boolean(flowName) &&
                  publishedFlows.includes(flowName as string);

                applyGroupJson(groupJsonModal.groupId || "", draftJson);
                setError(null);

                if (isPublished && parsed && flowName) {
                  await updateFlow(flowName, parsed);
                  toast.success("Flow JSON saved and updated on the backend.");
                } else {
                  toast.success("Flow JSON saved.");
                }

                closeGroupJson();
              } catch (err) {
                const message =
                  err instanceof Error ? err.message : "Failed to save JSON.";
                setError(message);
                toast.error(message);
              } finally {
                setSaveInProgress(false);
              }
            }}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 cursor-pointer"
          >
            Save
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(draftJson);
            }}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
              />
            </svg>
            Copy to Clipboard
          </button>
        </div>
      </div>
    </div>
  );
}
