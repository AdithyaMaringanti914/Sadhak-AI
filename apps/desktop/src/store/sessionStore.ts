import { create } from 'zustand';

export interface SessionPermissions {
  canViewScreen: boolean;
  canControl: boolean;
  canAutomate: boolean;
  requirePerActionConsent: boolean;
}

export const DEFAULT_REQUESTED_PERMISSIONS: SessionPermissions = {
  canViewScreen: true,
  canControl: true,
  canAutomate: false,
  requirePerActionConsent: true,
};

export type SessionStatus =
  | 'IDLE'
  | 'WAITING_FOR_PEER'
  | 'PERMISSION_REVIEW'
  | 'CONNECTING'
  | 'ACTIVE'
  | 'ENDED'
  | 'FAILED';

interface SessionState {
  sessionId: string | null;
  sessionCode: string | null;
  role: 'HELPER' | 'CLIENT' | null;
  status: SessionStatus;
  isConnecting: boolean;
  actionPlan: any[] | null;
  taskPrompt: string | null;
  riskScore: number;
  requestedPermissions: SessionPermissions;
  grantedPermissions: SessionPermissions | null;

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
  requestedPermissions: DEFAULT_REQUESTED_PERMISSIONS,
  grantedPermissions: null,

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
      requestedPermissions: DEFAULT_REQUESTED_PERMISSIONS,
      grantedPermissions: null,
    }),
}));
