import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Heart, Activity, Thermometer, Radio, Download, AlertTriangle, Settings, Droplets, ThermometerSun } from 'lucide-react';

const SOCKET_URL = 'http://localhost:5000';

const PatientDashboard = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  
  const [patient, setPatient] = useState(null);
  const [thresholds, setThresholds] = useState(null);
  const [currentVitals, setCurrentVitals] = useState(null);
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [tData, setTData] = useState(null);

  useEffect(() => {
    fetchPatientData();
    
    const socket = io(SOCKET_URL);
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    
    socket.on(`vitalsUpdate_${id}`, (data) => {
      setCurrentVitals(data);
      setHistory(prev => {
        const newHist = [data, ...prev].slice(0, 100);
        return newHist;
      });
    });

    socket.on(`vitalsAlert_${id}`, ({ alerts }) => {
      alerts.forEach(alertStr => {
        if (alertStr.includes('CRITICAL')) {
          toast.error(alertStr, { duration: 6000, icon: <AlertTriangle className="text-white" /> });
        } else {
          toast(alertStr, { duration: 6000, icon: '⚠️', style: { border: '1px solid #D97706', color: '#D97706' }});
        }
      });
    });

    return () => socket.disconnect();
  }, [id]);

  const fetchPatientData = async () => {
    try {
      const [pRes, tRes, hRes] = await Promise.all([
        api.get(`/patients/${id}`),
        api.get(`/thresholds/${id}`),
        api.get(`/vitals/${id}/history`)
      ]);
      setPatient(pRes.data);
      
      const t = tRes.data;
      if (!t.roomTemperature) t.roomTemperature = { min: 18, max: 30 };
      if (!t.humidity) t.humidity = { min: 30, max: 65 };
      
      setThresholds(t);
      setTData(t);
      setHistory(hRes.data);
      if (hRes.data.length > 0) {
        setCurrentVitals(hRes.data[0]);
      }
    } catch (err) {
      toast.error('Failed to load dashboard data');
    }
  };

  const updateThresholds = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/thresholds/${id}`, tData);
      setThresholds(tData);
      setShowThresholdModal(false);
      toast.success('Thresholds updated successfully');
    } catch (err) {
      toast.error('Failed to update thresholds');
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Patient Vitals Report - ${patient.name}`, 14, 15);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
    
    let y = 35;
    doc.setFontSize(10);
    doc.text("Time | HR | SpO2 | Temp | Ambient | Humid | ECG", 14, y);
    y += 10;
    
    history.slice(0, 30).forEach(h => {
      const line = `${new Date(h.timestamp).toLocaleTimeString()} | ${h.heartRate} | ${h.spo2}% | ${h.temperature}° | ${h.roomTemperature || 22}° | ${h.humidity || 45}% | ${h.ecgStatus}`;
      doc.text(line, 14, y);
      y += 8;
      if (y > 280) { doc.addPage(); y = 20; }
    });
    doc.save(`${patient.name}_Vitals.pdf`);
  };

  const exportCSV = () => {
    let csv = "Timestamp,Heart Rate,SpO2,Body Temperature,Room Temperature,Humidity,ECG Status\n";
    history.forEach(h => {
      csv += `${new Date(h.timestamp).toISOString()},${h.heartRate},${h.spo2},${h.temperature},${h.roomTemperature || 22},${h.humidity || 45},${h.ecgStatus}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${patient.name}_Vitals.csv`;
    a.click();
  };

  if (!patient || !thresholds) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  const getStatusColor = (val, min, max) => {
    if (val < min) return 'border-red-500 text-red-600 bg-red-50/80 shadow-[0_4px_20px_rgba(239,68,68,0.2)] dark:bg-red-500/10 dark:text-red-400';
    if (val > max) return 'border-amber-500 text-amber-600 bg-amber-50/80 shadow-[0_4px_20px_rgba(245,158,11,0.2)] dark:bg-amber-500/10 dark:text-amber-400';
    return 'border-success text-success bg-emerald-50/80 shadow-[0_4px_20px_rgba(16,185,129,0.15)] dark:bg-emerald-500/10 dark:text-emerald-400'; 
  };
  
  const hrStatus = currentVitals ? getStatusColor(currentVitals.heartRate, thresholds.heartRate.min, thresholds.heartRate.max) : 'border-gray-200 text-gray-400 bg-slate-50/50 dark:bg-slate-800/50 dark:border-white/10';
  const spo2Status = currentVitals ? getStatusColor(currentVitals.spo2, thresholds.spo2.min, thresholds.spo2.max) : 'border-gray-200 text-gray-400 bg-slate-50/50 dark:bg-slate-800/50 dark:border-white/10';
  const tempStatus = currentVitals ? getStatusColor(currentVitals.temperature, thresholds.temperature.min, thresholds.temperature.max) : 'border-gray-200 text-gray-400 bg-slate-50/50 dark:bg-slate-800/50 dark:border-white/10';
  const roomTempStatus = currentVitals ? getStatusColor(currentVitals.roomTemperature || 22, thresholds.roomTemperature.min, thresholds.roomTemperature.max) : 'border-gray-200 text-gray-400 bg-slate-50/50 dark:bg-slate-800/50 dark:border-white/10';
  const humidityStatus = currentVitals ? getStatusColor(currentVitals.humidity || 45, thresholds.humidity.min, thresholds.humidity.max) : 'border-gray-200 text-gray-400 bg-slate-50/50 dark:bg-slate-800/50 dark:border-white/10';

  const chartData = [...history].reverse().slice(-50);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md border border-gray-100 dark:border-white/10 shadow-xl p-4 rounded-xl">
          <p className="text-gray-500 dark:text-slate-400 text-xs mb-1 font-medium">{format(new Date(label), 'HH:mm:ss')}</p>
          <p className="text-primary dark:text-indigo-400 font-bold text-lg">{`${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Patient Header Bar */}
      <div className="glass-card p-5 flex flex-wrap items-center justify-between sticky top-4 z-20 transition-all border border-white/60 dark:border-white/10">
        <div className="flex items-center gap-4">
           <div className="flex flex-col">
             <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary dark:from-indigo-400 dark:to-cyan-400">{patient.name}</h2>
             <span className="text-sm text-textSecondary dark:text-slate-400 font-medium mt-1">
               <span className="px-2 py-0.5 bg-primary/10 dark:bg-primary/20 text-primary dark:text-indigo-300 rounded-md mr-2">{patient.age} y/o</span>
               • {patient.gender} • <span className="text-gray-600 dark:text-slate-300 font-semibold">{patient.condition}</span>
             </span>
           </div>
        </div>
        <div className="flex items-center gap-4 mt-4 sm:mt-0">
           {user?.role === 'doctor' && (
             <button onClick={() => setShowThresholdModal(true)} className="px-5 py-2 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-md text-sm font-semibold transition-all shadow-sm dark:text-white">
               Set Limits
             </button>
           )}
           <div className={`px-4 py-2 rounded-xl text-sm font-bold border flex items-center gap-3 shadow-inner transition-colors ${connected ? 'border-success/30 text-success bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10' : 'border-red-500/30 text-red-500 bg-red-50 dark:bg-red-500/10'}`}>
             <span className="relative flex h-3 w-3">
               {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>}
               <span className={`relative inline-flex rounded-full h-3 w-3 ${connected ? 'bg-success' : 'bg-red-500'}`}></span>
             </span>
             {connected ? 'LIVE TELEMETRY' : 'OFFLINE'}
           </div>
        </div>
      </div>

      {/* Vitals Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6">
        <div className={`col-span-1 sm:col-span-1 lg:col-span-3 glass-card glass-interactive p-6 border-l-[6px] transition-all ${hrStatus}`}>
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-sm tracking-widest uppercase opacity-80">Heart Rate</span>
            <div className={`p-2 rounded-lg bg-slate-50/50 dark:bg-white/10 backdrop-blur-sm ${currentVitals && currentVitals.heartRate > 0 ? "animate-heartbeat" : ""}`}>
               <Heart className={currentVitals && currentVitals.heartRate > 0 ? "text-red-500" : "text-gray-400"} fill={currentVitals && currentVitals.heartRate > 0 ? "currentColor" : "none"}/>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-black tracking-tight">{currentVitals ? currentVitals.heartRate : '--'}</span>
            <span className="text-xl font-bold opacity-80">BPM</span>
          </div>
          <div className="mt-4 text-xs font-semibold opacity-70 bg-slate-50/40 dark:bg-black/20 inline-flex px-2 py-1 rounded-md">Range: {thresholds.heartRate.min} - {thresholds.heartRate.max}</div>
        </div>
        
        <div className={`col-span-1 sm:col-span-1 lg:col-span-3 glass-card glass-interactive p-6 border-l-[6px] transition-all ${spo2Status}`}>
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-sm tracking-widest uppercase opacity-80">SpO2 Level</span>
            <div className="p-2 rounded-lg bg-slate-50/50 dark:bg-white/10 backdrop-blur-sm">
               <Activity className="text-blue-500 dark:text-cyan-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-black tracking-tight">{currentVitals ? currentVitals.spo2 : '--'}</span>
            <span className="text-xl font-bold opacity-80">%</span>
          </div>
          <div className="mt-4 text-xs font-semibold opacity-70 bg-slate-50/40 dark:bg-black/20 inline-flex px-2 py-1 rounded-md">Min: {thresholds.spo2.min}%</div>
        </div>

        <div className={`col-span-1 sm:col-span-1 lg:col-span-3 glass-card glass-interactive p-6 border-l-[6px] transition-all ${tempStatus}`}>
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-sm tracking-widest uppercase opacity-80">Body Temp</span>
            <div className="p-2 rounded-lg bg-slate-50/50 dark:bg-white/10 backdrop-blur-sm">
               <Thermometer className="text-amber-500" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-black tracking-tight">{currentVitals ? currentVitals.temperature : '--'}</span>
            <span className="text-xl font-bold opacity-80">°C</span>
          </div>
          <div className="mt-4 text-xs font-semibold opacity-70 bg-slate-50/40 dark:bg-black/20 inline-flex px-2 py-1 rounded-md">Range: {thresholds.temperature.min} - {thresholds.temperature.max}</div>
        </div>
        
        <div className={`col-span-1 sm:col-span-1 lg:col-span-3 glass-card glass-interactive p-6 border-l-[6px] transition-all ${currentVitals?.ecgStatus === 'abnormal' ? 'bg-red-50 border-red-500 text-red-600 shadow-[0_4px_20px_rgba(239,68,68,0.3)] dark:bg-red-900/20' : 'bg-indigo-50 border-primary text-primary shadow-[0_4px_20px_rgba(79,70,229,0.2)] dark:bg-indigo-900/20 dark:text-indigo-300'}`}>
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-sm tracking-widest uppercase opacity-80">ECG Status</span>
            <div className="p-2 rounded-lg bg-slate-50/50 dark:bg-white/10 backdrop-blur-sm animate-pulse-fast">
               <Radio />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-black uppercase tracking-tight">{currentVitals ? currentVitals.ecgStatus : '--'}</span>
          </div>
          {currentVitals && currentVitals.ecgRaw && (
             <div className="mt-5 h-8 w-full overflow-hidden opacity-60 relative flex items-center bg-slate-50/30 dark:bg-black/20 rounded px-2">
                 <div className="absolute right-2 text-xs font-bold font-mono">f: {currentVitals.ecgRaw}Hz</div>
             </div>
          )}
        </div>

        {/* Smaller Ambient Row */}
        <div className={`col-span-1 lg:col-span-2 lg:col-start-5 glass-card glass-interactive p-4 border-l-4 transition-all ${roomTempStatus}`}>
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-xs tracking-widest uppercase opacity-80">Ambient Temp</span>
            <div className="p-1.5 rounded-lg bg-slate-50/50 dark:bg-white/10 backdrop-blur-sm">
               <ThermometerSun className="text-orange-500" size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black tracking-tight">{currentVitals ? currentVitals.roomTemperature || '--' : '--'}</span>
            <span className="text-lg font-bold opacity-80">°C</span>
          </div>
          <div className="mt-3 text-[10px] uppercase font-bold opacity-70 bg-slate-50/40 dark:bg-black/20 inline-flex px-2 py-0.5 rounded-md">Range: {thresholds.roomTemperature.min} - {thresholds.roomTemperature.max}</div>
        </div>

        <div className={`col-span-1 lg:col-span-2 glass-card glass-interactive p-4 border-l-4 transition-all ${humidityStatus}`}>
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-xs tracking-widest uppercase opacity-80">Room Humidity</span>
            <div className="p-1.5 rounded-lg bg-slate-50/50 dark:bg-white/10 backdrop-blur-sm">
               <Droplets className="text-cyan-500" size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black tracking-tight">{currentVitals ? currentVitals.humidity || '--' : '--'}</span>
            <span className="text-lg font-bold opacity-80">%</span>
          </div>
          <div className="mt-3 text-[10px] uppercase font-bold opacity-70 bg-slate-50/40 dark:bg-black/20 inline-flex px-2 py-0.5 rounded-md">Range: {thresholds.humidity.min} - {thresholds.humidity.max}</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-6 shadow-xl shadow-primary/5 dark:shadow-none border border-white/60 dark:border-white/10 relative overflow-visible">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl"></div>
          <h3 className="font-extrabold text-xl mb-6 text-textPrimary dark:text-white flex items-center gap-2"><Heart className="text-primary dark:text-indigo-400" size={20}/> Heart Rate Matrix</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.2} />
                <XAxis dataKey="timestamp" tickFormatter={(time) => format(new Date(time), 'HH:mm:ss')} stroke="#94A3B8" fontSize={11} tickMargin={10} axisLine={false} />
                <YAxis domain={['auto', 'auto']} stroke="#94A3B8" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={thresholds.heartRate.min} stroke="#EF4444" strokeDasharray="4 4" opacity={0.5} />
                <ReferenceLine y={thresholds.heartRate.max} stroke="#EF4444" strokeDasharray="4 4" opacity={0.5} />
                <Area type="monotone" dataKey="heartRate" stroke="#4F46E5" strokeWidth={4} fillOpacity={1} fill="url(#colorHr)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 shadow-xl shadow-secondary/5 dark:shadow-none border border-white/60 dark:border-white/10 relative overflow-visible">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-secondary/10 rounded-full blur-2xl"></div>
          <h3 className="font-extrabold text-xl mb-6 text-textPrimary dark:text-white flex items-center gap-2"><Activity className="text-secondary dark:text-cyan-400" size={20}/> SpO2 Graph</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSpo2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.2} />
                <XAxis dataKey="timestamp" tickFormatter={(time) => format(new Date(time), 'HH:mm:ss')} stroke="#94A3B8" fontSize={11} tickMargin={10} axisLine={false} />
                <YAxis domain={[80, 100]} stroke="#94A3B8" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={thresholds.spo2.min} stroke="#EF4444" strokeDasharray="4 4" opacity={0.5} />
                <Area type="monotone" dataKey="spo2" stroke="#06B6D4" strokeWidth={4} fillOpacity={1} fill="url(#colorSpo2)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="glass-card rounded-2xl overflow-hidden flex flex-col border border-white/60 dark:border-white/10 shadow-xl">
          <div className="p-5 border-b border-white/50 dark:border-white/10 flex justify-between items-center bg-slate-50/40 dark:bg-slate-800/40 backdrop-blur-md">
             <h3 className="font-extrabold text-xl text-textPrimary dark:text-white">Recent Log History</h3>
             <div className="flex gap-3">
                 <button onClick={exportCSV} className="flex items-center gap-2 text-sm font-bold px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm dark:text-slate-200"><Download size={16}/> CSV</button>
                 <button onClick={exportPDF} className="flex items-center gap-2 text-sm font-bold px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-xl shadow-lg hover:shadow-xl hover:opacity-90 transition-all"><Download size={16}/> PDF Report</button>
             </div>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto custom-scrollbar bg-slate-50/20 dark:bg-transparent">
             <table className="w-full text-sm text-left">
                <thead className="text-xs font-bold uppercase bg-slate-50/60 dark:bg-slate-800/80 dark:text-slate-300 sticky top-0 backdrop-blur-md z-10">
                   <tr>
                      <th className="px-6 py-4 border-b border-gray-100 dark:border-white/5">Time</th>
                      <th className="px-6 py-4 border-b border-gray-100 dark:border-white/5">HR (BPM)</th>
                      <th className="px-6 py-4 border-b border-gray-100 dark:border-white/5">SpO2 (%)</th>
                      <th className="px-6 py-4 border-b border-gray-100 dark:border-white/5">Body Temp</th>
                      <th className="px-6 py-4 border-b border-gray-100 dark:border-white/5 text-orange-600 dark:text-orange-400">Ambient Temp</th>
                      <th className="px-6 py-4 border-b border-gray-100 dark:border-white/5 text-cyan-600 dark:text-cyan-400">Humidity</th>
                      <th className="px-6 py-4 border-b border-gray-100 dark:border-white/5">ECG Status</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/50 dark:divide-white/5">
                   {history.slice(0, 30).map((h, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/50 transition-colors">
                         <td className="px-6 py-4 font-semibold text-textSecondary dark:text-slate-400">{format(new Date(h.timestamp), 'MMM dd, HH:mm:ss')}</td>
                         <td className={`px-6 py-4 font-bold text-lg ${(h.heartRate < thresholds.heartRate.min || h.heartRate > thresholds.heartRate.max) ? 'text-red-500 dark:text-red-400' : 'text-primary dark:text-indigo-400'}`}>{h.heartRate}</td>
                         <td className={`px-6 py-4 font-bold text-lg ${h.spo2 < thresholds.spo2.min ? 'text-red-500 dark:text-red-400' : 'text-secondary dark:text-cyan-400'}`}>{h.spo2}</td>
                         <td className={`px-6 py-4 font-bold text-lg ${(h.temperature < thresholds.temperature.min || h.temperature > thresholds.temperature.max) ? 'text-amber-500' : 'text-textPrimary dark:text-slate-200'}`}>{h.temperature}°</td>
                         <td className={`px-6 py-4 font-bold text-lg ${(h.roomTemperature < thresholds.roomTemperature.min || h.roomTemperature > thresholds.roomTemperature.max) ? 'text-red-500 dark:text-red-400' : 'text-orange-500 dark:text-orange-400'}`}>{h.roomTemperature || 22}°</td>
                         <td className={`px-6 py-4 font-bold text-lg ${(h.humidity < thresholds.humidity.min || h.humidity > thresholds.humidity.max) ? 'text-blue-600 dark:text-blue-400' : 'text-cyan-500 dark:text-cyan-400'}`}>{h.humidity || 45}%</td>
                         <td className="px-6 py-4 font-semibold">
                            <span className={`px-2 py-1 rounded-md text-xs ${h.ecgStatus === 'abnormal' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>{h.ecgStatus}</span>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
             {history.length === 0 && <div className="p-12 text-center text-gray-500 dark:text-slate-500 font-medium">No initial telemetry vectors logged...</div>}
          </div>
      </div>

      {/* Threshold Editor Modal */}
      {showThresholdModal && user?.role === 'doctor' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="glass-card bg-slate-50/95 dark:bg-slate-900/95 w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200 border border-white dark:border-white/10">
            <h2 className="text-2xl font-extrabold mb-6 flex items-center gap-2 dark:text-white"><Settings className="text-primary dark:text-indigo-400"/> Adjust Thresholds</h2>
            <form onSubmit={updateThresholds} className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Left Column */}
                 <div className="space-y-6">
                   <div className="bg-slate-50/40 dark:bg-slate-800 p-4 rounded-xl border border-white dark:border-white/5">
                      <h4 className="font-bold text-sm mb-3 flex items-center gap-2 dark:text-slate-200"><Heart size={16} className="text-red-500"/> Heart Rate (BPM)</h4>
                      <div className="grid grid-cols-2 gap-4">
                         <div><label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">Min Limit</label><input type="number" value={tData.heartRate.min} onChange={e=>setTData({...tData, heartRate: {...tData.heartRate, min: e.target.value}})} className="w-full border-0 bg-slate-50/60 dark:bg-slate-700 dark:text-white focus:bg-slate-50 dark:focus:bg-slate-600 rounded-lg p-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 transition-all shadow-inner focus:outline-none" /></div>
                         <div><label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">Max Limit</label><input type="number" value={tData.heartRate.max} onChange={e=>setTData({...tData, heartRate: {...tData.heartRate, max: e.target.value}})} className="w-full border-0 bg-slate-50/60 dark:bg-slate-700 dark:text-white focus:bg-slate-50 dark:focus:bg-slate-600 rounded-lg p-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 transition-all shadow-inner focus:outline-none" /></div>
                       </div>
                   </div>
                   <div className="bg-slate-50/40 dark:bg-slate-800 p-4 rounded-xl border border-white dark:border-white/5">
                      <h4 className="font-bold text-sm mb-3 flex items-center gap-2 dark:text-slate-200"><Thermometer size={16} className="text-amber-500"/> Body Temp (°C)</h4>
                      <div className="grid grid-cols-2 gap-4">
                         <div><label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">Min Limit</label><input type="number" step="0.1" value={tData.temperature.min} onChange={e=>setTData({...tData, temperature: {...tData.temperature, min: e.target.value}})} className="w-full border-0 bg-slate-50/60 dark:bg-slate-700 dark:text-white focus:bg-slate-50 dark:focus:bg-slate-600 rounded-lg p-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 transition-all shadow-inner focus:outline-none" /></div>
                         <div><label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">Max Limit</label><input type="number" step="0.1" value={tData.temperature.max} onChange={e=>setTData({...tData, temperature: {...tData.temperature, max: e.target.value}})} className="w-full border-0 bg-slate-50/60 dark:bg-slate-700 dark:text-white focus:bg-slate-50 dark:focus:bg-slate-600 rounded-lg p-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 transition-all shadow-inner focus:outline-none" /></div>
                      </div>
                   </div>
                 </div>
                 
                 {/* Right Column */}
                 <div className="space-y-6">
                   <div className="bg-slate-50/40 dark:bg-slate-800 p-4 rounded-xl border border-white dark:border-white/5">
                      <h4 className="font-bold text-sm mb-3 flex items-center gap-2 dark:text-slate-200"><ThermometerSun size={16} className="text-orange-500"/> Ambient Room Temp (°C)</h4>
                      <div className="grid grid-cols-2 gap-4">
                         <div><label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">Min Limit</label><input type="number" step="0.1" value={tData.roomTemperature.min} onChange={e=>setTData({...tData, roomTemperature: {...tData.roomTemperature, min: e.target.value}})} className="w-full border-0 bg-slate-50/60 dark:bg-slate-700 dark:text-white focus:bg-slate-50 dark:focus:bg-slate-600 rounded-lg p-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 transition-all shadow-inner focus:outline-none" /></div>
                         <div><label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">Max Limit</label><input type="number" step="0.1" value={tData.roomTemperature.max} onChange={e=>setTData({...tData, roomTemperature: {...tData.roomTemperature, max: e.target.value}})} className="w-full border-0 bg-slate-50/60 dark:bg-slate-700 dark:text-white focus:bg-slate-50 dark:focus:bg-slate-600 rounded-lg p-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 transition-all shadow-inner focus:outline-none" /></div>
                      </div>
                   </div>
                   <div className="flex gap-6">
                     <div className="bg-slate-50/40 dark:bg-slate-800 p-4 rounded-xl border border-white dark:border-white/5 flex-1">
                        <h4 className="font-bold text-sm mb-3 flex items-center gap-2 dark:text-slate-200"><Activity size={16} className="text-blue-500"/> SpO2 (%)</h4>
                        <div><label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">Min Target</label><input type="number" value={tData.spo2.min} onChange={e=>setTData({...tData, spo2: {...tData.spo2, min: e.target.value}})} className="w-full border-0 bg-slate-50/60 dark:bg-slate-700 dark:text-white focus:bg-slate-50 dark:focus:bg-slate-600 rounded-lg p-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 transition-all shadow-inner focus:outline-none" /></div>
                     </div>
                     <div className="bg-slate-50/40 dark:bg-slate-800 p-4 rounded-xl border border-white dark:border-white/5 flex-1">
                        <h4 className="font-bold text-sm mb-3 flex items-center gap-2 dark:text-slate-200"><Droplets size={16} className="text-cyan-500"/> Humidity</h4>
                        <div><label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1 block">Max Target</label><input type="number" value={tData.humidity.max} onChange={e=>setTData({...tData, humidity: {...tData.humidity, max: e.target.value}})} className="w-full border-0 bg-slate-50/60 dark:bg-slate-700 dark:text-white focus:bg-slate-50 dark:focus:bg-slate-600 rounded-lg p-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 transition-all shadow-inner focus:outline-none" /></div>
                     </div>
                   </div>
                 </div>
               </div>
               
               <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-white dark:border-white/10">
                 <button type="button" onClick={() => setShowThresholdModal(false)} className="px-5 py-2.5 text-gray-500 dark:text-slate-400 font-bold hover:bg-slate-50/60 dark:hover:bg-slate-800 rounded-xl transition-all">Cancel</button>
                 <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">Save Changes</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
