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
  ignoreTlsCertificateVerification?: boolean;
  dataSource?: "inputManager" | "redis" | "commonManager";
  commonManagerFetchMode?: "session" | "search";
  commonManagerFetchSessionId?: string;
  commonManagerSearchField?: string;
  commonManagerSearchValue?: string;
  field?: string;
  outputVar?: string;
  fields?: string[];
  outputVars?: string[];
  format?: "indexedList" | "singleValue";
  apiBody?: Record<string, unknown>;
  apiBodyRaw?: string;
  apiBodyForm?: Array<{
    key: string;
    value: string;
    description?: string;
  }>;
  bodyMode?: "json" | "soap" | "x-www-form-urlencoded";
  requestSource?: "api" | "local";
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
