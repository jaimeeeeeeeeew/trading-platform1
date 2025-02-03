import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from 'ws';
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { parse as parseCookie } from 'cookie';

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateData() {
  const basePrice = 68500;
  const volatility = 0.002; // 0.2% volatilidad
  const priceChange = basePrice * volatility * (Math.random() * 2 - 1);
  const currentPrice = basePrice + priceChange;

  const dominanciaTotal = 10000;
  const dominanciaLeft = getRandomInt(dominanciaTotal * 0.4, dominanciaTotal * 0.6);
  const dominanciaRight = dominanciaTotal - dominanciaLeft;

  return {
    direccion: Math.round(currentPrice),
    dominancia: {
      left: dominanciaLeft,
      right: dominanciaRight
    },
    delta_futuros: getRandomInt(-300, 300),
    delta_spot: getRandomInt(-150, 150),
    transacciones: Array.from({ length: getRandomInt(3, 7) }, () => {
      const transactionPrice = currentPrice * (1 + (Math.random() * 0.001 - 0.0005));
      return {
        volume: `${getRandomInt(50, 500)}K`,
        price: transactionPrice.toFixed(2)
      };
    })
  };
}

export function registerRoutes(app: Express): Server {
  const server = createServer(app);
  setupAuth(app);

  // Configuración del WebSocket con manejo de sesión
  const wss = new WebSocketServer({ 
    server,
    path: "/ws",
    verifyClient: (info, callback) => {
      const cookies = parseCookie(info.req.headers.cookie || '');
      const sessionId = cookies['connect.sid'];

      if (!sessionId) {
        callback(false, 401, 'Unauthorized');
        return;
      }

      callback(true);
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Cliente conectado al WebSocket');
    let isAlive = true;

    // Enviar datos iniciales
    const initialData = generateData();
    ws.send(JSON.stringify(initialData));

    // Mantener la conexión viva
    const pingInterval = setInterval(() => {
      if (!isAlive) {
        ws.terminate();
        return;
      }

      isAlive = false;
      ws.ping();
    }, 30000);

    ws.on('pong', () => {
      isAlive = true;
    });

    // Intervalo para enviar datos
    const dataInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          const data = generateData();
          ws.send(JSON.stringify(data));
        } catch (error) {
          console.error('Error al enviar datos:', error);
        }
      }
    }, 1000);

    ws.on('close', () => {
      console.log('Cliente desconectado del WebSocket');
      clearInterval(dataInterval);
      clearInterval(pingInterval);
    });

    ws.on('error', (error) => {
      console.error('Error de WebSocket:', error);
      clearInterval(dataInterval);
      clearInterval(pingInterval);
    });
  });

  return server;
}