import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: 'employee' | 'admin' | 'manager';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && user.role !== requiredRole) {
        // Redirect to appropriate dashboard based on role
        let redirectPath = '/dashboard';
        if (user.role === 'admin') redirectPath = '/admin';
        else if (user.role === 'manager') redirectPath = '/manager';

        return <Navigate to={redirectPath} replace />;
    }

    return <>{children}</>;
};
