import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";

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

  // Generar transacciones relacionadas con la tendencia
  const numTransactions = getRandomInt(3, 7);
  const transacciones = Array.from({ length: numTransactions }, () => {
    const isLarge = Math.random() < 0.2; // 20% de probabilidad de transacción grande
    const volumeBase = isLarge ? getRandomInt(500, 2000) : getRandomInt(50, 500);
    const transactionPrice = lastPrice * (1 + (Math.random() * 0.001 - 0.0005));
    return {
      volume: `${volumeBase}K`,
      price: transactionPrice.toFixed(2)
    };
  });

  return {
    direccion: Math.round(lastPrice),
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
    },
    transacciones
  };
}

export function registerRoutes(app: Express): Server {
  const server = createServer(app);
  setupAuth(app);

  // Ruta para SSE
  app.get('/api/market-data', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Enviar datos iniciales
    const initialData = generateData();
    res.write(`data: ${JSON.stringify(initialData)}\n\n`);

    // Configurar el intervalo para enviar actualizaciones más frecuentes
    const interval = setInterval(() => {
      if (!res.writableEnded) {
        const data = generateData();
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    }, 500); // Actualizar cada 500ms para datos más fluidos

    // Limpiar el intervalo cuando el cliente se desconecte
    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  });

  return server;
}