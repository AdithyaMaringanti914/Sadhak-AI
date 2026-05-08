import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSessionStore } from '../store/sessionStore';

interface DashboardPageProps {
  onSessionCreate: (prompt: string) => void;
  onSessionJoin: (code: string) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onSessionCreate, onSessionJoin }) => {
  const [prompt, setPrompt] = useState('');
  const [sessionCodeInput, setSessionCodeInput] = useState('');
  const { sessionCode, role, status } = useSessionStore();

  if (status === 'CONNECTING' && role === 'HELPER') {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12"
        >
          <h3 className="text-sm uppercase tracking-[0.3em] text-primary mb-8 font-bold">Session Ready</h3>
          <div className="text-6xl font-bold tracking-widest mb-8 text-neon">{sessionCode}</div>
          <p className="text-white/40 text-sm mb-8">Share this code with the person you want to help.</p>
          <div className="flex items-center justify-center gap-3 text-white/60 animate-pulse bg-primary/5 py-3 rounded-full">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">Waiting for client...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      <header className="mb-12">
        <h2 className="text-5xl font-bold mb-4 tracking-tight">
          Secure. Intelligent. <span className="text-neon">Sadhak AI.</span>
        </h2>
        <p className="text-white/40 text-xl max-w-2xl">
          The ultimate bridge for high-end remote technical assistance.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card flex flex-col group hover:border-primary/30 transition-all duration-500">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-1">Technical Operator</h3>
              <p className="text-white/30 text-xs uppercase tracking-widest">Initialize Task Decomp</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:shadow-neon transition-all">
              <div className="w-4 h-4 rounded-full border-2 border-current animate-spin" />
            </div>
          </div>
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the task for AI analysis..."
            className="input-field flex-1 min-h-[160px] mb-6 resize-none text-sm leading-relaxed"
          />
          <button onClick={() => onSessionCreate(prompt)} className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-widest">
            Decompose & Generate Code
          </button>
        </div>

        <div className="glass-card flex flex-col group hover:border-secondary/30 transition-all duration-500">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-1">Support Recipient</h3>
              <p className="text-white/30 text-xs uppercase tracking-widest">Join via Secure Code</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary group-hover:shadow-neon-purple transition-all">
              <div className="w-4 h-4 rounded bg-current animate-pulse" />
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <label className="text-[10px] uppercase tracking-[0.2em] text-white/30 text-center mb-4">Enter 6-Digit Hex Token</label>
            <input 
              value={sessionCodeInput}
              onChange={(e) => setSessionCodeInput(e.target.value.toUpperCase())}
              placeholder="000000"
              className="input-field text-center text-4xl tracking-[0.4em] font-black mb-6 bg-white/5 border-none focus:ring-0 placeholder:text-white/5"
              maxLength={6}
            />
          </div>
          <button onClick={() => onSessionJoin(sessionCodeInput)} className="btn-secondary w-full py-4 text-sm font-bold uppercase tracking-widest border-white/5 bg-white/5 hover:bg-white/10">
            Validate & Join Session
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;
