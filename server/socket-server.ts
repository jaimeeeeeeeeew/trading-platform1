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
    pingTimeout: 120000,        // Aumentado a 120 segundos
    pingInterval: 25000,        // Aumentado a 25 segundos
    transports: ['websocket'],
    connectTimeout: 120000,     // Aumentado a 120 segundos
    maxHttpBufferSize: 1e8,     // 100MB para datos grandes
    retries: 5                  // Número máximo de reintentos
  });

  console.log('🎧 Socket.IO server initialized and listening...');

  io.on('connection', (socket) => {
    console.log('🟢 New client connected - ID:', socket.id);

    // Buffer para almacenar datos durante desconexiones
    let messageBuffer: any[] = [];
    let isReconnecting = false;

    socket.on('orderbook_data', (data) => {
      try {
        // Log summary
        console.log('📊 Received orderbook data:', {
          timestamp: data.timestamp,
          bids_count: data.bids?.length || 0,
          asks_count: data.asks?.length || 0
        });

        // Si está reconectando, almacenar en buffer
        if (isReconnecting) {
          messageBuffer.push({ type: 'orderbook_data', data });
          return;
        }

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
      } catch (error) {
        console.error('Error processing orderbook data:', error);
      }
    });

    socket.on('market_data', (data) => {
      try {
        console.log('📈 Received market data:', data);

        // Si está reconectando, almacenar en buffer
        if (isReconnecting) {
          messageBuffer.push({ type: 'market_data', data });
          return;
        }

        // Broadcast the data to all connected clients except sender
        socket.broadcast.emit('market_update', data);
      } catch (error) {
        console.error('Error processing market data:', error);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔴 Client disconnected:', {
        id: socket.id,
        reason
      });

      if (reason === 'io server disconnect') {
        // La desconexión fue iniciada por el servidor
        socket.connect();
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Client reconnecting:', {
        id: socket.id,
        attempt: attemptNumber
      });
      isReconnecting = true;
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed after all attempts');
      messageBuffer = []; // Limpiar buffer
      isReconnecting = false;
    });

    socket.on('reconnected', () => {
      console.log('🔄 Client reconnected, processing buffered messages');
      isReconnecting = false;

      // Procesar mensajes almacenados en buffer
      while (messageBuffer.length > 0) {
        const msg = messageBuffer.shift();
        if (msg) {
          socket.broadcast.emit(`${msg.type}`, msg.data);
        }
      }
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', socket.id, error);
    });
  });

  return io;
}

export { io };