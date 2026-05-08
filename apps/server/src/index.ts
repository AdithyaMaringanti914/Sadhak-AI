import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import sessionRoutes from './routes/sessionRoutes';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict to desktop app origin
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

app.use('/api/sessions', sessionRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Socket.io Signaling Logic
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`Socket ${socket.id} joined session ${sessionId}`);
  });

  socket.on('signal', ({ sessionId, data }) => {
    // Broadcast WebRTC signaling data to others in the session
    socket.to(sessionId).emit('signal', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Sadhak AI Server running on port ${PORT}`);
});
