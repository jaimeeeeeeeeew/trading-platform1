import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let io: Server;

export function setupSocketServer(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    path: '/trading-socket',
    cors: {
      origin: "*",
      methods: ["GET", "POST", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["*"]
    },
    pingTimeout: 60000,
    pingInterval: 10000,
    transports: ['websocket', 'polling'],
    connectTimeout: 60000
  });

  console.log('🎧 Socket.IO server initialized and listening...');

  io.on('connection', (socket) => {
    console.log('🟢 New client connected - ID:', socket.id);

    socket.on('market_data', (data) => {
      console.log('📊 Received market data:', data);
      // Broadcast the data to all connected clients except sender
      socket.broadcast.emit('market_update', data);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔴 Client disconnected:', {
        id: socket.id,
        reason
      });
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', socket.id, error);
    });
  });

  return io;
}

export { io };