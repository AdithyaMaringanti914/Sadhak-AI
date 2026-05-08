export type Role = 'HELPER' | 'CLIENT';
export type SessionStatus = 'IDLE' | 'CONNECTING' | 'ACTIVE' | 'CONSENT_PENDING' | 'COMPLETED' | 'CANCELLED';
export type ActionType = 'UI_INTERACTION' | 'SYSTEM_COMMAND' | 'LOCAL_INPUT' | 'WAIT';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  action_type: ActionType;
  risk_level: RiskLevel;
  requires_consent: boolean;
  requires_credentials: boolean;
}

export interface ActionPlan {
  steps: WorkflowStep[];
  overall_risk_score: number;
  estimated_duration: string;
}

export interface Session {
  id: string;
  code: string;
  helperId: string;
  status: SessionStatus;
  taskPrompt: string;
  actionPlan: WorkflowStep[];
  riskScore: number;
  createdAt: Date;
  expiresAt: Date;
}
