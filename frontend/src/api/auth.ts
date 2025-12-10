import axios, { AxiosResponse } from 'axios';

import { API_BASE_URL as CONFIG_URL } from '../config';

const API_BASE_URL = `${CONFIG_URL}/api`;

// Retry configuration
const MAX_RETRIES = 10;
const RETRY_DELAY = 1500; // 1.5 seconds

// Axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/**
 * Retry wrapper for axios requests
 * Retries up to 10 times with 1.5s interval on network errors or 5xx responses
 */
async function axiosWithRetry<T>(
    requestFn: () => Promise<AxiosResponse<T>>
): Promise<AxiosResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`API call attempt ${attempt}/${MAX_RETRIES}`);
            const response = await requestFn();

            // Retry on 5xx server errors
            if (response.status >= 500 && attempt < MAX_RETRIES) {
                console.warn(`Server error (${response.status}), retrying in ${RETRY_DELAY}ms...`);
                await new Promise(r => setTimeout(r, RETRY_DELAY));
                continue;
            }

            return response;
        } catch (error: any) {
            lastError = error;

            const isNetworkError =
                error.code === 'ECONNREFUSED' ||
                error.code === 'ECONNRESET' ||
                error.code === 'ERR_NETWORK' ||
                error.message?.includes('Network Error') ||
                error.message?.includes('ECONNREFUSED');

            const isServerError = error.response?.status >= 500;

            if ((isNetworkError || isServerError) && attempt < MAX_RETRIES) {
                console.warn(`Request failed (${error.code || error.message}), retrying in ${RETRY_DELAY}ms... (${attempt}/${MAX_RETRIES})`);
                await new Promise(r => setTimeout(r, RETRY_DELAY));
                continue;
            }

            // For non-retryable errors, throw immediately
            throw error;
        }
    }

    throw lastError || new Error(`Failed after ${MAX_RETRIES} retries`);
}

export interface RegisterData {
    name: string;
    username: string;
    employee_id: string;
    password: string;
    job_title: string;
    department?: string;
    job_description?: string;
}

export interface LoginData {
    username: string;
    password: string;
}

export interface User {
    id: string;
    name: string;
    username: string;
    role: 'employee' | 'admin' | 'manager';
    department?: string;
    employee_id?: string;
    job_title?: string;
    ranking?: number;
    win_rate?: number;
    streak?: number;
    elo_rating?: number;
    skills_profile?: Record<string, number>;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    token?: string;
    user?: User;
}


export const authAPI = {
    register: async (data: RegisterData): Promise<AuthResponse> => {
        const response = await axiosWithRetry(() => api.post('/auth/register', data));
        return response.data;
    },

    login: async (data: LoginData): Promise<AuthResponse> => {
        const response = await axiosWithRetry(() => api.post('/auth/login', data));
        return response.data;
    },

    logout: async (): Promise<void> => {
        await axiosWithRetry(() => api.post('/auth/logout'));
    },

    getCurrentUser: async (): Promise<{ success: boolean; user: User }> => {
        const response = await axiosWithRetry(() => api.get('/auth/me'));
        return response.data;
    },
};

export default api;
