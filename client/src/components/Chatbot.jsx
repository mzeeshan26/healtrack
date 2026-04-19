import { useState, useRef, useEffect, useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import PropTypes from 'prop-types';
import { X, Send, Database, HeartPulse, Stethoscope, Activity } from 'lucide-react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';

/** Renders model replies as Markdown (## headings, **bold**, lists). */
function BotMessageMarkdown({ text }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="text-base font-bold text-slate-900 dark:text-white mt-2 mb-1.5 first:mt-0 pb-1 border-b border-slate-200/80 dark:border-slate-600">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-sm font-bold text-teal-800 dark:text-teal-200 mt-3 mb-1.5 first:mt-0 tracking-tight">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-2.5 mb-1 first:mt-0">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="mb-2 last:mb-0 text-slate-700 dark:text-slate-200 leading-relaxed">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-700 dark:text-slate-200">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-700 dark:text-slate-200">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-bold text-slate-900 dark:text-white">{children}</strong>
        ),
        em: ({ children }) => <em className="italic text-slate-800 dark:text-slate-100">{children}</em>,
        hr: () => <hr className="my-3 border-slate-200 dark:border-slate-600" />,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-teal-400/70 pl-3 my-2 text-slate-600 dark:text-slate-300 italic text-sm">
            {children}
          </blockquote>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            className="text-teal-600 dark:text-teal-400 underline font-medium break-all"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        pre: ({ children }) => (
          <pre className="my-2 p-3 rounded-lg bg-slate-900/90 text-slate-100 text-xs overflow-x-auto font-mono border border-slate-700">
            {children}
          </pre>
        ),
        code: ({ children, className }) =>
          className?.includes('language-') ? (
            <code className={`${className} text-inherit`}>{children}</code>
          ) : (
            <code className="px-1.5 py-0.5 rounded-md bg-slate-200/90 dark:bg-slate-700/90 text-xs font-mono text-slate-900 dark:text-slate-100">
              {children}
            </code>
          ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

BotMessageMarkdown.propTypes = {
  text: PropTypes.string.isRequired,
};

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('medical_assistant');
  const [messages, setMessages] = useState([
    { text: "Hello! I am your AI Medical Assistant. How can I assist with telemetry analysis today?", sender: 'bot', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  const { user } = useContext(AuthContext);
  const urlParams = new URL(window.location.href);
  const pathParts = urlParams.pathname.split('/');
  const routeParamId = pathParts[1] === 'patient' ? pathParts[2] : null;
  const patientId = user?.role === 'patient' ? user.patientId : routeParamId;

  // Draggable state
  const [position, setPosition] = useState({ x: -1000, y: -1000 }); // Default offscreen to avoid jump
  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, isDragging: false, moved: false });
  const buttonRef = useRef(null);

  // Initialize position to middle right edge safely
  useEffect(() => {
     const w = window.innerWidth || document.documentElement.clientWidth;
     const h = window.innerHeight || document.documentElement.clientHeight;
     setPosition({ x: w - 120, y: h / 2 - 40 });
     
     const handleResize = () => {
       const cw = window.innerWidth || document.documentElement.clientWidth;
       const ch = window.innerHeight || document.documentElement.clientHeight;
       setPosition(prev => {
         return {
           x: Math.min(prev.x, cw - 90),
           y: Math.min(prev.y, ch - 90)
         };
       });
     };
     window.addEventListener('resize', handleResize);
     return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global drag listeners
  useEffect(() => {
    const handleMove = (e) => {
      if (!dragInfo.current.isDragging) return;
      
      // Calculate distance moved to distinguish drag vs click
      const dx = e.clientX - dragInfo.current.startX;
      const dy = e.clientY - dragInfo.current.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
         dragInfo.current.moved = true;
      }
      
      let newX = dragInfo.current.initialX + dx;
      let newY = dragInfo.current.initialY + dy;
      
      const cw = window.innerWidth || document.documentElement.clientWidth;
      const ch = window.innerHeight || document.documentElement.clientHeight;
      
      // Keep within screen boundaries safely
      newX = Math.max(10, Math.min(newX, cw - 90));
      newY = Math.max(10, Math.min(newY, ch - 90));
      
      setPosition({ x: newX, y: newY });
    };

    const handleUp = (e) => {
      if (dragInfo.current.isDragging) {
        setIsDragging(false);
        dragInfo.current.isDragging = false;
        // Release pointer capture
        if (buttonRef.current && e.pointerId) {
           try { buttonRef.current.releasePointerCapture(e.pointerId); } catch(err) {
            console.error(err);
           }
        }
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, []);

  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.type !== 'touchstart') return; // Left click or touch only
    dragInfo.current.startX = e.clientX;
    dragInfo.current.startY = e.clientY;
    dragInfo.current.initialX = position.x;
    dragInfo.current.initialY = position.y;
    dragInfo.current.isDragging = true;
    dragInfo.current.moved = false;
    setIsDragging(true);
    if (buttonRef.current) {
      buttonRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handleClick = (e) => {
    if (dragInfo.current.moved) {
       e.preventDefault();
       e.stopPropagation();
       return;
    }
    setIsOpen(true);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { text: input, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/chat', {
        message: userMsg.text,
        mode,
        patientId: mode === 'patient_data' ? patientId : null
      });
      
      setMessages(prev => [...prev, { text: res.data.reply, sender: 'bot', timestamp: new Date() }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        text: err.response?.data?.message || "Sorry, I encountered an error connecting to the AI service.", 
        sender: 'bot', 
        timestamp: new Date(), 
        isError: true 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const canUsePatientData = !!patientId;

  return (
    <>
      {/* Free-Floating Draggable Premium Button */}
      {!isOpen && (
        <div 
          ref={buttonRef}
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          style={{ 
            left: `${position.x}px`, 
            top: `${position.y}px`, 
            touchAction: 'none'
          }}
          className={`!fixed w-20 h-20 rounded-full shadow-[0_10px_40px_rgba(16,185,129,0.4)] dark:shadow-[0_10px_40px_rgba(16,185,129,0.2)] transition-all z-[9999] group cursor-grab active:cursor-grabbing flex items-center justify-center
            ${isDragging ? 'scale-110 shadow-[0_20px_60px_rgba(16,185,129,0.7)] dark:shadow-[0_20px_60px_rgba(16,185,129,0.4)] rotate-3' : 'animate-float hover:scale-105'}
          `}
        >
          {/* Main Solid Medical Gradient Orb */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 rounded-full"></div>
          
          {/* Radar Pulse Effect */}
          <div className="absolute inset-0 bg-slate-50 rounded-full animate-ping opacity-20 pointer-events-none" style={{ animationDuration: '3s' }}></div>
          
          {/* Inner frosted ring overlay */}
          <div className="absolute inset-1 border-[3px] border-white/30 rounded-full pointer-events-none"></div>

          <div className="relative z-10 flex items-center justify-center pointer-events-none">
              <Activity className="absolute -top-3 -right-3 text-white/50 animate-pulse" size={20} />
              <Stethoscope size={36} strokeWidth={2.5} className={`text-white drop-shadow-lg transition-transform ${isDragging ? 'scale-110' : ''}`}/>
          </div>
        </div>
      )}

      {/* Chat Window Drawer */}
      {isOpen && (
        <div className="!fixed top-0 right-0 w-[100vw] sm:w-[450px] h-screen bg-slate-50/80 dark:bg-slate-900/90 backdrop-blur-xl border-l border-white/60 dark:border-white/10 shadow-[-10px_0_40px_rgba(0,0,0,0.1)] dark:shadow-[-10px_0_40px_rgba(0,0,0,0.5)] flex flex-col z-[9999] flex-shrink-0 animate-in slide-in-from-right-8 duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 dark:from-emerald-600 dark:to-cyan-700 p-6 border-b border-white/60 dark:border-white/10 flex justify-between items-center text-white relative">
            <div className="flex flex-col relative z-10">
              <span className="font-extrabold text-lg flex items-center gap-2 drop-shadow-sm">
                 <HeartPulse size={22} className="text-white"/> HealTrack AI Assistant
              </span>
              <span className="text-xs font-semibold text-white/80 mt-0.5">Clinical Decision Support</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-slate-50/20 p-1.5 rounded-lg text-white transition-colors relative z-10">
               <X size={20} />
            </button>
          </div>

          {/* Mode Selector */}
          <div className="flex border-b border-white/60 dark:border-white/10 text-sm font-semibold bg-slate-50 dark:bg-slate-800">
            <button 
              onClick={() => setMode('medical_assistant')}
              className={`flex-1 py-3.5 flex items-center justify-center gap-2 transition-all ${mode === 'medical_assistant' ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 shadow-inner border-b-[3px] border-teal-500' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
            >
               <Stethoscope size={18}/> Global Medical DB
            </button>
            {canUsePatientData && (
              <button 
                onClick={() => setMode('patient_data')}
                className={`flex-1 py-3.5 flex items-center justify-center gap-2 transition-all ${mode === 'patient_data' ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 shadow-inner border-b-[3px] border-teal-500' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
              >
                 <Database size={18}/> Live Patient Vitals
              </button>
            )}
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-white/30 to-white/10 dark:from-slate-900/50 dark:to-slate-800/50 space-y-6 custom-scrollbar relative">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} max-w-full`}>
                <div className={`max-w-[85%] p-3.5 shadow-md text-sm transition-all
                  ${m.sender === 'user' 
                    ? 'bg-gradient-to-br from-teal-500 to-cyan-600 dark:from-teal-600 dark:to-cyan-700 text-white rounded-2xl rounded-tr-sm font-medium' 
                    : m.isError 
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-2xl rounded-tl-sm border border-red-200 dark:border-red-900/50 font-medium'
                      : 'bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-sm text-textPrimary dark:text-slate-200 rounded-2xl rounded-tl-sm border border-white dark:border-white/5 font-normal'}
                `}>
                  {m.sender === 'user' || m.isError ? (
                    m.text
                  ) : (
                    <BotMessageMarkdown text={m.text} />
                  )}
                </div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 mt-1.5 mx-2 uppercase">
                  {m.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            ))}
            {loading && (
              <div className="flex items-start">
                <div className="bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-sm p-4 rounded-2xl rounded-tl-sm border border-white dark:border-white/5 text-sm flex gap-1.5 shadow-sm">
                  <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-5 border-t border-white/60 dark:border-white/10 bg-slate-50/60 dark:bg-slate-800/60 backdrop-blur-xl flex gap-3 relative pb-8 sm:pb-5">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for clinical assessments..."
              className="flex-1 px-5 py-3.5 bg-slate-50/90 dark:bg-slate-700/90 border border-white dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:text-white rounded-xl text-sm font-medium shadow-inner transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500"
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="p-3 bg-gradient-to-r from-teal-500 to-cyan-600 dark:from-teal-600 dark:to-cyan-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:opacity-90 disabled:opacity-50 disabled:hover:shadow-none transition-all flex items-center justify-center shrink-0 w-14 h-14"
            >
              <Send size={20} className="ml-1" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default Chatbot;
