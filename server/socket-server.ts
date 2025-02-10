import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let io: Server;

export function setupSocketServer(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    path: '/trading-socket',
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 10000,
    transports: ['polling', 'websocket'],
    connectTimeout: 60000
  });

  console.log('🎧 Socket.IO server initialized and listening...');

  io.on('connection', (socket) => {
    console.log('🟢 New client connected - ID:', socket.id);

    socket.on('disconnect', (reason) => {
      console.log('🔴 Client disconnected:', {
        id: socket.id,
        reason
      });
    });

    // Basic error handling
    socket.on('error', (error) => {
      console.error('❌ Socket error:', socket.id, error);
    });
  });

  return io;
}

export { io };