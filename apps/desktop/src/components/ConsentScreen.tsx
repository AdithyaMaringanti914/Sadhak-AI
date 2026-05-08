import React from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

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
  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-400';
    if (score < 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-2xl flex items-center justify-center p-6 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card max-w-2xl w-full border-primary/20"
      >
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
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <label className="text-xs uppercase tracking-widest text-white/30 mb-2 block">Requested Task</label>
            <p className="text-lg font-medium">"{session.taskPrompt}"</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs uppercase tracking-widest text-white/30">AI Proposed Action Plan</label>
              <div className={`flex items-center gap-2 text-sm font-bold ${getRiskColor(session.riskScore)}`}>
                <AlertTriangle size={14} />
                Risk Score: {session.riskScore}/100
              </div>
            </div>
            
            <div className="space-y-3">
              {session.actionPlan.map((step, index) => (
                <div key={index} className="flex gap-4 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                  <div className="text-white/20 font-mono text-sm">{index + 1}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{step.title}</h4>
                      {step.requires_consent && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-bold uppercase">Approval Required</span>
                      )}
                    </div>
                    <p className="text-xs text-white/40 mt-1">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-accent/5 border border-accent/10 flex gap-4">
            <AlertTriangle className="text-accent shrink-0" size={20} />
            <p className="text-xs text-accent/80">
              By clicking "Approve", you grant the helper temporary permission to view your screen and simulate mouse/keyboard inputs. You can terminate the session at any time.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button 
              onClick={onDeny}
              className="btn-secondary flex items-center justify-center gap-2 text-red-400 border-red-400/20 hover:bg-red-400/10"
            >
              <XCircle size={18} />
              Deny Access
            </button>
            <button 
              onClick={onApprove}
              className="btn-primary flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} />
              Approve & Connect
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ConsentScreen;
