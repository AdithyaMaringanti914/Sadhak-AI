import { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import WindowHeader from './components/WindowHeader';
import Sidebar from './components/Sidebar';
import ConsentScreen from './components/ConsentScreen';
import RemoteView from './components/RemoteView';
import DashboardPage from './pages/DashboardPage';
import LogsPage from './pages/LogsPage';
import SettingsPage from './pages/SettingsPage';
import { AnimatePresence } from 'framer-motion';
import { useSessionStore } from './store/sessionStore';
import { WebRTCService } from './services/WebRTCService';
import { Toaster, toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [loading, setLoading] = useState(true);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const {
    role,
    status,
    actionPlan,
    taskPrompt,
    riskScore,
    setSession,
    resetSession,
  } = useSessionStore();

  const webrtcRef = useRef<WebRTCService | null>(null);

  useEffect(() => {
    const svc = new WebRTCService(API_URL);
    webrtcRef.current = svc;

    const socket = svc.getSocket();

    // ── Loading: clear as soon as socket connects OR after 1.5s max ───────
    const splashTimeout = setTimeout(() => setLoading(false), 1500);

    const onConnect = () => {
      clearTimeout(splashTimeout);
      setLoading(false);
    };

    if (socket.connected) {
      // Already connected (e.g. hot-reload)
      clearTimeout(splashTimeout);
      setLoading(false);
    } else {
      socket.on('connect', onConnect);
    }

    // ── WebRTC signaling ───────────────────────────────────────────────────
    socket.on('signal', (data) => {
      const { sessionId } = useSessionStore.getState();
      if (sessionId && svc) {
        svc.handleSignal(sessionId, data);
      }
    });

    // ── Both peers are in the room: Helper starts the offer ────────────────
    socket.on('client-joined', ({ sessionId }: { sessionId: string }) => {
      const state = useSessionStore.getState();
      if (state.role === 'HELPER' && svc) {
        console.log('Client joined — initiating WebRTC offer');
        svc.createOffer(sessionId);
      }
    });

    // ── Wire the remote-stream callback ────────────────────────────────────
    svc.onRemoteStream((stream) => {
      setRemoteStream(stream);
      setSession({ status: 'ACTIVE', isConnecting: false });
      toast.success('Connected! Viewing remote screen.');
    });

    // ── Connection state changes ───────────────────────────────────────────
    svc.onConnectionStateChange((state) => {
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        toast.error('Connection lost. Session ended.');
        resetSession();
        setRemoteStream(null);
      }
    });

    return () => {
      clearTimeout(splashTimeout);
      socket.off('connect', onConnect);
      socket.off('signal');
      socket.off('client-joined');
      svc.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helper: create session via server ──────────────────────────────────────
  const handleCreateSession = async (prompt: string) => {
    if (!prompt.trim()) {
      toast.error('Please describe the task first.');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/sessions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ prompt, helperId: 'demo-user' }),
      });
      const data = await response.json();

      if (data.success) {
        setSession({
          sessionId: data.sessionId,
          sessionCode: data.sessionCode,
          role: 'HELPER',
          status: 'CONNECTING',
          actionPlan: data.actionPlan.steps,
          taskPrompt: prompt,
          riskScore: data.actionPlan.overall_risk_score,
        });

        // Helper joins the room immediately — waits for client-joined to make the offer
        webrtcRef.current?.joinSession(data.sessionId);
        toast.success('Session created. Share the code with your client.');
      } else {
        toast.error(data.error || 'Failed to create session.');
      }
    } catch (err) {
      console.error('Failed to create session', err);
      toast.error('Failed to create session. Check your connection.');
    }
  };

  // ── Client: join an existing session ──────────────────────────────────────
  const handleJoinSession = async (code: string) => {
    if (!code || code.length < 6) {
      toast.error('Please enter a valid 6-character code.');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/sessions/${code}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      const data = await response.json();

      if (data.success) {
        setSession({
          sessionId: data.session.id,
          sessionCode: data.session.code,
          role: 'CLIENT',
          status: 'CONSENT_PENDING',
          actionPlan: data.session.actionPlan,
          taskPrompt: data.session.taskPrompt,
          riskScore: data.session.riskScore,
        });
        toast.success('Session found. Please review and approve.');
      } else {
        toast.error(data.error || 'Session not found. Check the code.');
      }
    } catch (err) {
      console.error('Failed to join session', err);
      toast.error('Failed to join session. Check your connection.');
    }
  };

  // ── Client: approve consent → start screen share + join WebRTC ────────────
  const handleApprove = async () => {
    const { sessionId } = useSessionStore.getState();
    if (!sessionId) return;

    try {
      // Show connecting spinner
      setSession({ isConnecting: true });

      // 1. Get screen share stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });

      // 2. Attach stream tracks to the peer connection BEFORE signaling
      //    (peer connection is created lazily when first signal arrives)
      //    We build it now so tracks are ready
      const svc = webrtcRef.current;
      if (!svc) throw new Error('WebRTC service not ready');

      // 3. Register the stream onto the service for when the PC is built
      //    handleSignal will create the PC on the client side when the offer arrives —
      //    we pre-store the stream so we can add tracks right after PC creation
      (svc as any)._pendingStream = stream;

      // 4. Join the signaling room — this triggers client-joined on the server
      //    which tells the Helper to createOffer
      svc.joinSession(sessionId);

      // Handle the case where the user stops screen share manually
      stream.getTracks().forEach((track) => {
        track.onended = () => {
          toast.info('Screen sharing stopped.');
          resetSession();
          setRemoteStream(null);
        };
      });

      toast.success('Screen sharing started. Connecting to helper…');
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        toast.error('Screen share permission denied.');
      } else {
        toast.error('Failed to start screen share.');
      }
      setSession({ isConnecting: false });
      resetSession();
    }
  };

  // ── End session ────────────────────────────────────────────────────────────
  const handleEndSession = () => {
    webrtcRef.current?.destroy();
    resetSession();
    setRemoteStream(null);
  };

  return (
    <Router>
      <Toaster position="top-right" theme="dark" richColors />
      <div className="flex flex-col h-screen overflow-hidden bg-background text-white">
        <AnimatePresence>
          {loading && <SplashScreen key="splash" />}
        </AnimatePresence>

        <WindowHeader />

        <div className="flex flex-1 overflow-hidden">
          {!loading && status === 'IDLE' && <Sidebar />}

          <main className="flex-1 relative overflow-y-auto p-8">
            <AnimatePresence mode="wait">
              {status === 'IDLE' ? (
                <Routes>
                  <Route
                    path="/"
                    element={
                      <DashboardPage
                        onSessionCreate={handleCreateSession}
                        onSessionJoin={handleJoinSession}
                      />
                    }
                  />
                  <Route path="/logs" element={<LogsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              ) : (
                <div className="h-full">
                  {/* Helper waiting for client */}
                  {status === 'CONNECTING' && role === 'HELPER' && (
                    <DashboardPage
                      onSessionCreate={handleCreateSession}
                      onSessionJoin={handleJoinSession}
                    />
                  )}

                  {/* Client reviewing consent */}
                  {status === 'CONSENT_PENDING' && (
                    <ConsentScreen
                      session={{
                        taskPrompt: taskPrompt!,
                        actionPlan: actionPlan!,
                        riskScore,
                      }}
                      onApprove={handleApprove}
                      onDeny={resetSession}
                    />
                  )}

                  {/* Active session — Helper viewing remote screen */}
                  {status === 'ACTIVE' && (
                    <RemoteView
                      stream={remoteStream}
                      onClose={handleEndSession}
                      onControlEvent={(type, payload) =>
                        webrtcRef.current?.sendControlEvent(type, payload)
                      }
                    />
                  )}
                </div>
              )}
            </AnimatePresence>
          </main>
        </div>

        {/* Decorative background glows */}
        <div className="fixed top-0 right-0 w-[800px] h-[800px] bg-secondary/5 rounded-full blur-[150px] -z-10 translate-x-1/2 -translate-y-1/2" />
        <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10 -translate-x-1/3 translate-y-1/3" />
      </div>
    </Router>
  );
}

export default App;
