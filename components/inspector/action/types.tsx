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
  apiBodyRaw?: string;
  bodyMode?: "json" | "soap";
  headers?: Record<string, unknown>;
  responseMapping?: Record<string, unknown>;
  persistResponseMappingKeys?: string[];
  encryptResponseMappingKeys?: string[];
  routes?: ActionRoute[];
  nextNode?: string;
};

export type ActionNode = {
  id: string;
  data: ActionNodeData;
};
