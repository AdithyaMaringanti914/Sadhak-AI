import { Request, Response } from 'express';
import { AIService } from '../services/AIService';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

type SessionStatus =
  | 'CREATED'
  | 'WAITING_FOR_PEER'
  | 'PERMISSION_PENDING'
  | 'APPROVED'
  | 'CONNECTING'
  | 'ACTIVE'
  | 'ENDED'
  | 'FAILED';

interface SessionPermissions {
  canViewScreen: boolean;
  canControl: boolean;
  canAutomate: boolean;
  requirePerActionConsent: boolean;
}

const DEFAULT_REQUESTED_PERMISSIONS: SessionPermissions = {
  canViewScreen: true,
  canControl: true,
  canAutomate: false,
  requirePerActionConsent: true,
};

const VALID_SESSION_STATUSES: SessionStatus[] = [
  'CREATED',
  'WAITING_FOR_PEER',
  'PERMISSION_PENDING',
  'APPROVED',
  'CONNECTING',
  'ACTIVE',
  'ENDED',
  'FAILED',
];

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const normalizePermissions = (
  input: Partial<SessionPermissions> | undefined,
  defaults: SessionPermissions = DEFAULT_REQUESTED_PERMISSIONS,
): SessionPermissions => ({
  canViewScreen: input?.canViewScreen ?? defaults.canViewScreen,
  canControl: input?.canControl ?? defaults.canControl,
  canAutomate: input?.canAutomate ?? defaults.canAutomate,
  requirePerActionConsent:
    input?.requirePerActionConsent ?? defaults.requirePerActionConsent,
});

const serializeSession = (session: {
  actionPlan: string | null;
  requestedPermissions: string | null;
  grantedPermissions: string | null;
  [key: string]: any;
}) => ({
  ...session,
  actionPlan: parseJson(session.actionPlan, []),
  requestedPermissions: parseJson(
    session.requestedPermissions,
    DEFAULT_REQUESTED_PERMISSIONS,
  ),
  grantedPermissions: parseJson<SessionPermissions | null>(
    session.grantedPermissions,
    null,
  ),
});

const logAudit = async (
  sessionId: string,
  actor: string,
  action: string,
  details?: string,
  consentStatus?: string,
) => {
  await prisma.auditLog.create({
    data: {
      sessionId,
      actor,
      action,
      details,
      consentStatus,
    },
  });
};

export const createSession = async (req: Request, res: Response) => {
  try {
    const prompt =
      typeof req.body.prompt === 'string' ? req.body.prompt.trim() : '';
    const helperId =
      typeof req.body.helperId === 'string' && req.body.helperId.trim()
        ? req.body.helperId.trim()
        : 'demo-user';
    const requestedPermissions = normalizePermissions(req.body.requestedPermissions);

    // Ensure the helper exists to satisfy the foreign key constraint
    await prisma.user.upsert({
      where: { id: helperId },
      update: {},
      create: {
        id: helperId,
        email: `${helperId}@sadhak.ai`,
        passwordHash: 'hashed-mock-password',
        name: 'Demo Helper',
      },
    });

    const actionPlan = prompt ? await AIService.decomposeTask(prompt) : null;

    const sessionCode = crypto.randomBytes(5).toString('hex').toUpperCase();

    const session = await prisma.session.create({
      data: {
        code: sessionCode,
        helperId,
        status: 'WAITING_FOR_PEER',
        taskPrompt: prompt || null,
        actionPlan: actionPlan ? JSON.stringify(actionPlan.steps) : null,
        riskScore: actionPlan?.overall_risk_score ?? 0,
        requestedPermissions: JSON.stringify(requestedPermissions),
        expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
      },
    });

    await logAudit(
      session.id,
      'HELPER',
      'SESSION_CREATED',
      prompt || 'Remote session started without AI task context.',
      'N/A',
    );

    res.json({
      success: true,
      sessionId: session.id,
      sessionCode,
      session: serializeSession(session),
      actionPlan,
    });
  } catch (error: any) {
    console.error('Error creating session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getSessionByCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const existingSession = await prisma.session.findUnique({
      where: { code: code as string },
    });

    if (!existingSession) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (existingSession.expiresAt < new Date()) {
      return res.status(410).json({ success: false, error: 'Session has expired' });
    }

    const session =
      existingSession.status === 'WAITING_FOR_PEER'
        ? await prisma.session.update({
            where: { id: existingSession.id },
            data: { status: 'PERMISSION_PENDING' },
          })
        : existingSession;

    if (existingSession.status === 'WAITING_FOR_PEER') {
      await logAudit(
        existingSession.id,
        'CLIENT',
        'SESSION_JOIN_REQUESTED',
        'Client opened the permission review screen.',
        'PENDING',
      );
    }

    res.json({
      success: true,
      session: serializeSession(session),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateSessionPermissions = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Session id is required' });
    }
    const actor =
      typeof req.body.actor === 'string' && req.body.actor.trim()
        ? req.body.actor.trim()
        : 'CLIENT';
    const grantedPermissions = normalizePermissions(
      req.body.grantedPermissions,
      DEFAULT_REQUESTED_PERMISSIONS,
    );

    const session = await prisma.session.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        grantedPermissions: JSON.stringify(grantedPermissions),
      },
    });

    await logAudit(
      id,
      actor,
      'SESSION_APPROVED',
      'Client approved remote connection permissions.',
      'APPROVED',
    );

    res.json({
      success: true,
      session: serializeSession(session),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateSessionStatus = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Session id is required' });
    }
    const { status, details } = req.body as {
      status?: SessionStatus;
      details?: string;
    };
    const actor =
      typeof req.body.actor === 'string' && req.body.actor.trim()
        ? req.body.actor.trim()
        : 'SYSTEM';

    if (!status || !VALID_SESSION_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid session status' });
    }

    const data: Record<string, any> = { status };
    if (status === 'ACTIVE') {
      data.connectedAt = new Date();
    }
    if (status === 'ENDED' || status === 'FAILED') {
      data.endedAt = new Date();
    }

    const session = await prisma.session.update({
      where: { id },
      data,
    });

    await logAudit(id, actor, `STATUS_${status}`, details, 'N/A');

    res.json({
      success: true,
      session: serializeSession(session),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
