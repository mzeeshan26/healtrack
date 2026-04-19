import { useContext } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { LogOut, LayoutDashboard, Users, Sun, Moon, Bell, Settings, FileText, Coffee, PhoneCall, ArrowLeft } from 'lucide-react';
import Chatbot from './Chatbot';
import clsx from 'clsx';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-950 relative transition-colors duration-500">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 dark:bg-primary/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-secondary/30 dark:bg-secondary/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-tertiary/20 dark:bg-tertiary/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Sidebar */}
      <aside className="w-72 glass-card border-l-0 border-y-0 rounded-none shadow-xl flex flex-col z-10 transition-all border-r border-slate-200/60 dark:border-white/10">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100 dark:border-white/10">
          <img src="/healtrack-logo.png" alt="HealTrack Logo" className="w-[60px] h-[80px] rounded-lg shadow-lg shadow-primary/30 dark:shadow-none bg-[#0F172A] object-contain p-0.5" />
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">HealTrack</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <div className="px-4 py-2 mt-2 mb-1">
             <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Main Menu</p>
          </div>

          {user?.role === 'doctor' && (
            <>
              <Link 
                to="/dashboard"
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                  location.pathname === '/dashboard' 
                    ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-indigo-300" 
                    : "text-textSecondary dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-textPrimary dark:hover:text-white"
                )}
              >
                <Users size={20} />
                Patient Management
              </Link>
              
              <div className="flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-textSecondary dark:text-slate-400 opacity-60 cursor-not-allowed group hover:bg-slate-50 dark:hover:bg-slate-800/30">
                 <div className="flex items-center gap-3"><Bell size={20} /> Alert History</div>
                 <span className="text-[9px] bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full font-bold group-hover:text-primary transition-colors">PRO</span>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-textSecondary dark:text-slate-400 opacity-60 cursor-not-allowed group hover:bg-slate-50 dark:hover:bg-slate-800/30">
                 <div className="flex items-center gap-3"><Settings size={20} /> System Settings</div>
                 <span className="text-[9px] bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full font-bold group-hover:text-primary transition-colors">PRO</span>
              </div>
            </>
          )}
          
          {user?.role === 'patient' && (
            <>
              <Link 
                to={`/patient/${user.patientId}`}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                  location.pathname.startsWith('/patient') 
                    ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-indigo-300" 
                    : "text-textSecondary dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-textPrimary dark:hover:text-white"
                )}
              >
                <LayoutDashboard size={20} />
                ICU Dashboard
              </Link>
              
              <div className="flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-textSecondary dark:text-slate-400 opacity-60 cursor-not-allowed group hover:bg-slate-50 dark:hover:bg-slate-800/30">
                 <div className="flex items-center gap-3"><FileText size={20} /> Medical Records</div>
                 <span className="text-[9px] bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full font-bold group-hover:text-primary transition-colors">PRO</span>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-textSecondary dark:text-slate-400 opacity-60 cursor-not-allowed group hover:bg-slate-50 dark:hover:bg-slate-800/30">
                 <div className="flex items-center gap-3"><Coffee size={20} /> Diet & Nutrition</div>
                 <span className="text-[9px] bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full font-bold group-hover:text-primary transition-colors">PRO</span>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-textSecondary dark:text-slate-400 opacity-60 cursor-not-allowed group hover:bg-slate-50 dark:hover:bg-slate-800/30">
                 <div className="flex items-center gap-3"><PhoneCall size={20} /> Emergency</div>
                 <span className="text-[9px] bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full font-bold group-hover:text-primary transition-colors">PRO</span>
              </div>
            </>
          )}
        </nav>

        {user?.role === 'doctor' && location.pathname.startsWith('/patient/') && (
          <div className="px-4 pb-3 shrink-0 border-b border-gray-100 dark:border-white/10">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-primary/25 bg-primary/5 text-primary dark:bg-indigo-500/15 dark:text-indigo-200 dark:border-indigo-400/30 hover:bg-primary/10 dark:hover:bg-indigo-500/25 transition-all font-bold text-sm shadow-sm"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
              All patients
            </button>
            <p className="text-[10px] text-center text-textSecondary dark:text-slate-500 mt-2 font-medium">
              Exit patient telemetry without signing out
            </p>
          </div>
        )}

        <div className="p-4 border-t border-gray-100 dark:border-white/10 flex flex-col gap-2">
          {/* User Profile Bar & Compact Theme Toggle */}
          <div className="flex items-center gap-3 px-4 py-3 bg-white/40 dark:bg-slate-800/40 rounded-xl border border-white/50 dark:border-white/5">
             <div className="w-9 h-9 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner">
                {user?.name?.charAt(0).toUpperCase()}
             </div>
             <div className="flex flex-col flex-1 overflow-hidden">
               <span className="text-sm font-semibold text-textPrimary dark:text-white truncate">{user?.name}</span>
               <span className="text-[10px] text-textSecondary dark:text-slate-400 uppercase tracking-wider font-bold">{user?.role}</span>
             </div>
             
             {/* Compact Toggle Icon */}
             <button 
               onClick={toggleTheme}
               className="p-2 rounded-lg bg-white/60 dark:bg-slate-700/50 text-gray-500 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:text-primary dark:hover:text-cyan-400 transition-all shadow-sm border border-transparent dark:border-white/5"
               title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
             >
               {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
             </button>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all font-bold text-sm"
          >
            <LogOut size={18} strokeWidth={2.5}/>
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
      <Chatbot />
    </div>
  );
};

export default Layout;
