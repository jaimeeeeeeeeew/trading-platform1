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
    console.log('Cliente Socket.IO conectado');

    // Manejar datos entrantes desde el cliente local
    socket.on('localData', (data) => {
      console.log('Datos locales recibidos:', data);
      // Reenviar los datos a todos los clientes conectados
      io.emit('marketData', data);
    });

    socket.on('disconnect', () => {
      console.log('Cliente Socket.IO desconectado');
    });
  });

  return io;
}

export { io };