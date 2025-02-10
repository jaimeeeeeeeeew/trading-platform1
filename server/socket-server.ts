import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let io: Server;

interface OrderBookLevel {
  Price: string;
  Quantity: string;
}

interface ProcessedOrderBookData {
  price: number;
  volume: number;
  side: 'bid' | 'ask';
  total: number;
}

export function setupSocketServer(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    path: '/trading-socket',
    cors: {
      origin: "*",
      methods: ["GET", "POST", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["my-custom-header", "Cache-Control", "Pragma"],
    },
    allowEIO3: true,
    pingTimeout: 30000,
    pingInterval: 15000,
    transports: ['polling', 'websocket'], // Enable both transports
    connectTimeout: 30000,
    maxHttpBufferSize: 1e6,
    allowUpgrades: true,
    upgradeTimeout: 15000,
    cookie: false
  });

  io.on('connection', (socket) => {
    console.log('🟢 Socket.IO conectado - ID:', socket.id, 'Transport:', socket.conn.transport.name);

    let lastOrderbookData: any = null;
    let heartbeatTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;

    const startHeartbeatCheck = () => {
      clearHeartbeatCheck();
      heartbeatTimeout = setTimeout(() => {
        console.log('⚠️ No se recibió heartbeat del cliente:', socket.id);
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          console.log(`🔄 Intento de reconexión ${reconnectAttempts}/${maxReconnectAttempts}`);
          socket.emit('reconnect_needed');
        }
      }, 30000);
    };

    const clearHeartbeatCheck = () => {
      if (heartbeatTimeout) {
        clearTimeout(heartbeatTimeout);
        heartbeatTimeout = null;
      }
    };

    socket.on('request_orderbook', () => {
      console.log('📥 Solicitud de orderbook:', socket.id);
      if (lastOrderbookData) {
        processAndSendOrderbookData(socket, lastOrderbookData);
      }
    });

    socket.on('orderbook_data', (data) => {
      try {
        console.log('📊 Datos recibidos:', {
          timestamp: new Date().toISOString(),
          clientId: socket.id,
          transport: socket.conn.transport.name,
          dataType: typeof data,
          hasData: !!data,
          dataSize: JSON.stringify(data).length
        });

        lastOrderbookData = data;
        processAndSendOrderbookData(socket, data);
      } catch (error) {
        console.error('❌ Error procesando datos:', error);
        socket.emit('error', { message: 'Error procesando datos' });
      }
    });

    socket.on('heartbeat', () => {
      socket.emit('heartbeat_ack');
      console.log('💓 Heartbeat recibido:', socket.id);
      startHeartbeatCheck();
      reconnectAttempts = 0;
    });

    socket.conn.on('upgrade', (transport) => {
      console.log('🔄 Transport actualizado:', socket.id, transport.name);
    });

    socket.on('error', (error) => {
      console.error('❌ Error en socket:', socket.id, error);
      clearHeartbeatCheck();
    });

    socket.on('disconnect', (reason) => {
      console.log('🔴 Socket desconectado:', {
        id: socket.id,
        reason,
        transport: socket.conn.transport.name,
        attempts: reconnectAttempts
      });

      clearHeartbeatCheck();

      // Only attempt reconnection for non-intentional disconnects
      if ((reason === 'transport close' || reason === 'ping timeout') && reconnectAttempts < maxReconnectAttempts) {
        const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts), 5000);
        setTimeout(() => {
          console.log('🔄 Enviando señal de reconexión:', socket.id);
          socket.emit('reconnect_needed');
          reconnectAttempts++;
        }, backoffTime);
      }
    });

    startHeartbeatCheck();
  });

  return io;
}

function processAndSendOrderbookData(socket: any, data: any) {
  if (!data || !data.bids || !data.asks) {
    console.warn('⚠️ Datos inválidos:', {
      timestamp: new Date().toISOString(),
      clientId: socket.id,
      tieneData: !!data,
      tieneBids: data?.bids?.length,
      tieneAsks: data?.asks?.length,
      transport: socket.conn.transport.name
    });
    return;
  }

  try {
    const processedData = processOrderBookForProfile(data.bids, data.asks);
    const groupedData = groupDataByPriceRange(processedData, 10);

    socket.emit('profile_data', groupedData);
    console.log('📤 Datos enviados:', {
      timestamp: new Date().toISOString(),
      clientId: socket.id,
      datosEnviados: groupedData.length,
      transport: socket.conn.transport.name
    });
  } catch (error) {
    console.error('❌ Error procesando:', error);
    socket.emit('error', { message: 'Error procesando datos' });
  }
}

function processOrderBookForProfile(
  bids: OrderBookLevel[],
  asks: OrderBookLevel[]
): ProcessedOrderBookData[] {
  const processedData: ProcessedOrderBookData[] = [];
  let bidTotal = 0;
  let askTotal = 0;

  bids.forEach((bid) => {
    const price = parseFloat(bid.Price);
    const volume = parseFloat(bid.Quantity);
    if (!isNaN(price) && !isNaN(volume) && price > 0) {
      bidTotal += volume;
      processedData.push({
        price,
        volume,
        side: 'bid',
        total: bidTotal
      });
    }
  });

  asks.forEach((ask) => {
    const price = parseFloat(ask.Price);
    const volume = parseFloat(ask.Quantity);
    if (!isNaN(price) && !isNaN(volume) && price > 0) {
      askTotal += volume;
      processedData.push({
        price,
        volume,
        side: 'ask',
        total: askTotal
      });
    }
  });

  return processedData.sort((a, b) => a.price - b.price);
}

function groupDataByPriceRange(data: ProcessedOrderBookData[], rangeSize: number): ProcessedOrderBookData[] {
  const groupedData = new Map<number, ProcessedOrderBookData>();

  const prices = data.map(item => item.price);
  const currentPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  const relevantData = data.filter(item =>
    item.price >= currentPrice * 0.95 &&
    item.price <= currentPrice * 1.05
  );

  relevantData.forEach(item => {
    const bucketPrice = Math.floor(item.price / rangeSize) * rangeSize;
    const existing = groupedData.get(bucketPrice);

    if (existing) {
      existing.volume += item.volume;
      existing.total = item.side === 'bid' ?
        Math.max(existing.total, item.total) :
        Math.max(existing.total, item.total);
    } else {
      groupedData.set(bucketPrice, {
        price: bucketPrice,
        volume: item.volume,
        side: item.side,
        total: item.total
      });
    }
  });

  return Array.from(groupedData.values())
    .sort((a, b) => a.price - b.price);
}

export { io };