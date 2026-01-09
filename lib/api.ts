import axios, { AxiosError } from 'axios';
import { FlowJson } from '../store/flowStore';

const api = axios.create({
    baseURL: 'https://nkp8ip-ip-196-188-180-72.tunnelmole.net',
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

export default api;
