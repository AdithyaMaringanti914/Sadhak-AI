import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let ai: GoogleGenAI | null = null;

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  action_type: 'UI_INTERACTION' | 'SYSTEM_COMMAND' | 'LOCAL_INPUT' | 'WAIT';
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  requires_consent: boolean;
  requires_credentials: boolean;
}

export interface ActionPlan {
  steps: WorkflowStep[];
  overall_risk_score: number;
  estimated_duration: string;
}

export class AIService {
  static async decomposeTask(prompt: string): Promise<ActionPlan> {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-gemini-api-key-here') {
      console.warn("GEMINI_API_KEY missing. Returning mock plan.");
      return {
        steps: [
          {
            id: '1',
            title: 'Initial System Check',
            description: 'Analyzing system configuration and current state.',
            action_type: 'SYSTEM_COMMAND',
            risk_level: 'LOW',
            requires_consent: false,
            requires_credentials: false
          },
          {
            id: '2',
            title: 'User Authentication',
            description: 'Please enter your password locally when prompted.',
            action_type: 'LOCAL_INPUT',
            risk_level: 'LOW',
            requires_consent: true,
            requires_credentials: true
          },
          {
            id: '3',
            title: 'Final Configuration',
            description: 'Applying requested changes to the system.',
            action_type: 'UI_INTERACTION',
            risk_level: 'MEDIUM',
            requires_consent: true,
            requires_credentials: false
          }
        ],
        overall_risk_score: 25,
        estimated_duration: '5 minutes'
      };
    }

    if (!ai) {
      ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Decompose this task: "${prompt}"`,
      config: {
        systemInstruction: `You are the Sadhak AI Task Orchestrator. 
Your job is to take a natural language support request and decompose it into a sequence of secure, actionable steps.

Rules:
1. Never include steps that bypass user consent.
2. Mark steps requiring passwords as action_type: 'LOCAL_INPUT'.
3. Assign risk levels (LOW, MEDIUM, HIGH) based on the impact of the action.
4. Output MUST be a valid JSON object matching the ActionPlan schema.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  action_type: { type: Type.STRING, enum: ["UI_INTERACTION", "SYSTEM_COMMAND", "LOCAL_INPUT", "WAIT"] },
                  risk_level: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
                  requires_consent: { type: Type.BOOLEAN },
                  requires_credentials: { type: Type.BOOLEAN }
                },
                required: ["id", "title", "description", "action_type", "risk_level", "requires_consent", "requires_credentials"]
              }
            },
            overall_risk_score: { type: Type.NUMBER },
            estimated_duration: { type: Type.STRING }
          },
          required: ["steps", "overall_risk_score", "estimated_duration"]
        }
      }
    });

    const content = response.text;
    if (!content) throw new Error("AI failed to generate a plan");

    return JSON.parse(content) as ActionPlan;
  }
}
