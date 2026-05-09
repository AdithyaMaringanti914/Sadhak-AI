import { Request, Response } from 'express';
import { AIService } from '../services/AIService';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export const createSession = async (req: Request, res: Response) => {
  try {
    const { prompt, helperId } = req.body;

    // Ensure the helper exists to satisfy the foreign key constraint
    await prisma.user.upsert({
      where: { id: helperId },
      update: {},
      create: {
        id: helperId,
        email: `${helperId}@sadhak.ai`,
        passwordHash: 'hashed-mock-password',
        name: 'Demo Helper'
      }
    });

    // 1. Decompose Task with AI
    const actionPlan = await AIService.decomposeTask(prompt);

    // 2. Generate One-time Code
    const sessionCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    // 3. Save to DB
    const session = await prisma.session.create({
      data: {
        code: sessionCode,
        helperId,
        taskPrompt: prompt,
        actionPlan: JSON.stringify(actionPlan.steps),
        riskScore: actionPlan.overall_risk_score,
        expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
      }
    });

    res.json({
      success: true,
      sessionId: session.id,
      sessionCode,
      actionPlan
    });
  } catch (error: any) {
    console.error('Error creating session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getSessionByCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const session = await prisma.session.findUnique({
      where: { code: code as string }
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({
      success: true,
      session: {
        ...session,
        actionPlan: JSON.parse(session.actionPlan || '[]')
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
