"use client";

type ActionHeaderProps = {
  name: string;
  endpoint: string;
  onNameChange: (value: string) => void;
  onEndpointChange: (value: string) => void;
};

export default function ActionHeader({
  name,
  endpoint,
  onNameChange,
  onEndpointChange,
}: ActionHeaderProps) {
  return (
    <div className="grid grid-cols-1">
      <div>
        <label className="text-xs font-medium text-gray-600">Endpoint Name</label>
        <input
          className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900"
          value={name}
          placeholder="e.g. API Action"
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>
      {/* <div>
        <label className="text-xs font-medium text-gray-600">Endpoint URL</label>
        <input
          className="mt-2 w-full rounded-md border border-gray-100 p-2 bg-white shadow-sm placeholder-gray-400 text-gray-900"
          value={endpoint}
          placeholder="https://api.example.com"
          onChange={(e) => onEndpointChange(e.target.value)}
        />
      </div> */}
    </div>
  );
}
