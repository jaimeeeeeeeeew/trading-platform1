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

    // Log de todos los eventos recibidos
    socket.onAny((eventName, ...args) => {
      console.log(`🟣 Evento Socket.IO recibido - ${eventName}:`, args);
    });
  });

  return io;
}

export { io };