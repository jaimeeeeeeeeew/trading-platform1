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
      allowedHeaders: ["my-custom-header"],
    },
    pingTimeout: 120000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    connectTimeout: 120000,
    maxHttpBufferSize: 1e6,
    allowUpgrades: true,
    upgradeTimeout: 30000,
    cookie: false
  });

  console.log('🎧 Servidor Socket.IO iniciado y escuchando conexiones...');

  io.on('connection', (socket) => {
    console.log('🟢 Nuevo cliente conectado - ID:', socket.id);

    let lastOrderbookData: any = null;
    let heartbeatTimeout: NodeJS.Timeout | null = null;
    let clientState = 'connected';
    let consecutiveFailures = 0;
    let isCleanupNeeded = true;

    const cleanup = () => {
      if (!isCleanupNeeded) return;
      isCleanupNeeded = false;

      if (heartbeatTimeout) {
        clearTimeout(heartbeatTimeout);
        heartbeatTimeout = null;
      }

      socket.removeAllListeners();
      console.log('🧹 Limpieza realizada para socket:', socket.id);
    };

    const setupHeartbeatCheck = () => {
      if (heartbeatTimeout) {
        clearTimeout(heartbeatTimeout);
      }

      heartbeatTimeout = setTimeout(() => {
        if (clientState === 'connected') {
          console.log('⚠️ No se recibió heartbeat del cliente:', socket.id);
          consecutiveFailures++;

          if (consecutiveFailures > 3) {
            console.log('❌ Demasiados fallos consecutivos, desconectando cliente:', socket.id);
            cleanup();
            socket.disconnect(true);
          } else {
            setupHeartbeatCheck();
          }
        }
      }, 60000);
    };

    socket.on('heartbeat', () => {
      if (clientState !== 'connected') return;

      socket.emit('heartbeat_ack');
      consecutiveFailures = 0;
      console.log('💓 Heartbeat recibido del cliente:', socket.id);
      setupHeartbeatCheck();
    });

    socket.on('request_orderbook', () => {
      if (clientState !== 'connected') {
        console.log('⚠️ Cliente solicitó datos pero no está conectado. Estado:', clientState);
        return;
      }
      console.log('📥 Solicitud de datos del cliente:', socket.id);
      if (lastOrderbookData) {
        processAndSendOrderbookData(socket, lastOrderbookData);
      }
    });

    socket.on('orderbook_data', (data) => {
      if (clientState !== 'connected') {
        console.log('⚠️ Datos recibidos pero el cliente no está conectado. Estado:', clientState);
        return;
      }
      try {
        console.log('📊 Procesando datos del cliente:', socket.id);
        lastOrderbookData = data;
        processAndSendOrderbookData(socket, data);
      } catch (error) {
        console.error('❌ Error procesando datos:', error);
        clientState = 'error';
      }
    });

    socket.on('error', (error) => {
      console.error('❌ Error en socket:', socket.id, error);
      clientState = 'error';
      cleanup();
    });

    socket.on('disconnect', (reason) => {
      clientState = 'disconnected';
      console.log('🔴 Cliente desconectado:', {
        id: socket.id,
        reason,
        previousState: clientState,
        consecutiveFailures
      });
      cleanup();
    });

    // Iniciar el primer heartbeat check
    setupHeartbeatCheck();
  });

  return io;
}

function processAndSendOrderbookData(socket: any, data: any) {
  if (!data || !data.bids || !data.asks) {
    console.warn('⚠️ Datos inválidos recibidos del cliente:', socket.id);
    return;
  }

  try {
    const processedData = processOrderBookForProfile(data.bids, data.asks);
    const groupedData = groupDataByPriceRange(processedData, 10);
    socket.emit('profile_data', groupedData);
    console.log('📤 Datos procesados enviados al cliente:', socket.id);
  } catch (error) {
    console.error('❌ Error procesando datos:', error);
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