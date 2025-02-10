import { Server } from 'socket.io';
import http from 'http';

export function setupSocketServer(httpServer: http.Server) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    path: '/socket.io',
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
