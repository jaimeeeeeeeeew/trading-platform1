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
  return {
    direccion: getRandomInt(68000, 70000),
    dominancia: {
      left: getRandomInt(5000, 7000),
      right: getRandomInt(5000, 7000)
    },
    delta_futuros: getRandomInt(-1000, 1000),
    delta_spot: getRandomInt(-500, 500),
    transacciones: Array.from({ length: getRandomInt(5, 10) }, () => ({
      volume: `${getRandomInt(100, 300)}K`,
      price: (getRandomInt(68000, 70000) / 100).toFixed(2)
    }))
  };
}

export function registerRoutes(app: Express): Server {
  const server = createServer(app);

  // Setup authentication
  setupAuth(app);

  // WebSocket server
  const wss = new WebSocketServer({ 
    server,
    path: '/ws',
    verifyClient: async (info, done) => {
      try {
        const cookies = parseCookie(info.req.headers.cookie || '');
        const sid = cookies['connect.sid'];

        if (!sid) {
          done(false, 401, 'Unauthorized');
          return;
        }

        // Verificar la sesión usando el store
        storage.sessionStore.get(sid, (err, session) => {
          if (err || !session) {
            done(false, 401, 'Unauthorized');
            return;
          }
          done(true);
        });
      } catch (err) {
        done(false, 401, 'Unauthorized');
      }
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Cliente conectado al WebSocket');

    const intervalId = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const data = generateData();
        ws.send(JSON.stringify(data));
      }
    }, 1000);

    ws.on('close', () => {
      console.log('Cliente desconectado del WebSocket');
      clearInterval(intervalId);
    });

    ws.on('error', (error) => {
      console.error('Error de WebSocket:', error);
    });
  });

  return server;
}