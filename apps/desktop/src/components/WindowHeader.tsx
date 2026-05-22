import React from 'react';
import { Minus, Square, X } from 'lucide-react';

const WindowHeader: React.FC = () => {
  const control = (action: 'minimize' | 'maximize' | 'close') => {
    (window as any).electronAPI?.windowControl(action);
  };

  return (
    <div className="h-10 w-full flex items-center justify-between px-4 select-none drag sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/5">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-lg bg-neon-gradient flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse-soft" />
        </div>
        <span className="text-xs font-semibold tracking-wider text-white/70">SADHAK AI</span>
      </div>
      <div className="flex items-center no-drag">
        <button 
          onClick={() => control('minimize')}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white"
        >
          <Minus size={14} />
        </button>
        <button 
          onClick={() => control('maximize')}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white"
        >
          <Square size={12} />
        </button>
        <button 
          onClick={() => control('close')}
          className="p-2 hover:bg-accent/20 hover:text-accent rounded-lg transition-colors text-white/50"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default WindowHeader;
