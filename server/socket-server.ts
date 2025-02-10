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
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 10000,
    transports: ['websocket'],
    connectTimeout: 60000,
    maxHttpBufferSize: 1e8  // Aumentar el tamaño del buffer para datos grandes
  });

  console.log('🎧 Socket.IO server initialized and listening...');

  io.on('connection', (socket) => {
    console.log('🟢 New client connected - ID:', socket.id);

    socket.on('orderbook_data', (data) => {
      // Log summary
      console.log('📊 Received orderbook data:', {
        timestamp: data.timestamp,
        bids_count: data.bids?.length || 0,
        asks_count: data.asks?.length || 0
      });

      // Log detailed data (first 5 entries of each)
      if (data.bids?.length) {
        console.log('📗 Top 5 Bids:');
        data.bids.slice(0, 5).forEach((bid: any) => {
          console.log(`   Price: ${bid.Price}, Volume: ${bid.Quantity}`);
        });
      }

      if (data.asks?.length) {
        console.log('📕 Top 5 Asks:');
        data.asks.slice(0, 5).forEach((ask: any) => {
          console.log(`   Price: ${ask.Price}, Volume: ${ask.Quantity}`);
        });
      }

      // Broadcast the data to all connected clients except sender
      socket.broadcast.emit('orderbook_update', data);
    });

    socket.on('market_data', (data) => {
      console.log('📈 Received market data:', data);
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