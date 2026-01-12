import axios, { AxiosError } from 'axios';
import { FlowJson } from '../store/flowStore';

const api = axios.create({
    baseURL: 'http://ussdtool.profilesage.com',
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
        // Assuming the same data wrapper structure as getAllFlows
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

export default api;
