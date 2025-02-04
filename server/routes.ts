import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { WebSocket, WebSocketServer } from 'ws';

// Configuración de WebSocket en un puerto diferente
const WS_PORT = 8080;

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Usaremos el precio de TradingView como base
let lastPrice = 43000; // Precio actual aproximado de BTC
let trend = 0;

function generateData() {
  // Simular cambio de precio con tendencia
  trend = trend * 0.95 + (Math.random() - 0.5) * 0.3;
  const volatility = 0.001; // 0.1% volatilidad
  const priceChange = lastPrice * volatility * trend;
  lastPrice = lastPrice + priceChange;

  // Generar dominancia basada en la dirección del precio
  const dominanciaTotal = 10000;
  const dominanciaLeft = trend > 0
    ? getRandomInt(dominanciaTotal * 0.55, dominanciaTotal * 0.7)  // Más compradores
    : getRandomInt(dominanciaTotal * 0.3, dominanciaTotal * 0.45); // Más vendedores
  const dominanciaRight = dominanciaTotal - dominanciaLeft;

  // Delta futuros correlacionado con el precio
  const deltaFuturosTotal = getRandomInt(500, 700);
  const deltaFuturosPositivo = trend > 0
    ? getRandomInt(deltaFuturosTotal * 0.6, deltaFuturosTotal * 0.8)
    : getRandomInt(deltaFuturosTotal * 0.2, deltaFuturosTotal * 0.4);
  const deltaFuturosNegativo = deltaFuturosTotal - deltaFuturosPositivo;

  // Delta spot sigue a futuros pero con menor volumen
  const deltaSpotTotal = Math.floor(deltaFuturosTotal * 0.6);
  const deltaSpotPositivo = trend > 0
    ? getRandomInt(deltaSpotTotal * 0.55, deltaSpotTotal * 0.75)
    : getRandomInt(deltaSpotTotal * 0.25, deltaSpotTotal * 0.45);
  const deltaSpotNegativo = deltaSpotTotal - deltaSpotPositivo;

  return {
    symbol: "BTCUSDT",
    ask_limit: (lastPrice + priceChange).toFixed(2),
    bid_limit: (lastPrice - priceChange).toFixed(2),
    buy_market: (lastPrice + priceChange * 1.5).toFixed(2),
    sell_market: (lastPrice - priceChange * 1.5).toFixed(2),
    dominancia: {
      left: dominanciaLeft,
      right: dominanciaRight
    },
    delta_futuros: {
      positivo: deltaFuturosPositivo,
      negativo: deltaFuturosNegativo
    },
    delta_spot: {
      positivo: deltaSpotPositivo,
      negativo: deltaSpotNegativo
    }
  };
}

export function registerRoutes(app: Express): Server {
  const server = createServer(app);
  setupAuth(app);

  // Configurar WebSocket Server en puerto separado
  const wss = new WebSocketServer({ port: WS_PORT });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Cliente WebSocket conectado');

    // Enviar datos iniciales inmediatamente
    ws.send(JSON.stringify(generateData()));

    // Configurar intervalo para enviar datos en tiempo real
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(generateData()));
      }
    }, 500); // Actualizar cada 500ms

    ws.on('close', () => {
      console.log('Cliente WebSocket desconectado');
      clearInterval(interval);
    });
  });

  return server;
}