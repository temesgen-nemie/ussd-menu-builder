"use client";

type BodyEditorProps = {
  apiBodyText: string;
  apiBodyError: string | null;
  onApiBodyChange: (value: string) => void;
};

export default function BodyEditor({
  apiBodyText,
  apiBodyError,
  onApiBodyChange,
}: BodyEditorProps) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">Body (JSON)</label>
      <textarea
        className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm font-mono text-sm placeholder-gray-400 text-gray-900"
        value={apiBodyText}
        rows={8}
        onChange={(e) => onApiBodyChange(e.target.value)}
      />
      {apiBodyError && (
        <div className="text-xs text-red-500 mt-1">{apiBodyError}</div>
      )}
    </div>
  );
}
