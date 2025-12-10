import api from './auth';

export interface DashboardStats {
    ranking: number;
    win_rate: number;
    streak: number;
    total_assessments: number;
}

export interface DashboardResponse {
    success: boolean;
    stats: DashboardStats;
}

export interface EmployeeSummary {
    id: string;
    name: string;
    role: string;
    department: string;
    progress: number;
    status: string;
    elo_rating: number;
    skills_profile?: Record<string, number>;
}

export interface EmployeesResponse {
    success: boolean;
    employees: EmployeeSummary[];
}

export interface LeaderboardEntry {
    id: string;
    rank: number;
    name: string;
    username: string;
    department: string;
    elo_rating: number;
    win_rate: number;
    total_points: number;
    job_title: string;
}

export interface LeaderboardResponse {
    success: boolean;
    leaderboard: LeaderboardEntry[];
}

export const employeeAPI = {
    getDashboardStats: async (): Promise<DashboardResponse> => {
        const response = await api.get('/employees/dashboard');
        return response.data;
    },

    getAllEmployees: async (): Promise<EmployeesResponse> => {
        const response = await api.get('/employees/all');
        return response.data;
    },

    getGlobalLeaderboard: async (): Promise<LeaderboardResponse> => {
        const response = await api.get('/employees/leaderboard');
        return response.data;
    },
};