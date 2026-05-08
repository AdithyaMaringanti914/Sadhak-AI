import React from 'react';
import { motion } from 'framer-motion';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse-soft" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-secondary/20 rounded-full blur-[80px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="w-24 h-24 mb-8 relative">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-3xl border-2 border-primary/30 border-t-primary"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute inset-2 rounded-2xl border-2 border-secondary/30 border-b-secondary"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.8)]" />
          </div>
        </div>

        <motion.h1 
          initial={{ letterSpacing: "0.2em", opacity: 0 }}
          animate={{ letterSpacing: "0.5em", opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="text-4xl font-bold text-white mb-2 ml-4"
        >
          SADHAK
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="text-sm uppercase tracking-[0.3em] text-white/70"
        >
          AI-Powered Remote Intelligence
        </motion.p>
      </motion.div>

      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: 200 }}
        transition={{ delay: 1.5, duration: 1.5, ease: "easeInOut" }}
        className="absolute bottom-20 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"
      />
    </div>
  );
};

export default SplashScreen;
