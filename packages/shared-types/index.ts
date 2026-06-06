export type Role = 'HELPER' | 'CLIENT';
export type SessionStatus = 'IDLE' | 'CONNECTING' | 'ACTIVE' | 'CONSENT_PENDING' | 'COMPLETED' | 'CANCELLED';
export type ActionType = 'UI_INTERACTION' | 'SYSTEM_COMMAND' | 'LOCAL_INPUT' | 'WAIT';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

// Agentic Action Types (Execution Layer)
export type AgentActionType =
  | 'CLICK'
  | 'TYPE'
  | 'NAVIGATE'
  | 'SCROLL'
  | 'SCREENSHOT'
  | 'TAB_OPERATION'
  | 'WAIT'
  | 'READ';

export interface AgentActionBase {
  stepId: string;
  actionId: string;
  type: AgentActionType;
  riskLevel: RiskLevel;
  timestamp: number;
}

export interface ClickAction extends AgentActionBase {
  type: 'CLICK';
  x: number;
  y: number;
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
}

export interface TypeAction extends AgentActionBase {
  type: 'TYPE';
  text: string;
  submit?: boolean;
}

export interface NavigateAction extends AgentActionBase {
  type: 'NAVIGATE';
  url: string;
}

export interface ScrollAction extends AgentActionBase {
  type: 'SCROLL';
  direction: 'up' | 'down' | 'left' | 'right';
  amount?: number;
}

export interface ScreenshotAction extends AgentActionBase {
  type: 'SCREENSHOT';
}

export interface TabOperationAction extends AgentActionBase {
  type: 'TAB_OPERATION';
  operation: 'new' | 'close' | 'reload' | 'back' | 'forward';
}

export interface WaitAction extends AgentActionBase {
  type: 'WAIT';
  durationMs: number;
}

export interface ReadAction extends AgentActionBase {
  type: 'READ';
}

export type AgentAction =
  | ClickAction
  | TypeAction
  | NavigateAction
  | ScrollAction
  | ScreenshotAction
  | TabOperationAction
  | WaitAction
  | ReadAction;

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  action_type: ActionType;
  risk_level: RiskLevel;
  requires_consent: boolean;
  requires_credentials: boolean;
  suggestedAgentActions?: AgentAction[];
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

export interface SessionPermissions {
  canViewScreen: boolean;
  canControl: boolean;
  canAutomate: boolean;
  requirePerActionConsent: boolean;
}
