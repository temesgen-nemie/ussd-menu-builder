import axios, { AxiosError } from "axios";
import { FlowJson, FlowNode } from "../store/flowStore";

export const API_BASE_URL = "https://ussdtool.profilesage.com";

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

export const createFlow = async (payload: FlowJson) => {
    try {
        const response = await api.post("/flows", payload);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error?: string }>;
            throw new Error(axiosError.response?.data?.error || "Backend error");
        } else if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error("An unknown error occurred");
        }
    }
};

export const getAllFlows = async () => {
    try {
        const response = await api.get<{ data: FlowJson[] }>("/allFlows");
        return response.data.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error?: string }>;
            throw new Error(axiosError.response?.data?.error || "Backend error");
        } else if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error("An unknown error occurred");
        }
    }
};

export const getFlowByName = async (flowName: string) => {
    try {
        const response = await api.get<{ data: FlowJson[] }>(`/flows/${flowName}`);
        return response.data.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error?: string }>;
            throw new Error(axiosError.response?.data?.error || "Backend error");
        } else if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error("An unknown error occurred");
        }
    }
};

export const updateFlow = async (flowName: string, payload: FlowJson) => {
    try {
        const response = await api.post(`/flows/updateFlows/${flowName}`, payload);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error?: string }>;
            throw new Error(axiosError.response?.data?.error || "Backend error");
        } else if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error("An unknown error occurred");
        }
    }
};

export const sendUssdRequest = async (xmlRequest: string) => {
    try {
        const response = await api.post(
            "/teleussd/api/v1/ussdRequest",
            xmlRequest,
            {
                headers: { "Content-Type": "application/xml" },
                responseType: "text",
            }
        );
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error?: string }>;
            throw new Error(
                axiosError.response?.data?.error ||
                `HTTP error! status: ${axiosError.response?.status}`
            );
        } else if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error("An unknown error occurred");
        }
    }
};

export const fetchSettings = async () => {
    try {
        const response = await api.get("/settings/fetch");
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error?: string }>;
            throw new Error(
                axiosError.response?.data?.error ||
                `Failed to fetch settings (${axiosError.response?.status})`
            );
        } else if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error("An unknown error occurred");
        }
    }
};

export interface SettingsPayload {
    endpoints: string[];
}

export const saveSettings = async (settings: SettingsPayload) => {
    try {
        const response = await api.post("/settings/create", { settings });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error?: string }>;
            throw new Error(
                axiosError.response?.data?.error ||
                `Failed to save settings (${axiosError.response?.status})`
            );
        } else if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error("An unknown error occurred");
        }
    }
};

export const deleteFlow = async (flowName: string) => {
    try {
        const response = await api.delete(`/flows/${flowName}`);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error?: string }>;
            throw new Error(axiosError.response?.data?.error || "Backend error");
        } else if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error("An unknown error occurred");
        }
    }
};

export const updateNodeInFlow = async (
    flowName: string,
    nodeName: string,
    nodeData: FlowNode,
    previousName?: string
) => {
    try {
        const response = await api.put(`/flows/${flowName}/nodes/${nodeName}`, {
            flowName,
            nodeName,
            previousName,
            node: nodeData,
        });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error?: string }>;
            throw new Error(axiosError.response?.data?.error || "Backend error");
        } else if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error("An unknown error occurred");
        }
    }
};

export const getLogs = async (params: {
    from: string;
    to: string;
    limit: number;
}) => {
    try {
        const response = await api.get("/admin/logs", { params });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error?: string }>;
            throw new Error(
                axiosError.response?.data?.error ||
                `Failed to fetch logs (${axiosError.response?.status})`
            );
        } else if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error("An unknown error occurred");
        }
    }
};

export default api;