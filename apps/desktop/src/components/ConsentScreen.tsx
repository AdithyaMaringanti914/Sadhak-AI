import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  Pointer,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import type { SessionPermissions } from '../store/sessionStore';

interface ConsentScreenProps {
  session: {
    taskPrompt: string | null;
    requestedPermissions: SessionPermissions;
    riskScore: number;
  };
  onApprove: (permissions: SessionPermissions) => void | Promise<void>;
  onDeny: () => void;
  isConnecting: boolean;
}

const permissionMeta: Array<{
  key: keyof SessionPermissions;
  title: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    key: 'canViewScreen',
    title: 'View your screen',
    description: 'Lets the helper securely see your shared display.',
    icon: <Eye size={16} />,
  },
  {
    key: 'canControl',
    title: 'Control mouse and keyboard',
    description: 'Allows remote clicks and typing during the session.',
    icon: <Pointer size={16} />,
  },
  {
    key: 'canAutomate',
    title: 'Allow AI automation',
    description: 'Enables future AI-assisted actions after connection is established.',
    icon: <Sparkles size={16} />,
  },
  {
    key: 'requirePerActionConsent',
    title: 'Require per-action approval',
    description: 'Keeps sensitive actions gated behind additional consent.',
    icon: <ShieldCheck size={16} />,
  },
];

const ConsentScreen: React.FC<ConsentScreenProps> = ({
  session,
  onApprove,
  onDeny,
  isConnecting,
}) => {
  const [selectedPermissions, setSelectedPermissions] = useState<SessionPermissions>(
    session.requestedPermissions,
  );

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
    await onApprove(selectedPermissions);
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
            <p className="text-white/50">Review the requested connection permissions before sharing.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Session context */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <label className="text-xs uppercase tracking-widest text-white/30 mb-2 block">
              Session Context
            </label>
            <p className="text-lg font-medium">
              {session.taskPrompt ? `"${session.taskPrompt}"` : 'Remote support session'}
            </p>
            <p className="text-xs text-white/40 mt-2">
              You can allow view-only access, full remote control, or keep future AI actions disabled.
            </p>
          </div>

          {/* Permission request */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs uppercase tracking-widest text-white/30">
                Requested Permissions
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
              {permissionMeta.map((permission) => {
                const isRequested = session.requestedPermissions[permission.key];
                const enabled = selectedPermissions[permission.key];
                return (
                <motion.div
                  key={permission.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 }}
                  className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                    isRequested ? 'bg-white/5 border-white/10' : 'bg-white/3 border-white/5 opacity-60'
                  }`}
                >
                  <div className="text-white/30 shrink-0">{permission.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm">{permission.title}</h4>
                      {isRequested ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-bold uppercase shrink-0">
                          Requested
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/10 font-bold uppercase shrink-0">
                          Not Requested
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/40 mt-1">{permission.description}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!isRequested || isConnecting}
                    onClick={() =>
                      setSelectedPermissions((current) => ({
                        ...current,
                        [permission.key]: !current[permission.key],
                      }))
                    }
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${
                      enabled ? 'bg-primary/30' : 'bg-white/10'
                    } ${!isRequested ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full transition-transform ${
                        enabled ? 'bg-primary translate-x-6' : 'bg-white/60 translate-x-0'
                      }`}
                    />
                  </button>
                </motion.div>
                );
              })}
            </div>
          </div>

          {/* Warning */}
          <div className="p-4 rounded-xl bg-accent/5 border border-accent/10 flex gap-4">
            <AlertTriangle className="text-accent shrink-0 mt-0.5" size={18} />
            <p className="text-xs text-accent/80">
              After approval, Windows will ask which screen or window to share. You can stop sharing
              or end the session at any time.
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
