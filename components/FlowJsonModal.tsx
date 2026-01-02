"use client";

type FlowJsonModalProps = {
  isOpen: boolean;
  onClose: () => void;
  flowJson: string;
};

export default function FlowJsonModal({
  isOpen,
  onClose,
  flowJson,
}: FlowJsonModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative w-[90vw] max-w-4xl max-h-[85vh] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="text-sm font-semibold text-gray-800">Flow JSON</div>
          <button
            className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="p-4 overflow-auto">
          <pre className="text-xs text-gray-800 whitespace-pre-wrap">
            {flowJson}
          </pre>
        </div>
      </div>
    </div>
  );
}
