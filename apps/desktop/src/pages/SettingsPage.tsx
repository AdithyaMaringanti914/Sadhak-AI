import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Monitor, Sparkles } from 'lucide-react';

const SettingsPage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-4xl mx-auto"
    >
      <header className="mb-12">
        <h2 className="text-3xl font-bold mb-2">Global Settings</h2>
        <p className="text-white/40 text-sm">Configure your Sadhak AI experience and security defaults.</p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {/* Security Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-primary text-xs font-bold uppercase tracking-widest mb-4">
            <Shield size={16} />
            Security & Privacy
          </div>
          
          <div className="glass-card flex items-center justify-between p-5">
            <div>
              <h4 className="font-bold text-white/90">Multi-Factor Authentication</h4>
              <p className="text-xs text-white/30">Require a secondary token for all session creations.</p>
            </div>
            <div className="w-12 h-6 rounded-full bg-primary/20 p-1 cursor-pointer">
              <div className="w-4 h-4 rounded-full bg-primary" />
            </div>
          </div>

          <div className="glass-card flex items-center justify-between p-5">
            <div>
              <h4 className="font-bold text-white/90">Auto-Pause on Sensitive Fields</h4>
              <p className="text-xs text-white/30">Pause streaming when a password field is detected.</p>
            </div>
            <div className="w-12 h-6 rounded-full bg-white/10 p-1 flex justify-end cursor-pointer">
              <div className="w-4 h-4 rounded-full bg-white/50" />
            </div>
          </div>
        </section>

        {/* AI Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-secondary text-xs font-bold uppercase tracking-widest mb-4">
            <Sparkles size={16} />
            AI Orchestration
          </div>
          
          <div className="glass-card flex items-center justify-between p-5">
            <div>
              <h4 className="font-bold text-white/90">Detailed Plan Analysis</h4>
              <p className="text-xs text-white/30">Generate deep technical context for each action step.</p>
            </div>
            <div className="w-12 h-6 rounded-full bg-secondary/20 p-1 cursor-pointer">
              <div className="w-4 h-4 rounded-full bg-secondary shadow-neon-purple" />
            </div>
          </div>
        </section>

        {/* Appearance Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-accent text-xs font-bold uppercase tracking-widest mb-4">
            <Monitor size={16} />
            Display & UI
          </div>
          
          <div className="glass-card flex items-center justify-between p-5">
            <div>
              <h4 className="font-bold text-white/90">Cyber-Premium Animations</h4>
              <p className="text-xs text-white/30">High-fidelity transitions and neon effects.</p>
            </div>
            <div className="w-12 h-6 rounded-full bg-accent/20 p-1 cursor-pointer">
              <div className="w-4 h-4 rounded-full bg-accent shadow-neon" />
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
};

export default SettingsPage;
