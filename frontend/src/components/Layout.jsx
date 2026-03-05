import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FileText, Settings, Search, Bell, LogOut, MessageCircle, Shield } from 'lucide-react';

const Layout = ({ onLogout }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        onLogout();
        navigate('/login');
    };

    const navLinkClass = ({ isActive }) =>
        `flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${isActive
            ? 'bg-white/10 text-white shadow-sm backdrop-blur-sm border border-white/10'
            : 'text-indigo-200 hover:bg-white/5 hover:text-white'
        }`;

    return (
        <div className="flex h-screen bg-[#f0f2f5] font-sans">
            {/* Sidebar — Deep navy gradient */}
            <div className="w-20 lg:w-64 bg-gradient-to-b from-[#1a1f3d] to-[#0f1328] text-white flex flex-col items-center lg:items-start transition-all duration-300">
                <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 w-full border-b border-white/10">
                    <div className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-violet-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <span className="hidden lg:block ml-3 font-bold text-lg tracking-tight whitespace-nowrap">
                        LawLens
                    </span>
                </div>

                <nav className="flex-1 w-full mt-6 space-y-1.5 px-2 lg:px-3">
                    <NavLink to="/analyze" className={navLinkClass} title="Analyze Contracts">
                        <FileText size={20} className="shrink-0" />
                        <span className="hidden lg:block ml-4 font-medium text-sm">Analyze Contracts</span>
                    </NavLink>

                    <NavLink to="/chatbot" className={navLinkClass} title="Legal Chatbot">
                        <MessageCircle size={20} className="shrink-0" />
                        <span className="hidden lg:block ml-4 font-medium text-sm">Legal Chatbot</span>
                    </NavLink>

                    <NavLink to="/settings" className={navLinkClass} title="Settings">
                        <Settings size={20} className="shrink-0" />
                        <span className="hidden lg:block ml-4 font-medium text-sm">Settings</span>
                    </NavLink>
                </nav>

                <div className="w-full p-3 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center lg:justify-start w-full px-4 py-2.5 text-indigo-300 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
                        title="Logout"
                    >
                        <LogOut size={20} className="shrink-0" />
                        <span className="hidden lg:block ml-4 font-medium text-sm">Logout</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header */}
                <header className="h-14 bg-white border-b border-gray-200/80 flex items-center justify-between px-6 shrink-0 shadow-sm">
                    <div className="flex items-center">
                        <h2 className="text-sm font-semibold text-gray-800 tracking-wide">LawLens</h2>
                    </div>

                    <div className="flex items-center space-x-4 text-gray-400">
                        <button className="p-2 hover:bg-gray-100 rounded-lg hover:text-gray-600 transition-all">
                            <Search size={18} />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg hover:text-gray-600 transition-all relative">
                            <Bell size={18} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
                        </button>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                            {(localStorage.getItem('current_user') || 'U').charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto bg-[#f0f2f5] p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
