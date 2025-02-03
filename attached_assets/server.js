// Archivo: backend/server.js

const WebSocket = require('ws'); // Importa WebSocket
const PORT = 8080; // Puedes cambiar el puerto si es necesario

// Crear el servidor WebSocket en el puerto especificado
const wss = new WebSocket.Server({ port: PORT });
console.log(`Servidor WebSocket corriendo en ws://localhost:${PORT}`);

// Cuando un cliente se conecta, se configura la conexión
wss.on('connection', (ws) => {
  console.log('Cliente conectado');

  // Enviar datos simulados al cliente cada segundo
  const intervalId = setInterval(() => {
    const data = generateData(); // Genera los datos que se enviarán
    ws.send(JSON.stringify(data)); // Envía los datos como JSON al cliente
  }, 1000); // Cada 1 segundo

  // Maneja la desconexión del cliente y limpia el intervalo
  ws.on('close', () => {
    console.log('Cliente desconectado');
    clearInterval(intervalId); // Detiene el envío de datos
  });
});

// Función para generar datos simulados
function generateData() {
  return {
    direccion: getRandomInt(68000, 70000),
    dominancia: getRandomInt(5000, 7000),
    delta_futuros: getRandomInt(-1000, 1000),
    delta_spot: getRandomInt(-500, 500),
    transacciones: generateTransactions()
  };
}

// Generar transacciones simuladas
function generateTransactions() {
  const numTransactions = getRandomInt(5, 10); // Genera entre 5 y 10 transacciones
  const transactions = [];

  for (let i = 0; i < numTransactions; i++) {
    transactions.push({
      volume: `${getRandomInt(100, 300)}K`,  // Volumen en miles
      price: (getRandomInt(68000, 70000) / 100).toFixed(2) // Precio aleatorio simulado
    });
  }
  return transactions;
}

// Función para obtener un número entero aleatorio en un rango
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
