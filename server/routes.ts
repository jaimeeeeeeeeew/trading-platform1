import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from 'ws';
import { storage } from "./storage";

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

  // Create WebSocket server attached to the HTTP server
  const wss = new WebSocketServer({ 
    server,
    path: '/ws' // Specify the WebSocket endpoint
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');

    const intervalId = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const data = generateData();
        console.log('Sending data:', data);
        ws.send(JSON.stringify(data));
      }
    }, 1000);

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
      clearInterval(intervalId);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return server;
}