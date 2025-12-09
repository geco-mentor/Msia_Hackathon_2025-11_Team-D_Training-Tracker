import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import CreateAssessment from './pages/CreateAssessment';
import { Profile } from './pages/Profile';
import Leaderboard from './pages/Leaderboard';

// Home redirect component
const HomeRedirect: React.FC = () => {
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

    // Redirect based on role
    if (user.role === 'admin') {
        return <Navigate to="/admin" replace />;
    }

    return <Navigate to="/dashboard" replace />;
};

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    {/* Public routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Protected employee routes */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute requiredRole="employee">
                                <EmployeeDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* Protected admin routes */}
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute requiredRole="admin">
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/create-assessment"
                        element={
                            <ProtectedRoute requiredRole="admin">
                                <CreateAssessment />
                            </ProtectedRoute>
                        }
                    />

                    {/* Protected profile route (accessible by both) */}
                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <Profile />
                            </ProtectedRoute>
                        }
                    />

                    {/* Protected leaderboard route (accessible by both) */}
                    <Route
                        path="/leaderboard"
                        element={
                            <ProtectedRoute>
                                <Leaderboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* Home route - redirect based on auth state */}
                    <Route path="/" element={<HomeRedirect />} />

                    {/* Catch all - redirect to home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;