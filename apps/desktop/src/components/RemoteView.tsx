import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Pause, Play, XCircle, Monitor, Wifi, WifiOff, CheckCircle2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '../store/sessionStore';

interface RemoteViewProps {
  stream: MediaStream | null;
  onClose: () => void;
  onControlEvent: (type: string, payload: any) => void;
}

const RemoteView: React.FC<RemoteViewProps> = ({ stream, onClose, onControlEvent }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'unknown'>('unknown');
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const qualityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { actionPlan, taskPrompt } = useSessionStore();

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Poll WebRTC stats for connection quality
  useEffect(() => {
    if (!stream) return;

    const checkQuality = async () => {
      try {
        const [track] = stream.getVideoTracks();
        if (!track) return;

        // Use track settings as a proxy for quality
        const settings = track.getSettings();
        if (settings.frameRate && settings.frameRate >= 15) {
          setConnectionQuality('good');
        } else {
          setConnectionQuality('poor');
        }
      } catch {
        setConnectionQuality('unknown');
      }
    };

    checkQuality();
    qualityIntervalRef.current = setInterval(checkQuality, 3000);
    return () => {
      if (qualityIntervalRef.current) clearInterval(qualityIntervalRef.current);
    };
  }, [stream]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = videoRef.current?.getBoundingClientRect();
    if (!rect) return;

    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    setCursorPos({ x: relX, y: relY });

    // Map to remote screen coordinates (assume 1920×1080 target)
    const x = Math.round((relX / rect.width) * 1920);
    const y = Math.round((relY / rect.height) * 1080);
    onControlEvent('MOUSE_MOVE', { x, y });
  }, [onControlEvent]);

  const handleMouseClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const button = e.button === 2 ? 'right' : 'left';
    onControlEvent('MOUSE_CLICK', { button });
  }, [onControlEvent]);

  const togglePause = () => {
    if (!videoRef.current) return;
    if (paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
    setPaused(!paused);
  };

  const qualityColor =
    connectionQuality === 'good'
      ? 'text-green-400'
      : connectionQuality === 'poor'
      ? 'text-yellow-400'
      : 'text-white/30';

  const qualityLabel =
    connectionQuality === 'good' ? 'Good' : connectionQuality === 'poor' ? 'Poor' : '…';

  return (
    <div className="flex h-full gap-4">
      {/* ── Main video panel ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        {/* Toolbar */}
        <div className="h-12 bg-surface flex items-center justify-between px-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-primary">
              <Monitor size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">Live Stream</span>
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className={`flex items-center gap-1.5 text-[10px] font-bold ${qualityColor}`}>
              {connectionQuality === 'good' ? (
                <Wifi size={12} />
              ) : connectionQuality === 'poor' ? (
                <WifiOff size={12} />
              ) : (
                <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
              )}
              {connectionQuality === 'good' ? 'SECURE P2P' : `QUALITY: ${qualityLabel}`}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={togglePause}
              className="p-2 hover:bg-white/5 rounded-lg text-white/50 hover:text-white transition-colors"
              title={paused ? 'Resume' : 'Pause view'}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-400/10 rounded-lg text-red-400/70 hover:text-red-400 transition-colors"
              title="End session"
            >
              <XCircle size={16} />
            </button>
          </div>
        </div>

        {/* Video */}
        <div
          className="flex-1 relative cursor-none select-none"
          onMouseMove={handleMouseMove}
          onClick={handleMouseClick}
          onContextMenu={handleMouseClick}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />

          {/* Paused overlay */}
          <AnimatePresence>
            {paused && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              >
                <div className="text-white/50 text-sm font-bold uppercase tracking-widest flex items-center gap-3">
                  <Pause size={20} /> View Paused
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Virtual cursor dot */}
          <div
            className="absolute pointer-events-none w-4 h-4 border-2 border-primary rounded-full shadow-neon -translate-x-1/2 -translate-y-1/2 transition-none"
            style={{ left: cursorPos.x, top: cursorPos.y }}
          />
        </div>
      </div>

      {/* ── AI Action Plan sidebar ───────────────────────────────────────── */}
      <div className="w-64 flex flex-col gap-4 shrink-0">
        <div className="glass-card flex-1 p-4 border-white/5 overflow-y-auto">
          <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
            AI Execution Plan
          </h4>
          {taskPrompt && (
            <p className="text-[10px] text-white/30 mb-4 leading-relaxed line-clamp-3">
              {taskPrompt}
            </p>
          )}

          {actionPlan && actionPlan.length > 0 ? (
            <div className="space-y-2">
              {actionPlan.map((step, i) => {
                const isDone = i < activeStepIndex;
                const isActive = i === activeStepIndex;
                return (
                  <motion.button
                    key={step.id ?? i}
                    onClick={() => setActiveStepIndex(i)}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isActive
                        ? 'bg-primary/10 border-primary/30 shadow-neon'
                        : isDone
                        ? 'bg-green-400/5 border-green-400/20'
                        : 'bg-white/3 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="shrink-0 mt-0.5">
                        {isDone ? (
                          <CheckCircle2 size={12} className="text-green-400" />
                        ) : isActive ? (
                          <div className="w-3 h-3 rounded-full border-2 border-primary animate-spin border-t-transparent" />
                        ) : (
                          <Clock size={12} className="text-white/20" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-[11px] font-semibold leading-tight ${
                            isActive
                              ? 'text-primary'
                              : isDone
                              ? 'text-green-400'
                              : 'text-white/50'
                          }`}
                        >
                          {step.title}
                        </p>
                        {isActive && (
                          <p className="text-[10px] text-white/30 mt-1 leading-relaxed">
                            {step.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-white/20 text-center mt-8">No action plan loaded.</p>
          )}
        </div>

        {/* Step navigation */}
        {actionPlan && actionPlan.length > 0 && (
          <div className="glass-card p-3 border-white/5 flex gap-2">
            <button
              onClick={() => setActiveStepIndex((i) => Math.max(0, i - 1))}
              disabled={activeStepIndex === 0}
              className="flex-1 btn-secondary text-xs py-2 disabled:opacity-30"
            >
              ← Prev
            </button>
            <button
              onClick={() => setActiveStepIndex((i) => Math.min(actionPlan.length - 1, i + 1))}
              disabled={activeStepIndex === actionPlan.length - 1}
              className="flex-1 btn-primary text-xs py-2 disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RemoteView;
