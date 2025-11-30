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
}

export interface EmployeesResponse {
    success: boolean;
    employees: EmployeeSummary[];
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
};
