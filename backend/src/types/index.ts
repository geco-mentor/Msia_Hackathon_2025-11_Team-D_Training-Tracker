export interface Employee {
    id: string;
    name: string;
    username: string;
    employee_id: string;
    password_hash?: string; // Not exposed in API responses
    job_title: string;
    skills_profile: Record<string, number>;
    ranking: number;
    win_rate: number;
    streak: number;
    total_points: number;
    level: number;
    created_at: string;
}

export interface Admin {
    id: string;
    name: string;
    username: string;
    password_hash?: string; // Not exposed in API responses
    created_at: string;
}

export interface RegisterRequestBody {
    name: string;
    username: string;
    employee_id: string;
    password: string;
    job_title: string;
}

export interface LoginRequestBody {
    username: string;
    password: string;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    token?: string;
    user?: {
        id: string;
        name: string;
        username: string;
        role: 'employee' | 'admin';
        employee_id?: string;
        job_title?: string;
        ranking?: number;
        win_rate?: number;
        streak?: number;
        total_points?: number;
        level?: number;
    };
}

export interface ErrorResponse {
    success: false;
    message: string;
    error?: string;
}
