import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Dummy persistence for demo purposes
    useEffect(() => {
        const auth = localStorage.getItem('auth');
        if (auth === 'true') {
            setIsAuthenticated(true);
        }
    }, []);

    const handleLogin = () => {
        setIsAuthenticated(true);
        localStorage.setItem('auth', 'true');
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('auth');
    };

    // Protected Route wrapper
    const ProtectedRoute = ({ children }) => {
        if (!isAuthenticated) {
            return <Navigate to="/login" replace />;
        }
        return children;
    };

    return (
        <Router>
            <Routes>
                {/* Public Route */}
                <Route
                    path="/login"
                    element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />}
                />

                {/* Protected Layout Routes */}
                <Route path="/" element={
                    <ProtectedRoute>
                        <Layout onLogout={handleLogout} />
                    </ProtectedRoute>
                }>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="analyze" element={<Dashboard />} /> {/* For now, point to Dashboard */}
                    <Route path="settings" element={
                        <div className="p-8 bg-white rounded-xl shadow-sm border border-gray-200">
                            <h2 className="text-xl font-bold">Settings</h2>
                            <p className="text-gray-500 mt-2">Settings module coming soon...</p>
                        </div>
                    } />
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
