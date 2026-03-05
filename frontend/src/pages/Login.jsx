import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, UserPlus, LogIn, AlertCircle } from 'lucide-react';

const Login = ({ onLogin }) => {
    const [isRegisterMode, setIsRegisterMode] = useState(true); // Show register first
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleRegister = (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!username.trim() || !password.trim()) {
            setError('Please enter both username and password.');
            return;
        }

        if (password.length < 4) {
            setError('Password must be at least 4 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        // Check if user already exists
        const existingUsers = JSON.parse(localStorage.getItem('registered_users') || '{}');
        if (existingUsers[username.toLowerCase()]) {
            setError('Username already exists. Please sign in.');
            return;
        }

        // Register user
        existingUsers[username.toLowerCase()] = password;
        localStorage.setItem('registered_users', JSON.stringify(existingUsers));

        setSuccess('Registration successful! Please sign in.');
        setLoading(true);
        setTimeout(() => {
            setIsRegisterMode(false);
            setPassword('');
            setConfirmPassword('');
            setLoading(false);
            setSuccess('');
        }, 1200);
    };

    const handleSignIn = (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!username.trim() || !password.trim()) {
            setError('Please enter both username and password.');
            return;
        }

        // Check credentials
        const existingUsers = JSON.parse(localStorage.getItem('registered_users') || '{}');
        const storedPassword = existingUsers[username.toLowerCase()];

        if (!storedPassword) {
            setError('Account not found. Please register first.');
            return;
        }

        if (storedPassword !== password) {
            setError('Incorrect password. Please try again.');
            return;
        }

        // Login successful
        setLoading(true);
        setTimeout(() => {
            localStorage.setItem('current_user', username);
            onLogin();
            navigate('/analyze');
        }, 800);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f1328] via-[#1a1f3d] to-[#252b5c] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-violet-500 rounded-2xl shadow-2xl shadow-indigo-500/30 flex items-center justify-center">
                        <Shield size={32} className="text-white" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
                    LawLens
                </h2>
                <p className="mt-2 text-center text-sm text-indigo-300">
                    {isRegisterMode ? 'Create your account to get started' : 'Sign in to access your dashboard'}
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                {/* Mode Tabs */}
                <div className="flex mb-4 bg-white/[0.05] rounded-xl p-1 sm:mx-0 mx-4">
                    <button
                        onClick={() => { setIsRegisterMode(true); setError(''); setSuccess(''); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${isRegisterMode
                            ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25'
                            : 'text-indigo-300 hover:text-white'
                            }`}
                    >
                        <UserPlus size={16} />
                        Register
                    </button>
                    <button
                        onClick={() => { setIsRegisterMode(false); setError(''); setSuccess(''); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${!isRegisterMode
                            ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25'
                            : 'text-indigo-300 hover:text-white'
                            }`}
                    >
                        <LogIn size={16} />
                        Sign in
                    </button>
                </div>

                {/* Form Card */}
                <div className="bg-white/[0.08] backdrop-blur-xl py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/10 mx-4 sm:mx-0">
                    <form className="space-y-5" onSubmit={isRegisterMode ? handleRegister : handleSignIn}>
                        <div>
                            <label className="block text-sm font-medium text-indigo-200">Username</label>
                            <div className="mt-1.5">
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 bg-white/[0.07] border border-white/10 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                                    placeholder="Enter your username"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-indigo-200">Password</label>
                            <div className="mt-1.5">
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 bg-white/[0.07] border border-white/10 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {/* Confirm Password - only in Register mode */}
                        {isRegisterMode && (
                            <div>
                                <label className="block text-sm font-medium text-indigo-200">Confirm Password</label>
                                <div className="mt-1.5">
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="appearance-none block w-full px-4 py-3 bg-white/[0.07] border border-white/10 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                                <Shield className="w-4 h-4 shrink-0" />
                                {success}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white transition-all ${loading
                                ? 'bg-indigo-400/50 cursor-wait'
                                : 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.99]'
                                }`}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    {isRegisterMode ? 'Registering...' : 'Signing in...'}
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    {isRegisterMode ? <><UserPlus size={16} /> Create Account</> : <><LogIn size={16} /> Sign in</>}
                                </span>
                            )}
                        </button>
                    </form>

                    {/* Toggle Link */}
                    <p className="mt-6 text-center text-sm text-indigo-300/70">
                        {isRegisterMode ? (
                            <>Already have an account?{' '}
                                <button onClick={() => { setIsRegisterMode(false); setError(''); setSuccess(''); }} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                                    Sign in
                                </button>
                            </>
                        ) : (
                            <>Don't have an account?{' '}
                                <button onClick={() => { setIsRegisterMode(true); setError(''); setSuccess(''); }} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                                    Register
                                </button>
                            </>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
