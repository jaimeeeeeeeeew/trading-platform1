import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";

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

  // Ruta para SSE
  app.get('/api/market-data', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Enviar datos iniciales
    const initialData = generateData();
    res.write(`data: ${JSON.stringify(initialData)}\n\n`);

    // Configurar el intervalo para enviar actualizaciones
    const interval = setInterval(() => {
      if (!res.writableEnded) {
        const data = generateData();
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    }, 1000);

    // Limpiar el intervalo cuando el cliente se desconecte
    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  });

  return server;
}