import axios from 'axios';

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

// Retry Interceptor
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;

        // Create a custom property for retry count to avoid TypeScript errors we bypass it with 'as any' or extending the type
        // For simplicity in this file we'll check it safely
        const retryCount = (config as any)._retryCount || 0;

        // If no config or retried too many times, reject
        if (!config || retryCount >= MAX_RETRIES) {
            return Promise.reject(error);
        }

        const isNetworkError =
            error.code === 'ECONNREFUSED' ||
            error.code === 'ECONNRESET' ||
            error.code === 'ERR_NETWORK' ||
            error.message?.includes('Network Error') ||
            !error.response;

        const isServerError = error.response && error.response.status >= 500;

        if (isNetworkError || isServerError) {
            (config as any)._retryCount = retryCount + 1;
            console.warn(`Request failed (${error.code || (error.response && error.response.status)}), retrying in ${RETRY_DELAY}ms... (${config._retryCount}/${MAX_RETRIES})`);

            // Wait
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));

            // Retry the request
            return api(config);
        }

        return Promise.reject(error);
    }
);

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
        const response = await api.post('/auth/register', data);
        return response.data;
    },

    login: async (data: LoginData): Promise<AuthResponse> => {
        const response = await api.post('/auth/login', data);
        return response.data;
    },

    logout: async (): Promise<void> => {
        await api.post('/auth/logout');
    },

    getCurrentUser: async (): Promise<{ success: boolean; user: User }> => {
        const response = await api.get('/auth/me');
        return response.data;
    },
};

export default api;
