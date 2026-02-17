import React from "react";
import { useFlowStore } from "../../store/flowStore";

interface DeleteConfirmModalProps {
  flowName: string;
  groupId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  flowName,
  groupId,
  isOpen,
  onClose,
}) => {
  const { deletePublishedFlow, deletePublishedFlowRecursive } = useFlowStore();

  if (!isOpen) return null;

  const handleConfirm = async () => {
    await deletePublishedFlow(flowName);
    onClose();
  };

  const handleRecursiveDelete = async () => {
    if (groupId) {
      await deletePublishedFlowRecursive(groupId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-red-100 rounded-2xl text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Delete Backend Flow</h3>
              <p className="text-sm text-slate-500">This action cannot be undone</p>
            </div>
          </div>

          <p className="text-slate-600 mb-8 leading-relaxed">
            Are you sure you want to delete <span className="font-bold text-slate-900">"{flowName}"</span> from the backend? This will permanently remove the flow and its configuration.
          </p>

          <div className="flex flex-col gap-3 mt-2">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3.5 rounded-2xl text-slate-600 font-semibold hover:bg-slate-100 active:scale-95 transition-all border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-[1.5] px-6 py-3.5 rounded-2xl bg-red-50 text-red-600 font-bold hover:bg-red-100 active:scale-95 transition-all border border-red-100"
              >
                Delete Single Flow
              </button>
            </div>
            {groupId && (
              <button
                onClick={handleRecursiveDelete}
                className="w-full px-6 py-4 rounded-2xl bg-red-600 text-white font-bold shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2 group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Recursive Delete (Everything Inside)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
