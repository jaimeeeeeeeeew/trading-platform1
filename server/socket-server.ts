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
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    connectTimeout: 45000,
    maxHttpBufferSize: 1e6,
    allowUpgrades: true,
    upgradeTimeout: 30000
  });

  io.on('connection', (socket) => {
    console.log('🟢 Cliente Socket.IO conectado - ID:', socket.id);

    let lastOrderbookData: any = null;
    let heartbeatTimeout: NodeJS.Timeout | null = null;

    const startHeartbeatCheck = () => {
      if (heartbeatTimeout) {
        clearTimeout(heartbeatTimeout);
      }
      heartbeatTimeout = setTimeout(() => {
        console.log('⚠️ No se recibió heartbeat del cliente:', socket.id);
        socket.emit('reconnect_needed');
      }, 30000);
    };

    const clearHeartbeatCheck = () => {
      if (heartbeatTimeout) {
        clearTimeout(heartbeatTimeout);
        heartbeatTimeout = null;
      }
    };

    socket.on('request_orderbook', () => {
      console.log('📥 Solicitud de orderbook recibida del cliente:', socket.id);
      if (lastOrderbookData) {
        processAndSendOrderbookData(socket, lastOrderbookData);
      }
    });

    socket.on('orderbook_data', (data) => {
      try {
        console.log('📊 Datos de orderbook recibidos - Cliente:', socket.id, {
          timestamp: new Date().toISOString(),
          dataType: typeof data,
          hasData: !!data
        });
        lastOrderbookData = data;
        processAndSendOrderbookData(socket, data);
      } catch (error) {
        console.error('❌ Error procesando datos del orderbook:', error);
        socket.emit('error', { message: 'Error procesando datos del orderbook' });
      }
    });

    socket.on('heartbeat', () => {
      socket.emit('heartbeat_ack');
      console.log('💓 Heartbeat respondido para cliente:', socket.id);
      startHeartbeatCheck();
    });

    socket.on('error', (error) => {
      console.error('❌ Error en socket:', socket.id, error);
      clearHeartbeatCheck();
    });

    socket.on('disconnect', (reason) => {
      console.log('🔴 Cliente Socket.IO desconectado - ID:', socket.id, 'Razón:', reason);
      clearHeartbeatCheck();

      // Intentar reconexión después de un tiempo si la desconexión no fue intencional
      if (reason === 'transport close' || reason === 'ping timeout') {
        setTimeout(() => {
          console.log('🔄 Enviando señal de reconexión al cliente:', socket.id);
          io.to(socket.id).emit('reconnect_needed');
        }, 5000);
      }
    });

    startHeartbeatCheck();
  });

  return io;
}

function processAndSendOrderbookData(socket: any, data: any) {
  if (!data || !data.bids || !data.asks) {
    console.warn('⚠️ Datos de orderbook inválidos:', {
      timestamp: new Date().toISOString(),
      tieneData: !!data,
      tieneBids: data?.bids?.length,
      tieneAsks: data?.asks?.length
    });
    return;
  }

  try {
    const processedData = processOrderBookForProfile(data.bids, data.asks);
    const groupedData = groupDataByPriceRange(processedData, 10);

    socket.emit('profile_data', groupedData);
    console.log('📤 Datos de perfil enviados al cliente:', socket.id, {
      timestamp: new Date().toISOString(),
      datosEnviados: groupedData.length
    });
  } catch (error) {
    console.error('❌ Error en el procesamiento de datos:', error);
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