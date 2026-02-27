import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, Search, Bell, LogOut } from 'lucide-react';

const Layout = ({ onLogout }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        onLogout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            {/* Sidebar */}
            <div className="w-20 lg:w-64 bg-slate-800 text-white flex flex-col items-center lg:items-start transition-all duration-300">
                <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 w-full border-b border-slate-700">
                    <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-lg">
                        AC
                    </div>
                    <span className="hidden lg:block ml-3 font-semibold text-lg tracking-wide whitespace-nowrap">
                        Analyzer Console
                    </span>
                </div>

                <nav className="flex-1 w-full mt-6 space-y-2 px-2 lg:px-4">
                    <NavLink
                        to="/"
                        end
                        className={({ isActive }) =>
                            `flex items-center px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`
                        }
                        title="Dashboard"
                    >
                        <LayoutDashboard size={22} className="shrink-0" />
                        <span className="hidden lg:block ml-4 font-medium">Dashboard</span>
                    </NavLink>

                    <NavLink
                        to="/analyze"
                        className={({ isActive }) =>
                            `flex items-center px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`
                        }
                        title="Analyze Contracts"
                    >
                        <FileText size={22} className="shrink-0" />
                        <span className="hidden lg:block ml-4 font-medium">Analyze Contracts</span>
                    </NavLink>

                    <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                            `flex items-center px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`
                        }
                        title="Settings"
                    >
                        <Settings size={22} className="shrink-0" />
                        <span className="hidden lg:block ml-4 font-medium">Settings</span>
                    </NavLink>
                </nav>

                <div className="w-full p-4 border-t border-slate-700">
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center lg:justify-start w-full px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title="Logout"
                    >
                        <LogOut size={22} className="shrink-0" />
                        <span className="hidden lg:block ml-4 font-medium">Logout</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center space-x-6">
                        {/* Tab-like styling matching the mockup header */}
                        <div className="hidden sm:flex space-x-6 text-sm font-medium text-gray-500">
                            <span className="text-gray-900 border-b-2 border-slate-800 pb-[19px] pt-5">
                                Dashboard
                            </span>
                            <span className="hover:text-gray-900 cursor-pointer pt-5">
                                Analyze Contracts
                            </span>
                            <span className="hover:text-gray-900 cursor-pointer pt-5">
                                Settings
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-6 text-gray-400">
                        <button className="hover:text-gray-600 transition-colors">
                            <Search size={20} />
                        </button>
                        <button className="hover:text-gray-600 transition-colors relative">
                            <Bell size={20} />
                            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>
                        <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                            {/* Generic Avatar placeholder matching mockup */}
                            <svg className="w-5 h-5 text-slate-400 mt-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
