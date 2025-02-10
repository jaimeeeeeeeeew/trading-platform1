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
              arg.bids.slice(0, 5).forEach((bid: any) => {
                console.log(`Precio: ${bid[0]}, Cantidad: ${bid[1]}`);
              });
              console.log(`... y ${arg.bids.length - 5} más`);
            }
            if (arg.asks) {
              console.log('\nAsks:');
              arg.asks.slice(0, 5).forEach((ask: any) => {
                console.log(`Precio: ${ask[0]}, Cantidad: ${ask[1]}`);
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