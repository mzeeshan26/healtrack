import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { UserPlus, Trash2, HeartPulse, ActivitySquare } from 'lucide-react';

const DoctorDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const navigate = useNavigate();
  
  // Add Patient Form State
  const [formData, setFormData] = useState({
    name: '', age: '', gender: 'Male', condition: '', email: '', password: '', mqttTopic: ''
  });

  const fetchPatients = async () => {
    try {
      const res = await api.get('/patients');
      setPatients(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleAddPatient = async (e) => {
    e.preventDefault();
    try {
      await api.post('/patients', formData);
      toast.success('Patient added successfully');
      setShowAddModal(false);
      fetchPatients();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add patient');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this patient?')) {
      try {
        await api.delete(`/patients/${id}`);
        toast.success('Patient removed');
        fetchPatients();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to remove patient');
      }
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-tertiary">Patient Management</h1>
           <p className="text-textSecondary dark:text-slate-400 mt-2 font-medium">Overview of all assigned patients and their telemetry statuses.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-primary to-secondary text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-primary/30 dark:shadow-none hover:shadow-primary/50 transition-all flex items-center gap-2"
        >
          <UserPlus size={20} /> Add Patient
        </button>
      </div>

      {patients.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center p-16 text-center animate-float">
           <ActivitySquare size={56} className="text-primary/40 dark:text-primary/60 mb-6 drop-shadow-md" />
           <h3 className="text-xl font-bold text-textPrimary dark:text-white">No patients found</h3>
           <p className="text-textSecondary dark:text-slate-400 mt-2 max-w-md">Add a new patient to start monitoring their remote vitals with our intelligent telemetry system.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {patients.map(p => (
            <div key={p._id} className="glass-card glass-interactive p-6 flex flex-col group cursor-default">
              <div className="flex justify-between items-start mb-5">
                 <div>
                   <h3 className="font-bold text-xl text-textPrimary dark:text-white group-hover:text-primary transition-colors">{p.name}</h3>
                   <span className="text-xs font-bold px-3 py-1.5 bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 text-primary dark:text-indigo-300 rounded-lg mt-2 inline-block shadow-inner border border-primary/10 dark:border-primary/30">
                     {p.age} y/o • {p.gender}
                   </span>
                 </div>
                 <div className="relative flex h-4 w-4">
                   {p.isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-40"></span>}
                   <span className={`relative inline-flex rounded-full h-4 w-4 ${p.isActive ? 'bg-success shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'bg-gray-400 dark:bg-slate-600'}`}></span>
                 </div>
              </div>
              
              <div className="space-y-3 mb-8 flex-1">
                 <p className="text-sm border-l-2 border-primary/50 pl-3 py-1 bg-primary/5 dark:bg-primary/10 rounded-r mix-blend-multiply dark:mix-blend-screen text-textSecondary dark:text-slate-300"><span className="font-semibold text-primary dark:text-indigo-400">Condition:</span> {p.condition}</p>
                 <p className="text-sm border-l-2 border-secondary/50 dark:border-secondary/70 pl-3 py-1 bg-secondary/5 dark:bg-secondary/10 rounded-r mix-blend-multiply dark:mix-blend-screen text-textSecondary dark:text-slate-300 overflow-hidden text-ellipsis whitespace-nowrap"><span className="font-semibold text-secondary dark:text-cyan-400">MQTT:</span> {p.mqttTopic}</p>
              </div>

              <div className="flex gap-3 border-t border-gray-100/50 dark:border-slate-200/50/10 mt-auto pt-5">
                <button 
                  onClick={() => navigate(`/patient/${p._id}`)}
                  className="flex-1 bg-gradient-to-r from-primary to-primary text-white py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 dark:shadow-none hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group-hover:from-primary group-hover:to-secondary"
                >
                  <HeartPulse size={18} className="animate-pulse" /> View Telemetry
                </button>
                <button 
                  onClick={() => handleDelete(p._id)}
                  className="p-2.5 bg-slate-50 dark:bg-slate-800 text-gray-400 dark:text-slate-400 border border-gray-200 dark:border-slate-200/50/10 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-200 dark:hover:border-red-500/30 rounded-xl transition-all shadow-sm"
                  title="Remove Patient"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="glass-card bg-slate-50/90 dark:bg-slate-900/90 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto border border-slate-200/50/50 dark:border-slate-200/50/10 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-textPrimary dark:text-white">Add New Patient</h2>
            <form onSubmit={handleAddPatient} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Name</label>
                  <input required className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50" onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Age</label>
                  <input required type="number" className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50" onChange={e => setFormData({...formData, age: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Gender</label>
                  <select className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50" onChange={e => setFormData({...formData, gender: e.target.value})}>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Condition</label>
                  <input required className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50" onChange={e => setFormData({...formData, condition: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-slate-300">Email <span className="text-xs text-gray-400 dark:text-slate-500">(for patient login)</span></label>
                <input required type="email" className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50" onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-slate-300">Password</label>
                <input required type="password" className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50" onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-slate-300">MQTT Topic <span className="text-xs text-gray-400 dark:text-slate-500">(e.g., healtrack/patient/001)</span></label>
                <input required placeholder="healtrack/patient/mock_esp8266_001" className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50" onChange={e => setFormData({...formData, mqttTopic: e.target.value})} />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-200/50/10 mt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg shadow-lg hover:shadow-xl transition-all">Add Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
