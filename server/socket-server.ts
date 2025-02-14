import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let io: Server;

interface OrderbookData {
  bids: Array<{ Price: string; Quantity: string }>;
  asks: Array<{ Price: string; Quantity: string }>;
  timestamp: string;
  bidsTotalInRange: number;
  asksTotalInRange: number;
  futuresLongDeltas: number;
  futuresShortDeltas: number;
  spotLongDeltas: number;
  spotShortDeltas: number;
  dominancePercentage: number;
  btcAmount: number;
}

export function setupSocketServer(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    path: '/trading-socket',
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    allowEIO3: true,
    pingTimeout: 60000,      // Aumentado a 60 segundos
    pingInterval: 25000,     // Reducido a 25 segundos
    transports: ['websocket'],
    connectTimeout: 45000,   // Reducido a 45 segundos
    maxHttpBufferSize: 1e8,
    cleanupEmptyChildNamespaces: true
  });

  console.log('🎧 Socket.IO server initialized and listening...');

  io.on('connection', (socket) => {
    let isProcessingMessage = false;
    const messageQueue: any[] = [];

    console.log('🟢 New client connected - ID:', socket.id);

    const processMessageQueue = async () => {
      if (isProcessingMessage || messageQueue.length === 0) return;

      isProcessingMessage = true;
      const message = messageQueue.shift();

      try {
        if (message.type === 'orderbook_data') {
          socket.broadcast.emit('orderbook_update', message.data);
        } else if (message.type === 'market_data') {
          socket.broadcast.emit('market_update', message.data);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      } finally {
        isProcessingMessage = false;
        if (messageQueue.length > 0) {
          setTimeout(processMessageQueue, 50); // Procesar siguiente mensaje después de 50ms
        }
      }
    };

    socket.on('orderbook_data', (data: OrderbookData) => {
      try {
        // Mantener el buffer de mensajes manejable
        if (messageQueue.length > 50) {
          messageQueue.length = 50; // Limitar a últimos 50 mensajes
        }

        messageQueue.push({ type: 'orderbook_data', data });
        processMessageQueue();

      } catch (error) {
        console.error('Error queueing orderbook data:', error);
      }
    });

    socket.on('market_data', (data) => {
      try {
        messageQueue.push({ type: 'market_data', data });
        processMessageQueue();
      } catch (error) {
        console.error('Error queueing market data:', error);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔴 Client disconnected:', {
        id: socket.id,
        reason
      });

      // Limpiar recursos
      messageQueue.length = 0;
      isProcessingMessage = false;
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', socket.id, error);

      // Intentar reconectar en caso de error
      if (!socket.connected) {
        socket.connect();
      }
    });

    // Monitoreo de latencia
    let lastPingTime = Date.now();

    socket.on('ping', () => {
      lastPingTime = Date.now();
    });

    socket.on('pong', () => {
      const latency = Date.now() - lastPingTime;
      if (latency > 1000) { // Si la latencia es mayor a 1 segundo
        console.warn('⚠️ High latency detected:', {
          socketId: socket.id,
          latency: `${latency}ms`
        });
      }
    });
  });

  return io;
}

export { io };