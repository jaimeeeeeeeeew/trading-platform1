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

  const wss = new WebSocketServer({ 
    server,
    path: "/ws",
    clientTracking: true,
    verifyClient: () => true // Desactivar verificación temporalmente
  });

  wss.on('error', (error) => {
    console.error('Error del servidor WebSocket:', error);
  });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('Nueva conexión WebSocket iniciada');

    try {
      const cookies = parseCookie(req.headers.cookie || '');
      const sessionId = cookies['connect.sid'];
      console.log('Cookie de sesión encontrada:', !!sessionId);
    } catch (error) {
      console.error('Error al procesar cookies:', error);
    }

    // Enviar datos iniciales inmediatamente
    try {
      const initialData = generateData();
      ws.send(JSON.stringify(initialData));
      console.log('Datos iniciales enviados correctamente');
    } catch (error) {
      console.error('Error al enviar datos iniciales:', error);
    }

    // Intervalo para enviar datos actualizados
    const dataInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          const data = generateData();
          ws.send(JSON.stringify(data));
        } catch (error) {
          console.error('Error al enviar datos:', error);
          clearInterval(dataInterval);
        }
      } else {
        console.log('WebSocket no está abierto, estado actual:', ws.readyState);
      }
    }, 1000);

    ws.on('close', (code, reason) => {
      console.log('Cliente desconectado del WebSocket:', code, reason || 'sin razón especificada');
      clearInterval(dataInterval);
    });

    ws.on('error', (error) => {
      console.error('Error de conexión WebSocket:', error);
      clearInterval(dataInterval);
    });
  });

  return server;
}