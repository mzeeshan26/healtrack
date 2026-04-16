import React, { useContext } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Users, Activity } from 'lucide-react';
import clsx from 'clsx';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-indigo-50 relative">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-secondary/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-tertiary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Sidebar */}
      <aside className="w-64 glass-card border-l-0 border-y-0 rounded-none shadow-xl flex flex-col z-10 transition-all border-r border-white/40">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="bg-gradient-to-br from-primary to-secondary p-2 rounded-lg text-white shadow-lg shadow-primary/30">
            <Activity size={24} />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">HealTrack</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {user?.role === 'doctor' && (
            <Link 
              to="/dashboard"
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                location.pathname === '/dashboard' 
                  ? "bg-primary/10 text-primary" 
                  : "text-textSecondary hover:bg-gray-50 hover:text-textPrimary"
              )}
            >
              <Users size={20} />
              Patient Management
            </Link>
          )}
          
          {user?.role === 'patient' && (
            <Link 
              to={`/patient/${user.patientId}`}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                location.pathname.startsWith('/patient') 
                  ? "bg-primary/10 text-primary" 
                  : "text-textSecondary hover:bg-gray-50 hover:text-textPrimary"
              )}
            >
              <LayoutDashboard size={20} />
              ICU Dashboard
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase()}
             </div>
             <div className="flex flex-col">
               <span className="text-sm font-semibold text-textPrimary">{user?.name}</span>
               <span className="text-xs text-textSecondary capitalize">{user?.role}</span>
             </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto w-full relative z-10 custom-scrollbar">
        <div className="p-8 pb-24 max-w-7xl mx-auto animate-in fade-in duration-500">
           <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
