import axios, { AxiosError } from 'axios';
import { FlowJson } from '../store/flowStore';

export const API_BASE_URL = 'http://ussdtool.profilesage.com';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const createFlow = async (payload: FlowJson) => {
    try {
        const response = await api.post('/flows', payload);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error?: string }>;
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            throw new Error(axiosError.response?.data?.error || 'Backend error');
        } else if (error instanceof Error) {
            // Something happened in setting up the request that triggered an Error
            throw new Error(error.message);
        } else {
            throw new Error('An unknown error occurred');
        }
    }
};

export const getAllFlows = async () => {
    try {
        const response = await api.get<{ data: FlowJson[] }>('/allFlows');
        return response.data.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error?: string }>;
            throw new Error(axiosError.response?.data?.error || 'Backend error');
        } else if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error('An unknown error occurred');
        }
    }
};

export const getFlowByName = async (flowName: string) => {
    try {
        // Based on user request "http://localhost:4000/flows/:flowName"
        const response = await api.get<{ data: FlowJson[] }>(`/flows/${flowName}`);
        return response.data.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error?: string }>;
            throw new Error(axiosError.response?.data?.error || 'Backend error');
        } else if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error('An unknown error occurred');
        }
    }
};

export const sendUssdRequest = async (xmlRequest: string) => {
    try {
        const response = await api.post('/teleussd/api/v1/ussdRequest', xmlRequest, {
            headers: {
                'Content-Type': 'application/xml',
            },
            responseType: 'text'
        });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error?: string }>;
            throw new Error(axiosError.response?.data?.error || `HTTP error! status: ${axiosError.response?.status}`);
        } else if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error('An unknown error occurred');
        }
    }
};

export const fetchSettings = async () => {
    try {
        const response = await api.get('/settings/fetch');
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error?: string }>;
            throw new Error(axiosError.response?.data?.error || `Failed to fetch settings (${axiosError.response?.status})`);
        } else if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error('An unknown error occurred');
        }
    }
};

export interface SettingsPayload {
    baseUrl: string;
    shortCode: string;
    storageTime?: number;
}

export const saveSettings = async (settings: SettingsPayload) => {
    try {
        const response = await api.post('/settings/create', { settings });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error?: string }>;
            throw new Error(axiosError.response?.data?.error || `Failed to save settings (${axiosError.response?.status})`);
        } else if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error('An unknown error occurred');
        }
    }
};

export default api;
