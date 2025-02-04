import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { generateMarketData, updateBasePrices } from './market-simulator';

export function registerRoutes(app: Express): Server {
  const server = createServer(app);
  setupAuth(app);

  // Ruta para SSE que envía datos de mercado simulados
  app.get('/api/market-data', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Enviar datos iniciales
    const initialData = generateMarketData();
    res.write(`data: ${JSON.stringify(initialData)}\n\n`);

    // Actualizar y enviar datos cada 500ms
    const interval = setInterval(() => {
      if (!res.writableEnded) {
        updateBasePrices();
        const data = generateMarketData();
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    }, 500);

    // Limpiar el intervalo cuando el cliente se desconecte
    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  });

  // Ruta para obtener snapshot actual
  app.get('/api/market-data/snapshot', (_, res) => {
    const data = generateMarketData();
    res.json(data);
  });

  return server;
}