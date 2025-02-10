import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let io: Server;

export function setupSocketServer(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    path: '/socket.io' // Usar una ruta específica para Socket.IO
  });

  io.on('connection', (socket) => {
    console.log('Cliente Socket.IO conectado - ID:', socket.id);

    // Manejar datos entrantes desde el cliente local
    socket.on('localData', (data) => {
      console.log('🔵 Datos recibidos por Socket.IO:');
      console.log('- Tipo de datos:', typeof data);
      console.log('- Contenido:', JSON.stringify(data, null, 2));
      // Reenviar los datos a todos los clientes conectados
      io.emit('marketData', data);
    });

    socket.on('disconnect', () => {
      console.log('Cliente Socket.IO desconectado - ID:', socket.id);
    });

    // Log de todos los eventos recibidos con formato detallado
    socket.onAny((eventName, ...args) => {
      console.log(`\n🟣 Evento Socket.IO recibido - ${eventName}:`);
      console.log('Datos completos:');
      args.forEach((arg, index) => {
        if (arg && typeof arg === 'object') {
          // Si es un objeto con bids y asks, mostrar el contenido detallado
          if (arg.bids || arg.asks) {
            console.log('\nOrderbook Data:');
            if (arg.bids) {
              console.log('\nBids:');
              // Mostrar la estructura raw de los primeros 5 bids
              console.log('Estructura raw de los primeros bids:', JSON.stringify(arg.bids.slice(0, 5)));
              arg.bids.slice(0, 5).forEach((bid: any, i: number) => {
                console.log(`Bid ${i + 1} estructura completa:`, bid);
                // Intentar acceder a los datos de diferentes maneras posibles
                if (Array.isArray(bid)) {
                  console.log(`Precio: ${bid[0]}, Cantidad: ${bid[1]}`);
                } else if (typeof bid === 'object') {
                  console.log(`Precio: ${bid.price || bid.p}, Cantidad: ${bid.quantity || bid.q || bid.amount || bid.a}`);
                }
              });
              console.log(`... y ${arg.bids.length - 5} más`);
            }
            if (arg.asks) {
              console.log('\nAsks:');
              // Mostrar la estructura raw de los primeros 5 asks
              console.log('Estructura raw de los primeros asks:', JSON.stringify(arg.asks.slice(0, 5)));
              arg.asks.slice(0, 5).forEach((ask: any, i: number) => {
                console.log(`Ask ${i + 1} estructura completa:`, ask);
                if (Array.isArray(ask)) {
                  console.log(`Precio: ${ask[0]}, Cantidad: ${ask[1]}`);
                } else if (typeof ask === 'object') {
                  console.log(`Precio: ${ask.price || ask.p}, Cantidad: ${ask.quantity || ask.q || ask.amount || ask.a}`);
                }
              });
              console.log(`... y ${arg.asks.length - 5} más`);
            }
            if (arg.timestamp) {
              console.log('\nTimestamp:', new Date(parseInt(arg.timestamp)).toISOString());
            }
          } else {
            // Para otros tipos de objetos, mostrar la estructura completa
            console.log(JSON.stringify(arg, null, 2));
          }
        } else {
          console.log(`Argumento ${index + 1}:`, arg);
        }
      });
      console.log('\n'); // Línea en blanco para separar eventos
    });
  });

  return io;
}

export { io };