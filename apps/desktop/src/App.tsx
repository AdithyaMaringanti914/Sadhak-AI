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

function App() {
  const [loading, setLoading] = useState(true);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const { role, status, actionPlan, taskPrompt, riskScore, setSession, resetSession } = useSessionStore();
  const webrtcRef = useRef<WebRTCService | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3000);
    webrtcRef.current = new WebRTCService('https://800d-103-186-255-26.ngrok-free.app');
    return () => clearTimeout(timer);
  }, []);

  const handleCreateSession = async (prompt: string) => {
    try {
      const response = await fetch('https://800d-103-186-255-26.ngrok-free.app/api/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ prompt, helperId: 'demo-user' })
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
          riskScore: data.actionPlan.overall_risk_score
        });
        webrtcRef.current?.createOffer(data.sessionId);
      }
    } catch (err) {
      console.error('Failed to create session', err);
    }
  };

  const handleJoinSession = async (code: string) => {
    try {
      const response = await fetch(`https://800d-103-186-255-26.ngrok-free.app/api/sessions/${code}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
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
          riskScore: data.session.riskScore
        });
      }
    } catch (err) {
      console.error('Failed to join session', err);
    }
  };

  const handleApprove = async () => {
    setSession({ status: 'ACTIVE' });
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    setRemoteStream(stream);
  };

  return (
    <Router>
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
                  <Route path="/" element={
                    <DashboardPage 
                      onSessionCreate={handleCreateSession} 
                      onSessionJoin={handleJoinSession} 
                    />
                  } />
                  <Route path="/logs" element={<LogsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              ) : (
                <div className="h-full">
                  {status === 'CONNECTING' && role === 'HELPER' && (
                    <DashboardPage 
                      onSessionCreate={handleCreateSession} 
                      onSessionJoin={handleJoinSession} 
                    />
                  )}
                  
                  {status === 'CONSENT_PENDING' && (
                    <ConsentScreen 
                      session={{ taskPrompt: taskPrompt!, actionPlan: actionPlan!, riskScore }}
                      onApprove={handleApprove}
                      onDeny={() => resetSession()}
                    />
                  )}

                  {status === 'ACTIVE' && (
                    <RemoteView 
                      stream={remoteStream}
                      onClose={() => {
                        resetSession();
                        setRemoteStream(null);
                      }}
                      onControlEvent={(type, payload) => webrtcRef.current?.sendControlEvent(type, payload)}
                    />
                  )}
                </div>
              )}
            </AnimatePresence>
          </main>
        </div>

        {/* Decorative background */}
        <div className="fixed top-0 right-0 w-[800px] h-[800px] bg-secondary/5 rounded-full blur-[150px] -z-10 translate-x-1/2 -translate-y-1/2" />
        <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10 -translate-x-1/3 translate-y-1/3" />
      </div>
    </Router>
  );
}

export default App;
