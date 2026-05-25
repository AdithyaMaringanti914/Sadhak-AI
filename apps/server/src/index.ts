import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import sessionRoutes from './routes/sessionRoutes';
import chatRoutes from './routes/chatRoutes';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Fix 6: CORS Lockdown
const allowedOrigins = [
  "vscode-webview://",
  "app://.",              // Electron production
  "https://sadhak.ai"     // Production domain
];

// Electron sends null origin for file:// protocol, we must allow it.
// For local development, accept any localhost port so Vite can auto-bump ports.
const isAllowedOrigin = (origin: string | undefined) => {
  if (!origin) return true; // null origin = Electron or curl
  if (/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(origin)) return true;
  return allowedOrigins.some(o => origin.startsWith(o));
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"]
  }
});


app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());

app.use('/api/sessions', sessionRoutes);
app.use('/api/chat', chatRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Track room occupancy: sessionId → Set of socket IDs
const sessionRooms = new Map<string, Set<string>>();

// Socket.io Signaling Logic
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-session', (sessionId: string) => {
    socket.join(sessionId);
    console.log(`Socket ${socket.id} joined session ${sessionId}`);

    // Track peers in this room
    if (!sessionRooms.has(sessionId)) {
      sessionRooms.set(sessionId, new Set());
    }
    const room = sessionRooms.get(sessionId)!;
    room.add(socket.id);

    // When the 2nd peer joins, notify the Helper to start the WebRTC offer
    if (room.size === 2) {
      console.log(`Session ${sessionId}: both peers connected — signaling client-joined`);
      // Broadcast to everyone in the room so the Helper side triggers createOffer
      io.to(sessionId).emit('client-joined', { sessionId });
    }
  });

  socket.on('signal', ({ sessionId, data }: { sessionId: string; data: any }) => {
    console.log(`[SIGNAL RELAY] Session ${sessionId} relaying signal: ${Object.keys(data).join(', ')}`);
    // Forward WebRTC signaling data to all other peers in the session
    socket.to(sessionId).emit('signal', data);
  });

  socket.on('disconnecting', () => {
    // Clean up room tracking when a peer disconnects
    for (const sessionId of socket.rooms) {
      const room = sessionRooms.get(sessionId);
      if (room) {
        room.delete(socket.id);
        socket.to(sessionId).emit('peer-disconnected', { sessionId });
        if (room.size === 0) sessionRooms.delete(sessionId);
      }
    }
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Sadhak AI Server running on port ${PORT}`);
});
