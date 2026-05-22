import { create } from 'zustand';

interface SessionState {
  sessionId: string | null;
  sessionCode: string | null;
  role: 'HELPER' | 'CLIENT' | null;
  status: 'IDLE' | 'CONNECTING' | 'ACTIVE' | 'CONSENT_PENDING';
  /** True while the WebRTC handshake is in progress after the Client approves */
  isConnecting: boolean;
  actionPlan: any[] | null;
  taskPrompt: string | null;
  riskScore: number;

  setSession: (data: Partial<SessionState>) => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  sessionCode: null,
  role: null,
  status: 'IDLE',
  isConnecting: false,
  actionPlan: null,
  taskPrompt: null,
  riskScore: 0,

  setSession: (data) => set((state) => ({ ...state, ...data })),
  resetSession: () =>
    set({
      sessionId: null,
      sessionCode: null,
      role: null,
      status: 'IDLE',
      isConnecting: false,
      actionPlan: null,
      taskPrompt: null,
      riskScore: 0,
    }),
}));
