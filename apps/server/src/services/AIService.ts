import OpenAI from 'openai';
import { jsonrepair } from 'jsonrepair';
import dotenv from 'dotenv';

dotenv.config();

// ─── Types ────────────────────────────────────────────────────────────────────

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

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamChunk {
  reasoning?: string;
  content?: string;
  done: boolean;
}

// ─── NVIDIA Client (Nemotron via OpenAI-compatible API) ───────────────────────

let nvidiaClient: OpenAI | null = null;
let openrouterClient: OpenAI | null = null;

const getNvidiaClient = (): OpenAI => {
  if (!nvidiaClient) {
    nvidiaClient = new OpenAI({
      baseURL: 'https://integrate.api.nvidia.com/v1',
      apiKey: process.env.NVIDIA_API_KEY!,
    });
  }
  return nvidiaClient;
};

const getOpenRouterClient = (): OpenAI => {
  if (!openrouterClient) {
    openrouterClient = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY!,
      defaultHeaders: {
        'HTTP-Referer': 'https://sadhak.ai',
        'X-Title': 'Sadhak AI',
      },
    });
  }
  return openrouterClient;
};

// ─── Mock fallback ─────────────────────────────────────────────────────────────

const getMockPlan = (prompt: string): ActionPlan => ({
  steps: [
    {
      id: '1',
      title: 'Initial System Check',
      description: `Analyzing system configuration for: "${prompt}"`,
      action_type: 'SYSTEM_COMMAND',
      risk_level: 'LOW',
      requires_consent: false,
      requires_credentials: false,
    },
    {
      id: '2',
      title: 'Identify Target Application',
      description: 'Locating the relevant application or settings panel.',
      action_type: 'UI_INTERACTION',
      risk_level: 'LOW',
      requires_consent: false,
      requires_credentials: false,
    },
    {
      id: '3',
      title: 'Execute Task',
      description: 'Performing the requested operation with user consent.',
      action_type: 'UI_INTERACTION',
      risk_level: 'MEDIUM',
      requires_consent: true,
      requires_credentials: false,
    },
  ],
  overall_risk_score: 20,
  estimated_duration: '2 minutes',
});

// ─── SYSTEM PROMPT ─────────────────────────────────────────────────────────────

const SADHAK_SYSTEM_PROMPT = `You are Sadhak AI, an intelligent remote-support assistant that helps elderly and non-technical users by breaking down computer tasks into clear, safe, step-by-step actions. You are patient, friendly, and precise. When decomposing tasks, always consider user safety and data privacy. Never suggest risky operations without explicit consent steps.`;

const TASK_DECOMPOSE_SYSTEM_PROMPT = `${SADHAK_SYSTEM_PROMPT}

When given a task, output ONLY a single-line minified JSON object with no markdown.
Schema: {"steps":[{"id":"1","title":"short title","description":"short description","action_type":"SYSTEM_COMMAND","risk_level":"LOW","requires_consent":false,"requires_credentials":false}],"overall_risk_score":20,"estimated_duration":"5m"}
action_type must be one of: UI_INTERACTION, SYSTEM_COMMAND, LOCAL_INPUT, WAIT
risk_level must be one of: LOW, MEDIUM, HIGH`;

// ─── AIService ────────────────────────────────────────────────────────────────

export class AIService {
  /**
   * Decompose a user task into an ActionPlan using NVIDIA Nemotron.
   * Falls back to OpenRouter free models if NVIDIA fails.
   */
  static async decomposeTask(prompt: string): Promise<ActionPlan> {
    const nvidiaKey = process.env.NVIDIA_API_KEY;

    // Try NVIDIA Nemotron first (non-streaming for structured JSON)
    if (nvidiaKey) {
      try {
        console.log('🟢 Using NVIDIA Nemotron for task decomposition...');
        const client = getNvidiaClient();

        const response = await client.chat.completions.create({
          model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
          messages: [
            { role: 'system', content: TASK_DECOMPOSE_SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Decompose this task into 3-5 steps: "${prompt}". Return ONLY minified JSON.`,
            },
          ],
          temperature: 0.3,
          top_p: 0.95,
          max_tokens: 4096,
          // @ts-ignore — NVIDIA extra body for reasoning
          extra_body: {
            chat_template_kwargs: { enable_thinking: false }, // disable for structured JSON
          },
        } as any);

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('NVIDIA returned empty response');

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in NVIDIA response');

        const repaired = jsonrepair(jsonMatch[0]);
        const parsed = JSON.parse(repaired) as ActionPlan;
        console.log('✅ Task decomposed with NVIDIA Nemotron');
        return parsed;
      } catch (err: any) {
        console.warn(`⚠️ NVIDIA Nemotron failed: ${err?.message ?? err}. Falling back to OpenRouter...`);
      }
    }

    // OpenRouter fallback
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (openrouterKey && openrouterKey !== 'your-openrouter-api-key-here') {
      const models = [
        'deepseek/deepseek-v4-flash:free',
        'google/gemma-4-31b-it:free',
        'google/gemma-4-26b-a4b-it:free',
      ];

      for (const model of models) {
        try {
          console.log(`Trying OpenRouter model: ${model}`);
          const client = getOpenRouterClient();
          const response = await client.chat.completions.create({
            model,
            messages: [
              { role: 'system', content: TASK_DECOMPOSE_SYSTEM_PROMPT },
              {
                role: 'user',
                content: `Decompose this task into 3-5 steps: "${prompt}". Return ONLY minified JSON.`,
              },
            ],
          });

          const content = response.choices[0].message.content;
          if (!content) throw new Error('AI returned empty response');

          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('No JSON found in AI response');

          const repaired = jsonrepair(jsonMatch[0]);
          const parsed = JSON.parse(repaired) as ActionPlan;
          console.log(`✅ Success with OpenRouter model: ${model}`);
          return parsed;
        } catch (err: any) {
          console.warn(`Model ${model} failed (${err?.status ?? err?.message}), trying next...`);
        }
      }
    }

    console.warn('⚠️ All AI models failed. Returning mock plan.');
    return getMockPlan(prompt);
  }

  /**
   * Stream a chat response using NVIDIA Nemotron with reasoning.
   * Calls onChunk for each streamed piece (reasoning or content).
   * Returns the full response text when complete.
   */
  static async streamChat(
    messages: ChatMessage[],
    onChunk: (chunk: StreamChunk) => void
  ): Promise<string> {
    const nvidiaKey = process.env.NVIDIA_API_KEY;

    if (!nvidiaKey) {
      const msg = 'NVIDIA_API_KEY is not configured.';
      onChunk({ content: msg, done: true });
      return msg;
    }

    const client = getNvidiaClient();

    // Prepend Sadhak system prompt if not already present
    const fullMessages: ChatMessage[] =
      messages[0]?.role === 'system'
        ? messages
        : [{ role: 'system', content: SADHAK_SYSTEM_PROMPT }, ...messages];

    console.log('🟢 Streaming chat with NVIDIA Nemotron...');

    const stream = client.chat.completions.stream({
      model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
      messages: fullMessages,
      temperature: 0.6,
      top_p: 0.95,
      max_tokens: 65536,
      // @ts-ignore — NVIDIA extra params
      extra_body: {
        chat_template_kwargs: { enable_thinking: true },
        reasoning_budget: 16384,
      },
    } as any);

    let fullContent = '';

    for await (const chunk of stream) {
      if (!chunk.choices?.length) continue;

      const delta = chunk.choices[0].delta as any;

      // Emit reasoning tokens (thinking)
      if (delta?.reasoning_content) {
        onChunk({ reasoning: delta.reasoning_content, done: false });
      }

      // Emit content tokens
      if (delta?.content) {
        fullContent += delta.content;
        onChunk({ content: delta.content, done: false });
      }
    }

    onChunk({ done: true });
    console.log('✅ NVIDIA stream complete');
    return fullContent;
  }
}
