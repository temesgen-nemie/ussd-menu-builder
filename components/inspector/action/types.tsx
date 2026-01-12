"use client";

export type ActionRoute = {
  id: string;
  condition?: string;
  nextNodeId?: string;
};

export type ActionNodeData = {
  name?: string;
  endpoint?: string;
  method?: string;
  dataSource?: string;
  field?: string;
  outputVar?: string;
  format?: "indexedList" | "singleValue";
  apiBody?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  responseMapping?: Record<string, unknown>;
  persistResponseMapping?: boolean;
  routes?: ActionRoute[];
  nextNode?: string;
};

export type ActionNode = {
  id: string;
  data: ActionNodeData;
};
