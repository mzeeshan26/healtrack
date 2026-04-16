import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Activity } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const role = await login(email, password);
      toast.success('Login successful!');
      if (role === 'doctor') {
        navigate('/dashboard');
      } else {
        const patientId = localStorage.getItem('patientId');
        navigate(`/patient/${patientId}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-r from-primary to-secondary p-3 rounded-full text-white mb-4">
            <Activity size={32} />
          </div>
          <h1 className="text-2xl font-bold text-textPrimary">HealTrack</h1>
          <p className="text-textSecondary text-sm mt-1">Intelligent IoT Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-textPrimary mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all bg-white/50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@healtrack.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textPrimary mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all bg-white/50"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-secondary text-white py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity flex justify-center items-center"
          >
            {loading ? <span className="animate-pulse">Signing in...</span> : 'Sign in'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-xs text-textSecondary">
          <p>Superadmin Credentials: <br/> doctor@healtrack.com / doctor123!</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
