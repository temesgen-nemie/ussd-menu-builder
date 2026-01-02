"use client";

type PersistToggleProps = {
  persistResponseMapping: boolean;
  onPersistResponseMappingChange: (value: boolean) => void;
};

export default function PersistToggle({
  persistResponseMapping,
  onPersistResponseMappingChange,
}: PersistToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs font-medium text-gray-600">
        Persist Response Mapping
      </label>
      <input
        type="checkbox"
        checked={persistResponseMapping}
        onChange={(e) => onPersistResponseMappingChange(e.target.checked)}
      />
    </div>
  );
}
