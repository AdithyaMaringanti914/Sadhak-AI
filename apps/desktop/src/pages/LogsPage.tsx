import React from 'react';
import { motion } from 'framer-motion';
import { History, ShieldCheck, User, Clock, ChevronRight } from 'lucide-react';

const LogsPage: React.FC = () => {
  const mockLogs = [
    { id: '1', task: 'Fix Gmail login issue', helper: 'Adithya', date: '2026-05-08', status: 'Completed', risk: 'Low' },
    { id: '2', task: 'Install Node.js environment', helper: 'AI Assistant', date: '2026-05-07', status: 'Completed', risk: 'Medium' },
    { id: '3', task: 'Reset Admin Password', helper: 'Sadhak Support', date: '2026-05-06', status: 'Cancelled', risk: 'High' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-5xl mx-auto"
    >
      <header className="mb-12 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Audit & History</h2>
          <p className="text-white/40 text-sm">Review past sessions and security events.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 text-xs text-white/50">
          <ShieldCheck size={14} className="text-primary" />
          Tamper-Evident Logs Active
        </div>
      </header>

      <div className="space-y-4">
        {mockLogs.map((log) => (
          <div key={log.id} className="glass-card hover:bg-white/5 cursor-pointer flex items-center gap-6 group">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              log.risk === 'Low' ? 'bg-green-500/10 text-green-400' :
              log.risk === 'Medium' ? 'bg-yellow-500/10 text-yellow-400' :
              'bg-red-500/10 text-red-400'
            }`}>
              <History size={20} />
            </div>
            
            <div className="flex-1">
              <h4 className="font-bold text-white/90 mb-1">{log.task}</h4>
              <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-white/30">
                <span className="flex items-center gap-1"><User size={10} /> {log.helper}</span>
                <span className="flex items-center gap-1"><Clock size={10} /> {log.date}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">{log.status}</div>
              <div className={`text-xs font-bold ${
                log.risk === 'Low' ? 'text-green-400' :
                log.risk === 'Medium' ? 'text-yellow-400' :
                'text-red-400'
              }`}>{log.risk} Risk</div>
            </div>

            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white/20 group-hover:text-white transition-colors">
              <ChevronRight size={18} />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default LogsPage;
