import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface ConsentScreenProps {
  session: {
    taskPrompt: string;
    actionPlan: any[];
    riskScore: number;
  };
  onApprove: () => void;
  onDeny: () => void;
}

const ConsentScreen: React.FC<ConsentScreenProps> = ({ session, onApprove, onDeny }) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-400';
    if (score < 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRiskLabel = (score: number) => {
    if (score < 30) return 'Low Risk';
    if (score < 70) return 'Medium Risk';
    return 'High Risk';
  };

  const handleApprove = async () => {
    setIsConnecting(true);
    await onApprove();
    // isConnecting stays true — the parent will unmount this component
    // when the session goes ACTIVE, so no need to reset
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-2xl flex items-center justify-center p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card max-w-2xl w-full border-primary/20"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <Shield size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Secure Access Request</h2>
            <p className="text-white/50">A helper wants to assist you with a task.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Task description */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <label className="text-xs uppercase tracking-widest text-white/30 mb-2 block">
              Requested Task
            </label>
            <p className="text-lg font-medium">"{session.taskPrompt}"</p>
          </div>

          {/* Action plan */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs uppercase tracking-widest text-white/30">
                AI Proposed Action Plan
              </label>
              <div className={`flex items-center gap-2 text-sm font-bold ${getRiskColor(session.riskScore)}`}>
                <AlertTriangle size={14} />
                {getRiskLabel(session.riskScore)} — {session.riskScore}/100
              </div>
            </div>

            {/* Risk bar */}
            <div className="h-1.5 rounded-full bg-white/5 mb-4 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${session.riskScore}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  session.riskScore < 30
                    ? 'bg-green-400'
                    : session.riskScore < 70
                    ? 'bg-yellow-400'
                    : 'bg-red-400'
                }`}
              />
            </div>

            <div className="space-y-3">
              {session.actionPlan.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.07 }}
                  className="flex gap-4 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="text-white/20 font-mono text-sm pt-0.5 shrink-0">{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm">{step.title}</h4>
                      {step.requires_consent && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-bold uppercase shrink-0">
                          Approval Required
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                          step.risk_level === 'LOW'
                            ? 'bg-green-400/10 text-green-400 border border-green-400/20'
                            : step.risk_level === 'MEDIUM'
                            ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
                            : 'bg-red-400/10 text-red-400 border border-red-400/20'
                        }`}
                      >
                        {step.risk_level}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 mt-1">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div className="p-4 rounded-xl bg-accent/5 border border-accent/10 flex gap-4">
            <AlertTriangle className="text-accent shrink-0 mt-0.5" size={18} />
            <p className="text-xs text-accent/80">
              By clicking "Approve", you grant the helper temporary permission to view your screen and simulate
              mouse/keyboard inputs. You can terminate the session at any time.
            </p>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              onClick={onDeny}
              disabled={isConnecting}
              className="btn-secondary flex items-center justify-center gap-2 text-red-400 border-red-400/20 hover:bg-red-400/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <XCircle size={18} />
              Deny Access
            </button>
            <button
              onClick={handleApprove}
              disabled={isConnecting}
              className="btn-primary flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <AnimatePresence mode="wait">
                {isConnecting ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 size={18} className="animate-spin" />
                    Connecting…
                  </motion.span>
                ) : (
                  <motion.span
                    key="approve"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 size={18} />
                    Approve &amp; Share Screen
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ConsentScreen;
