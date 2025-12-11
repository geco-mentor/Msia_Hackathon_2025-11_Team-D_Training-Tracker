import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, User, RegisterData, LoginData } from '../api/auth';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (data: LoginData) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Load user on mount if token exists
    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const response = await authAPI.getCurrentUser();
                    if (response.success) {
                        setUser(response.user);
                    } else {
                        localStorage.removeItem('token');
                    }
                } catch (error) {
                    console.error('Failed to load user:', error);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };

        loadUser();
    }, []);

    const login = async (data: LoginData) => {
        const response = await authAPI.login(data);
        if (response.success && response.token && response.user) {
            localStorage.setItem('token', response.token);
            setUser(response.user);
        } else {
            throw new Error(response.message || 'Login failed');
        }
    };

    const register = async (data: RegisterData) => {
        const response = await authAPI.register(data);
        if (response.success && response.token && response.user) {
            localStorage.setItem('token', response.token);
            setUser(response.user);
        } else {
            throw new Error(response.message || 'Registration failed');
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        authAPI.logout().catch(console.error);
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        token: localStorage.getItem('token')
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
