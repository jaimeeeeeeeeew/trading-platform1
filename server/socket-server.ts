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
          // Procesar bids y asks para el perfil
          const processedData = processOrderBookForProfile(orderBookData.bids, orderBookData.asks);

          // Enviar datos procesados para el perfil
          socket.emit('profile_data', processedData);

          // Log de datos procesados
          console.log('\n📊 Datos procesados para el perfil:');
          console.log(`- Total niveles de precio: ${processedData.length}`);
          console.log('- Muestra de datos:', processedData.slice(0, 3));
        }
      }

      // Mantener el logging detallado original
      console.log(`\n🟣 Evento Socket.IO recibido - ${eventName}:`);
      args.forEach((arg) => {
        if (arg && typeof arg === 'object') {
          if (arg.bids || arg.asks) {
            console.log('\nOrderbook Data:');
            if (arg.bids) {
              console.log('\nBids:');
              arg.bids.slice(0, 5).forEach((bid: OrderBookLevel, i: number) => {
                console.log(`Precio: ${bid.Price}, Cantidad: ${bid.Quantity}`);
              });
              console.log(`... y ${arg.bids.length - 5} más`);
            }
            if (arg.asks) {
              console.log('\nAsks:');
              arg.asks.slice(0, 5).forEach((ask: OrderBookLevel, i: number) => {
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

  // Ordenar por precio
  return processedData.sort((a, b) => a.price - b.price);
}

export { io };