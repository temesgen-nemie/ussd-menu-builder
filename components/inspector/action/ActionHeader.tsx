"use client";

import NodeNameInput from "../NodeNameInput";

type ActionHeaderProps = {
  nodeId: string;
  name: string;
  endpoint: string;
  onNameChange: (value: string) => void;
  onEndpointChange: (value: string) => void;
};

export default function ActionHeader({
  nodeId,
  name,
  endpoint,
  onNameChange,
  onEndpointChange,
}: ActionHeaderProps) {
  return (
    <div className="grid grid-cols-1">
      <NodeNameInput
        nodeId={nodeId}
        name={name}
        onNameChange={onNameChange}
        label="Endpoint Name"
      />
    </div>
  );
}
