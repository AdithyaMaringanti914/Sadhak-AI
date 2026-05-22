import { Router, Request, Response } from 'express';
import { AIService, ChatMessage } from '../services/AIService';

const router = Router();

/**
 * POST /api/chat/stream
 * Body: { messages: ChatMessage[] }
 *
 * Streams NVIDIA Nemotron responses using Server-Sent Events (SSE).
 * Each SSE event is a JSON chunk: { reasoning?, content?, done }
 */
router.post('/stream', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'messages array is required' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    await AIService.streamChat(messages, (chunk) => {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      // Flush if available (important for streaming)
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    });

    res.end();
  } catch (error: any) {
    console.error('Chat stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/chat
 * Body: { messages: ChatMessage[] }
 *
 * Non-streaming chat — returns full response at once.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'messages array is required' });
    }

    let fullContent = '';
    await AIService.streamChat(messages, (chunk) => {
      if (chunk.content) fullContent += chunk.content;
    });

    res.json({ success: true, content: fullContent });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
