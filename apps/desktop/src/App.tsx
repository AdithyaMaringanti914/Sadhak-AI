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
import {
  DEFAULT_REQUESTED_PERMISSIONS,
  useSessionStore,
} from './store/sessionStore';
import type { SessionPermissions } from './store/sessionStore';
import { WebRTCService } from './services/WebRTCService';
import { Toaster, toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const isLikelyPreviewEnvironment = () => {
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const protocol = window.location.protocol;
  if (protocol === 'vscode-webview:' || protocol === 'vscode-file:') return true;
  return false;
};

const getScreenShareErrorMessage = (error: unknown) => {
  const err = error as { name?: string; message?: string };
  const name = err?.name ?? 'UnknownError';
  const message = err?.message?.trim();

  if (name === 'NotAllowedError') {
    return 'Screen share permission was denied.';
  }

  if (name === 'NotFoundError') {
    return 'No screen or window was selected to share.';
  }

  if (name === 'NotReadableError') {
    return 'Screen capture could not start. Another app or the OS may be blocking it.';
  }

  if (name === 'AbortError') {
    return 'Screen sharing was cancelled before it started.';
  }

  if (name === 'InvalidStateError') {
    return 'Screen sharing must be started from a real app window or browser tab, not from an embedded preview.';
  }

  if (name === 'NotSupportedError') {
    return 'Failed to start screen sharing: Not supported in this window. Use Electron or a standalone browser window.';
  }

  if (name === 'TypeError') {
    return 'Screen sharing is not available in this environment.';
  }

  return message
    ? `Failed to start screen sharing: ${message}`
    : 'Failed to start screen sharing for an unknown reason.';
};

function App() {
  const [loading, setLoading] = useState(true);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const {
    role,
    status,
    isConnecting,
    taskPrompt,
    riskScore,
    requestedPermissions,
    grantedPermissions,
    setSession,
    resetSession,
  } = useSessionStore();

  const webrtcRef = useRef<WebRTCService | null>(null);
  const helperOfferStartedRef = useRef<string | null>(null);

  const updateBackendSessionStatus = async (
    sessionId: string,
    nextStatus: string,
    actor: 'HELPER' | 'CLIENT' | 'SYSTEM',
    details?: string,
  ) => {
    try {
      await fetch(`${API_URL}/api/sessions/${sessionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ status: nextStatus, actor, details }),
      });
    } catch (error) {
      console.warn('Failed to sync session status', error);
    }
  };

  const updateBackendPermissions = async (
    sessionId: string,
    permissions: SessionPermissions,
  ) => {
    const response = await fetch(`${API_URL}/api/sessions/${sessionId}/permissions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        actor: 'CLIENT',
        grantedPermissions: permissions,
      }),
    });

    return response.json();
  };

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
        if (helperOfferStartedRef.current === sessionId) return;
        helperOfferStartedRef.current = sessionId;
        toast('[DEBUG] Helper: client joined the room');
        setSession({ status: 'CONNECTING' });
        console.log('Client joined — initiating WebRTC offer');
        svc.createOffer(sessionId);
      }
    });

    socket.on('peer-disconnected', () => {
      const state = useSessionStore.getState();
      helperOfferStartedRef.current = null;
      if (state.sessionId) {
        updateBackendSessionStatus(
          state.sessionId,
          'FAILED',
          state.role ?? 'SYSTEM',
          'Peer disconnected from the session.',
        );
      }
      toast.error('Peer disconnected. Session ended.');
      setRemoteStream(null);
      resetSession();
    });

    // ── Wire the remote-stream callback ────────────────────────────────────
    svc.onRemoteStream((stream) => {
      setRemoteStream(stream);
      const sessionState = useSessionStore.getState();
      setSession({ status: 'ACTIVE', isConnecting: false });
      if (sessionState.role === 'HELPER') {
        toast.success('Remote screen received. Live view is ready.');
      }
    });

    // ── Connection state changes ───────────────────────────────────────────
    svc.onConnectionStateChange((state) => {
      const sessionState = useSessionStore.getState();
      if (state === 'connected' && sessionState.sessionId) {
        if (sessionState.role === 'CLIENT') {
          setSession({ status: 'ACTIVE', isConnecting: false });
          toast.success('Connected! Your screen is now being shared securely.');
        } else {
          setSession({ status: 'CONNECTING', isConnecting: true });
          toast.info('Connected to peer. Waiting for the remote video stream...');
        }
        void updateBackendSessionStatus(
          sessionState.sessionId,
          'ACTIVE',
          sessionState.role ?? 'SYSTEM',
          'Peer-to-peer session connected.',
        );
        return;
      }

      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        if (sessionState.sessionId) {
          void updateBackendSessionStatus(
            sessionState.sessionId,
            'FAILED',
            sessionState.role ?? 'SYSTEM',
            `WebRTC state changed to ${state}.`,
          );
        }
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
      socket.off('peer-disconnected');
      svc.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helper: create session via server ──────────────────────────────────────
  const handleCreateSession = async (prompt: string) => {
    try {
      const response = await fetch(`${API_URL}/api/sessions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          prompt: prompt.trim() || undefined,
          helperId: 'demo-user',
          requestedPermissions: DEFAULT_REQUESTED_PERMISSIONS,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setSession({
          sessionId: data.session.id,
          sessionCode: data.session.code,
          role: 'HELPER',
          status: 'WAITING_FOR_PEER',
          actionPlan: data.session.actionPlan,
          taskPrompt: data.session.taskPrompt,
          riskScore: data.session.riskScore,
          requestedPermissions: data.session.requestedPermissions,
          grantedPermissions: data.session.grantedPermissions,
        });

        // Helper joins the room immediately — waits for client-joined to make the offer
        webrtcRef.current?.joinSession(data.session.id);
        toast.success('Session created. Share the code with your peer.');
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
    if (!code || code.length < 10) {
      toast.error('Please enter a valid 10-character code.');
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
          status: 'PERMISSION_REVIEW',
          actionPlan: data.session.actionPlan,
          taskPrompt: data.session.taskPrompt,
          riskScore: data.session.riskScore,
          requestedPermissions: data.session.requestedPermissions ?? DEFAULT_REQUESTED_PERMISSIONS,
          grantedPermissions: data.session.grantedPermissions,
        });
        toast.success('Session found. Review the access request to continue.');
      } else {
        toast.error(data.error || 'Session not found. Check the code.');
      }
    } catch (err) {
      console.error('Failed to join session', err);
      toast.error('Failed to join session. Check your connection.');
    }
  };

  // ── Client: approve consent → start screen share + join WebRTC ────────────
  const handleApprove = async (permissions: SessionPermissions) => {
    const { sessionId } = useSessionStore.getState();
    if (!sessionId) return;

    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        const apiErr = new Error('Screen sharing is not available in this environment.');
        (apiErr as any).name = 'TypeError';
        throw apiErr;
      }

      // Show connecting spinner
      setSession({
        isConnecting: true,
        status: 'CONNECTING',
        grantedPermissions: permissions,
      });

      // 1. Get screen share stream
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30 }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
      } catch (captureErr: any) {
        const name = captureErr?.name;
        if (name === 'NotSupportedError' || name === 'OverconstrainedError') {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false,
          });
        } else {
          throw captureErr;
        }
      }

      // 2. Attach stream tracks to the peer connection BEFORE signaling
      //    (peer connection is created lazily when first signal arrives)
      //    We build it now so tracks are ready
      const svc = webrtcRef.current;
      if (!svc) throw new Error('WebRTC service not ready');

      const permissionsResponse = await updateBackendPermissions(sessionId, permissions);
      if (!permissionsResponse.success) {
        throw new Error(permissionsResponse.error || 'Failed to approve session permissions');
      }

      await updateBackendSessionStatus(
        sessionId,
        'CONNECTING',
        'CLIENT',
        'Permissions granted. Screen share initialization started.',
      );

      // 3. Register the stream onto the service for when the PC is built
      //    handleSignal will create the PC on the client side when the offer arrives —
      //    we pre-store the stream so we can add tracks right after PC creation
      console.log('[DEBUG CLIENT APP] Setting pending stream on WebRTCService:', stream.id, 'tracks:', stream.getVideoTracks().length);
      (svc as any)._pendingStream = stream;

      // 4. Join the signaling room — this triggers client-joined on the server
      //    which tells the Helper to createOffer
      console.log('[DEBUG CLIENT APP] Joining signaling session room:', sessionId);
      svc.joinSession(sessionId);

      // Handle the case where the user stops screen share manually
      stream.getTracks().forEach((track) => {
        track.onended = () => {
          toast.info('Screen sharing stopped.');
          void updateBackendSessionStatus(
            sessionId,
            'ENDED',
            'CLIENT',
            'Recipient stopped screen sharing.',
          );
          helperOfferStartedRef.current = null;
          resetSession();
          setRemoteStream(null);
        };
      });

      toast.success('Screen sharing started. Connecting to helper…');
    } catch (err: any) {
      console.error('Screen share failed', err);
      const message = getScreenShareErrorMessage(err);
      toast.error(message);
      if (isLikelyPreviewEnvironment()) {
        toast.info('If this is running in IDE preview, retry from the Electron app or a standalone browser window.');
      }
      await updateBackendSessionStatus(
        sessionId,
        'PERMISSION_PENDING',
        'CLIENT',
        `Screen share failed: ${err?.name ?? 'UnknownError'}${err?.message ? ` - ${err.message}` : ''}`,
      );
      setSession({ isConnecting: false, status: 'PERMISSION_REVIEW' });
    }
  };

  const handleDeny = async () => {
    const { sessionId } = useSessionStore.getState();
    if (sessionId) {
      await updateBackendSessionStatus(
        sessionId,
        'FAILED',
        'CLIENT',
        'Recipient denied the remote session request.',
      );
    }
    helperOfferStartedRef.current = null;
    resetSession();
  };

  // ── End session ────────────────────────────────────────────────────────────
  const handleEndSession = () => {
    const { sessionId, role } = useSessionStore.getState();
    if (sessionId) {
      void updateBackendSessionStatus(
        sessionId,
        'ENDED',
        role ?? 'SYSTEM',
        'Session ended by user.',
      );
    }
    webrtcRef.current?.destroy();
    helperOfferStartedRef.current = null;
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
                  {(status === 'WAITING_FOR_PEER' || (status === 'CONNECTING' && role === 'HELPER')) && (
                    <DashboardPage
                      onSessionCreate={handleCreateSession}
                      onSessionJoin={handleJoinSession}
                    />
                  )}

                  {/* Client reviewing consent */}
                  {status === 'PERMISSION_REVIEW' && (
                    <ConsentScreen
                      session={{
                        taskPrompt,
                        requestedPermissions,
                        riskScore,
                      }}
                      onApprove={handleApprove}
                      onDeny={handleDeny}
                      isConnecting={isConnecting}
                    />
                  )}

                  {/* Connection in progress for client */}
                  {status === 'CONNECTING' && role === 'CLIENT' && (
                    <ConsentScreen
                      session={{
                        taskPrompt,
                        requestedPermissions,
                        riskScore,
                      }}
                      onApprove={handleApprove}
                      onDeny={handleDeny}
                      isConnecting={isConnecting}
                    />
                  )}

                  {/* Active session */}
                  {status === 'ACTIVE' && role === 'HELPER' && (
                    <RemoteView
                      stream={remoteStream}
                      onClose={handleEndSession}
                      canControl={grantedPermissions?.canControl ?? true}
                      onControlEvent={(type, payload) =>
                        webrtcRef.current?.sendControlEvent(type, payload)
                      }
                    />
                  )}

                  {status === 'ACTIVE' && role === 'CLIENT' && (
                    <div className="max-w-2xl mx-auto mt-20">
                      <div className="glass-card border-primary/20 p-8">
                        <h3 className="text-2xl font-bold mb-3">Remote Session Active</h3>
                        <p className="text-white/50 mb-6">
                          Your screen is being shared securely.
                          {grantedPermissions?.canControl
                            ? ' Remote control is enabled for this session.'
                            : ' This session is view-only.'}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <div className="text-xs uppercase tracking-widest text-white/30 mb-2">Access</div>
                            <div className="text-sm text-white/70">
                              {grantedPermissions?.canControl ? 'View + Control' : 'View Only'}
                            </div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <div className="text-xs uppercase tracking-widest text-white/30 mb-2">AI Automation</div>
                            <div className="text-sm text-white/70">
                              {grantedPermissions?.canAutomate ? 'Allowed later in-session' : 'Disabled'}
                            </div>
                          </div>
                        </div>
                        <button onClick={handleEndSession} className="btn-secondary">
                          End Session
                        </button>
                      </div>
                    </div>
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
