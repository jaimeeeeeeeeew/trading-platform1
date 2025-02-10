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
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    path: '/socket.io'
  });

  io.on('connection', (socket) => {
    console.log('Cliente Socket.IO conectado - ID:', socket.id);

    socket.on('localData', (data) => {
      console.log('🔵 Datos recibidos por Socket.IO:');
      console.log('- Tipo de datos:', typeof data);
      console.log('- Contenido:', JSON.stringify(data, null, 2));
      io.emit('marketData', data);
    });

    socket.on('disconnect', () => {
      console.log('Cliente Socket.IO desconectado - ID:', socket.id);
    });

    socket.onAny((eventName, ...args) => {
      if (eventName === 'orderbook_data') {
        const orderBookData = args[0];
        if (orderBookData && orderBookData.bids && orderBookData.asks) {
          // Procesar datos para el perfil de volumen
          const processedData = processOrderBookForProfile(orderBookData.bids, orderBookData.asks);

          // Agrupar los datos en rangos de $10
          const groupedData = groupDataByPriceRange(processedData, 10);

          // Enviar datos procesados para el perfil
          socket.emit('profile_data', groupedData);

          console.log('\n📊 Datos procesados para el perfil:');
          console.log(`- Total niveles de precio: ${groupedData.length}`);
          console.log('- Muestra de datos:', groupedData.slice(0, 3));
        }
      }

      // Log detallado para debugging
      console.log(`\n🟣 Evento Socket.IO recibido - ${eventName}:`);
      args.forEach((arg) => {
        if (arg && typeof arg === 'object') {
          if (arg.bids || arg.asks) {
            console.log('\nOrderbook Data:');
            if (arg.bids) {
              console.log('\nBids:');
              arg.bids.slice(0, 5).forEach((bid: OrderBookLevel) => {
                console.log(`Precio: ${bid.Price}, Cantidad: ${bid.Quantity}`);
              });
              console.log(`... y ${arg.bids.length - 5} más`);
            }
            if (arg.asks) {
              console.log('\nAsks:');
              arg.asks.slice(0, 5).forEach((ask: OrderBookLevel) => {
                console.log(`Precio: ${ask.Price}, Cantidad: ${ask.Quantity}`);
              });
              console.log(`... y ${arg.asks.length - 5} más`);
            }
          }
        }
      });
    });
  });

  return io;
}

function processOrderBookForProfile(
  bids: OrderBookLevel[], 
  asks: OrderBookLevel[]
): ProcessedOrderBookData[] {
  const processedData: ProcessedOrderBookData[] = [];
  let bidTotal = 0;
  let askTotal = 0;

  // Procesar bids
  bids.forEach((bid) => {
    const price = parseFloat(bid.Price);
    const volume = parseFloat(bid.Quantity);
    bidTotal += volume;
    processedData.push({
      price,
      volume,
      side: 'bid',
      total: bidTotal
    });
  });

  // Procesar asks
  asks.forEach((ask) => {
    const price = parseFloat(ask.Price);
    const volume = parseFloat(ask.Quantity);
    askTotal += volume;
    processedData.push({
      price,
      volume,
      side: 'ask',
      total: askTotal
    });
  });

  return processedData.sort((a, b) => a.price - b.price);
}

function groupDataByPriceRange(data: ProcessedOrderBookData[], rangeSize: number): ProcessedOrderBookData[] {
  const groupedData = new Map<number, ProcessedOrderBookData>();

  data.forEach(item => {
    const bucketPrice = Math.floor(item.price / rangeSize) * rangeSize;
    const existing = groupedData.get(bucketPrice);

    if (existing) {
      existing.volume += item.volume;
      existing.total = item.side === 'bid' ? Math.max(existing.total, item.total) : Math.max(existing.total, item.total);
    } else {
      groupedData.set(bucketPrice, {
        price: bucketPrice,
        volume: item.volume,
        side: item.side,
        total: item.total
      });
    }
  });

  return Array.from(groupedData.values()).sort((a, b) => a.price - b.price);
}

export { io };