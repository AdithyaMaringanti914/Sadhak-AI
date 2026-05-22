import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { useSessionStore } from '../store/sessionStore';
import { toast } from 'sonner';

interface DashboardPageProps {
  onSessionCreate: (prompt: string) => Promise<void> | void;
  onSessionJoin: (code: string) => Promise<void> | void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onSessionCreate, onSessionJoin }) => {
  const [prompt, setPrompt] = useState('');
  const [sessionCodeInput, setSessionCodeInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [copied, setCopied] = useState(false);

  const { sessionCode, role, status } = useSessionStore();

  const handleCreate = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe the task first.');
      return;
    }
    setIsCreating(true);
    try {
      await onSessionCreate(prompt);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async () => {
    if (sessionCodeInput.length < 6) {
      toast.error('Enter the full 6-character code.');
      return;
    }
    setIsJoining(true);
    try {
      await onSessionJoin(sessionCodeInput);
    } finally {
      setIsJoining(false);
    }
  };

  const copyCode = () => {
    if (sessionCode) {
      navigator.clipboard.writeText(sessionCode);
      setCopied(true);
      toast.success('Code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper waiting for client after session created
  if (status === 'CONNECTING' && role === 'HELPER') {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12"
        >
          <div className="w-12 h-12 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <Sparkles size={24} />
          </div>
          <h3 className="text-sm uppercase tracking-[0.3em] text-primary mb-6 font-bold">
            Session Ready
          </h3>

          {/* Session code display */}
          <div
            onClick={copyCode}
            className="text-5xl font-bold tracking-widest mb-3 text-neon cursor-pointer hover:opacity-80 transition-opacity select-all"
            title="Click to copy"
          >
            {sessionCode}
          </div>

          <button
            onClick={copyCode}
            className="flex items-center gap-2 mx-auto text-xs text-white/40 hover:text-white/70 transition-colors mb-8"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Click code to copy'}
          </button>

          <p className="text-white/40 text-sm mb-8">
            Share this code with the person you want to help. They enter it in the app to connect.
          </p>

          <div className="flex items-center justify-center gap-3 text-white/60 animate-pulse bg-primary/5 py-3 rounded-full">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">
              Waiting for client to join…
            </span>
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
        {/* Helper card */}
        <div className="glass-card flex flex-col group hover:border-primary/30 transition-all duration-500">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-1">Technical Operator</h3>
              <p className="text-white/30 text-xs uppercase tracking-widest">Initialize Task Decomp</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:shadow-neon transition-all">
              <AnimatePresence mode="wait">
                {isCreating ? (
                  <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Loader2 size={18} className="animate-spin" />
                  </motion.div>
                ) : (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="w-4 h-4 rounded-full border-2 border-current" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleCreate();
            }}
            placeholder="Describe the task for AI analysis… (Ctrl+Enter to submit)"
            className="input-field flex-1 min-h-[160px] mb-6 resize-none text-sm leading-relaxed"
            disabled={isCreating}
          />

          <button
            onClick={handleCreate}
            disabled={isCreating || !prompt.trim()}
            className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <AnimatePresence mode="wait">
              {isCreating ? (
                <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  AI Decomposing Task…
                </motion.span>
              ) : (
                <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                  <Sparkles size={16} />
                  Decompose &amp; Generate Code
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Client card */}
        <div className="glass-card flex flex-col group hover:border-secondary/30 transition-all duration-500">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-1">Support Recipient</h3>
              <p className="text-white/30 text-xs uppercase tracking-widest">Join via Secure Code</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary group-hover:shadow-neon-purple transition-all">
              <AnimatePresence mode="wait">
                {isJoining ? (
                  <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Loader2 size={18} className="animate-spin" />
                  </motion.div>
                ) : (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="w-4 h-4 rounded bg-current animate-pulse" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <label className="text-[10px] uppercase tracking-[0.2em] text-white/30 text-center mb-4">
              Enter 6-Character Hex Token
            </label>
            <input
              value={sessionCodeInput}
              onChange={(e) => setSessionCodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
              placeholder="A1B2C3"
              className="input-field text-center text-4xl tracking-[0.4em] font-black mb-6 bg-white/5 border-none focus:ring-0 placeholder:text-white/5"
              maxLength={10}
              disabled={isJoining}
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={isJoining || sessionCodeInput.length < 6}
            className="btn-secondary w-full py-4 text-sm font-bold uppercase tracking-widest border-white/5 bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <AnimatePresence mode="wait">
              {isJoining ? (
                <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Validating…
                </motion.span>
              ) : (
                <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Validate &amp; Join Session
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;
