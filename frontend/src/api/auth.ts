import axios from 'axios';

const API_BASE_URL = '/api';

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

export interface RegisterData {
    name: string;
    username: string;
    employee_id: string;
    password: string;
    job_title: string;
    department?: string;
}

export interface LoginData {
    username: string;
    password: string;
}

export interface User {
    id: string;
    name: string;
    username: string;
    role: 'employee' | 'admin';
    employee_id?: string;
    job_title?: string;
    ranking?: number;
    win_rate?: number;
    streak?: number;
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
