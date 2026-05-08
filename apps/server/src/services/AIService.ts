import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

let openai: OpenAI | null = null;

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
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your-openrouter-api-key-here') {
      console.warn("OPENROUTER_API_KEY missing. Returning mock plan.");
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
          }
        ],
        overall_risk_score: 10,
        estimated_duration: '1 minute'
      };
    }

    if (!openai) {
      openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
        defaultHeaders: {
          "HTTP-Referer": "https://sadhak.ai", 
          "X-Title": "Sadhak AI", 
        }
      });
    }

    const response = await openai.chat.completions.create({
      model: "meta-llama/llama-3.3-70b-instruct:free",
      messages: [
        {
          role: "system",
          content: `You are the Sadhak AI Task Orchestrator. 
Your job is to take a natural language support request and decompose it into a sequence of secure, actionable steps.

Rules:
1. Never include steps that bypass user consent.
2. Mark steps requiring passwords as action_type: 'LOCAL_INPUT'.
3. Assign risk levels (LOW, MEDIUM, HIGH) based on the impact of the action.
4. Output MUST be a valid JSON object matching the ActionPlan schema: { "steps": [...], "overall_risk_score": 10, "estimated_duration": "5m" }`
        },
        {
          role: "user",
          content: `Decompose this task: "${prompt}"\nReturn ONLY raw JSON, no markdown formatting or backticks.`
        }
      ]
    });

    let content = response.choices[0].message.content;
    if (!content) throw new Error("AI failed to generate a plan");

    // Clean up potential markdown formatting that OpenRouter models sometimes return
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    return JSON.parse(content) as ActionPlan;
  }
}
