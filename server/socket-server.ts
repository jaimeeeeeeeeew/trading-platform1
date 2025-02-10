import { Server } from 'socket.io';
import http from 'http';

// Crear un servidor HTTP separado para Socket.IO
const socketServer = http.createServer();
const io = new Server(socketServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
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

// Iniciar el servidor Socket.IO en el puerto 5050
socketServer.listen(5050, () => {
  console.log('Servidor Socket.IO corriendo en puerto 5050');
});

export { io };