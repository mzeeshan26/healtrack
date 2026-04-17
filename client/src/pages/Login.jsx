import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Activity, HeartPulse, ShieldCheck, Thermometer, Radio, ArrowRight, Lock } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Simple floating EKG line generation
  const generateEkgLine = () => {
    return (
      <svg viewBox="0 0 1000 200" className="w-[150%] absolute bottom-10 left-[-20%] opacity-20 pointer-events-none drop-shadow-[0_0_15px_rgba(16,185,129,1)]">
        <path 
           d="M 0 100 L 200 100 L 230 40 L 280 160 L 320 10 L 360 140 L 390 100 L 600 100 L 630 40 L 680 160 L 720 10 L 760 140 L 790 100 L 1000 100" 
           fill="none" 
           stroke="currentColor" 
           strokeWidth="6" 
           strokeLinecap="round" 
           strokeLinejoin="round" 
           className="text-emerald-400"
        />
      </svg>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const role = await login(email, password);
      toast.success('Authentication successful');
      if (role === 'doctor') {
        navigate('/dashboard');
      } else {
        const patientId = localStorage.getItem('patientId');
        navigate(`/patient/${patientId}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-950 overflow-hidden relative transition-colors duration-500">
      
      {/* Absolute Background Orbs & Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] xl:top-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] opacity-70 animate-blob"></div>
        <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] bg-cyan-400/20 dark:bg-cyan-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] opacity-70 animate-blob" style={{ animationDelay: '3s' }}></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[700px] h-[700px] bg-indigo-500/20 dark:bg-indigo-600/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-70 animate-blob" style={{ animationDelay: '5s' }}></div>
        
        {/* Floating Medical Icons */}
        <div className="absolute top-1/4 left-[15%] text-emerald-500/10 dark:text-emerald-400/5 animate-float delay-100"><HeartPulse size={120} /></div>
        <div className="absolute bottom-1/3 right-[20%] text-cyan-500/10 dark:text-cyan-400/5 animate-float" style={{ animationDelay: '2s' }}><Thermometer size={100} /></div>
        <div className="absolute top-1/2 left-[40%] text-indigo-500/10 dark:text-indigo-400/5 animate-float" style={{ animationDelay: '1.5s' }}><Radio size={150} /></div>
      </div>

      <div className="max-w-7xl w-full mx-auto flex flex-col lg:flex-row z-10 relative">
        
        {/* Left Side: Branding & Aesthetics */}
        <div className="hidden lg:flex flex-col justify-center w-1/2 p-16 animate-in slide-in-from-left-12 duration-1000 relative">
           <div className="flex items-center gap-4 mb-8">
              <div className="bg-gradient-to-br from-emerald-400 to-cyan-500 p-3.5 rounded-2xl text-white shadow-[0_0_40px_rgba(16,185,129,0.5)]">
                 <Activity size={36} strokeWidth={2.5}/>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-cyan-600 dark:from-emerald-400 dark:to-cyan-400">
                 HealTrack
              </h1>
           </div>
           
           <h2 className="text-5xl font-black text-slate-800 dark:text-white leading-[1.1] tracking-tight mb-6">
              Next-Gen <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">ICU Telemetry</span>
           </h2>
           
           <p className="text-lg text-slate-500 dark:text-slate-400 font-medium mb-10 max-w-md leading-relaxed">
              Secure, real-time vital sign monitoring and predictive environmental analysis powered by continuous AI algorithms.
           </p>

           <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-semibold bg-white/40 dark:bg-slate-800/40 p-3 rounded-lg backdrop-blur-sm w-max border border-white/40 dark:border-white/5 shadow-sm">
                 <ShieldCheck className="text-emerald-500" size={20}/> End-to-End Encrypted Data
              </div>
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-semibold bg-white/40 dark:bg-slate-800/40 p-3 rounded-lg backdrop-blur-sm w-max border border-white/40 dark:border-white/5 shadow-sm">
                 <Activity className="text-cyan-500" size={20}/> Sub-Millisecond IoT Latency
              </div>
           </div>

           {generateEkgLine()}
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 animate-in slide-in-from-right-12 duration-1000">
           <div className="w-full max-w-md relative group">
              {/* Pulsing Form Shadow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-[2rem] blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
              
              <div className="glass-card bg-slate-50/70 p-10 lg:p-12 border border-slate-200/60 dark:border-white/10 shadow-2xl relative rounded-[2rem]">
                 
                 {/* Mobile Logo Fallback */}
                 <div className="flex lg:hidden flex-col items-center mb-8">
                   <div className="bg-gradient-to-br from-emerald-400 to-cyan-500 p-3 rounded-xl text-white mb-4 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                     <Activity size={28} />
                   </div>
                   <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white">HealTrack</h1>
                   <p className="text-emerald-500 font-bold text-xs uppercase tracking-widest mt-1">Authentication</p>
                 </div>

                 <div className="hidden lg:block mb-10">
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                       <Lock className="text-slate-400" size={24}/> Secure Login
                    </h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">Enter your designated credentials to access the central nervous system.</p>
                 </div>

                 <form onSubmit={handleSubmit} className="space-y-6">
                   <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                     <input
                       type="email"
                       required
                       className="w-full px-5 py-4 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-white transition-all shadow-inner font-semibold placeholder:text-slate-400 dark:placeholder:text-slate-600"
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       placeholder="personnel@healtrack.com"
                     />
                   </div>
                   
                   <div className="space-y-1">
                     <div className="flex justify-between items-center ml-1">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Passcode</label>
                        <a href="#" className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline">Forgot?</a>
                     </div>
                     <input
                       type="password"
                       required
                       className="w-full px-5 py-4 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-white transition-all shadow-inner font-semibold tracking-wider placeholder:text-slate-300 dark:placeholder:text-slate-700"
                       value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       placeholder="••••••••"
                     />
                   </div>
                   
                   <button
                     type="submit"
                     disabled={loading}
                     className="w-full mt-8 bg-gradient-to-r from-emerald-500 to-cyan-500 dark:from-emerald-600 dark:to-cyan-600 text-white py-4 rounded-xl font-bold text-sm hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:-translate-y-1 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                   >
                     {loading ? (
                         <span className="flex items-center gap-2">
                             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                             Authenticating...
                         </span>
                     ) : (
                         <>Access Platform <ArrowRight size={18} strokeWidth={2.5}/></>
                     )}
                   </button>
                 </form>
                 
                 <div className="mt-8 text-center bg-emerald-50/50 dark:bg-slate-800/50 p-4 rounded-xl border border-emerald-100 dark:border-white/5">
                   <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-1.5">Demo Credentials</p>
                   <p className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      doctor@healtrack.com <br/> doctor123!
                   </p>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
