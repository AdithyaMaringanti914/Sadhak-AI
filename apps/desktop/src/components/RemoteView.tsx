import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, XCircle, Monitor } from 'lucide-react';

interface RemoteViewProps {
  stream: MediaStream | null;
  onClose: () => void;
  onControlEvent: (type: string, payload: any) => void;
}

const RemoteView: React.FC<RemoteViewProps> = ({ stream, onClose, onControlEvent }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = videoRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Calculate relative coordinates
    const x = Math.round((e.clientX - rect.left) / rect.width * 1920); // Assume 1080p target
    const y = Math.round((e.clientY - rect.top) / rect.height * 1080);
    
    onControlEvent('MOUSE_MOVE', { x, y });
  };

  const handleMouseClick = (button: 'left' | 'right') => {
    onControlEvent('MOUSE_CLICK', { button });
  };

  return (
    <div className="flex flex-col h-full bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      {/* Toolbar */}
      <div className="h-12 bg-surface flex items-center justify-between px-4 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-primary">
            <Monitor size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Live Stream</span>
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-1 text-green-400 text-[10px] font-bold">
            <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            SECURE P2P
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-white/5 rounded-lg text-white/50 transition-colors">
            <Pause size={16} />
          </button>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-red-400/10 rounded-lg text-red-400/70 transition-colors"
          >
            <XCircle size={16} />
          </button>
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative cursor-none group" onMouseMove={handleMouseMove} onClick={() => handleMouseClick('left')}>
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          className="w-full h-full object-contain"
        />
        
        {/* Virtual Cursor */}
        <div className="absolute pointer-events-none w-4 h-4 border-2 border-primary rounded-full -translate-x-1/2 -translate-y-1/2 shadow-neon group-hover:block hidden" />
      </div>
      
      {/* AI Action Sidebar (Placeholder) */}
      <div className="absolute right-4 top-16 bottom-4 w-64 glass-card p-4 border-white/5 pointer-events-none">
        <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">AI Execution</h4>
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-[10px] font-bold text-primary mb-1 uppercase">Current Action</p>
            <p className="text-xs font-medium">Navigating to Settings</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemoteView;
