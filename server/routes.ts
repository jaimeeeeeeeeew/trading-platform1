import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse';

// Función para leer el último dato del CSV
async function readLatestData() {
  try {
    const csvPath = path.join(process.cwd(), 'market_data.csv');
    const fileContent = await fs.readFile(csvPath, 'utf-8');

    return new Promise((resolve, reject) => {
      parse(fileContent, {
        columns: true,
        skip_empty_lines: true
      }, (err, records) => {
        if (err) reject(err);

        // Tomamos el último registro
        const lastRecord = records[records.length - 1];

        // Convertimos los strings a números donde corresponda
        const data = {
          direccion: Number(lastRecord.direccion),
          dominancia: {
            left: Number(lastRecord.dominancia_left),
            right: Number(lastRecord.dominancia_right)
          },
          delta_futuros: {
            positivo: Number(lastRecord.delta_futuros_positivo),
            negativo: Number(lastRecord.delta_futuros_negativo)
          },
          delta_spot: {
            positivo: Number(lastRecord.delta_spot_positivo),
            negativo: Number(lastRecord.delta_spot_negativo)
          },
          transacciones: JSON.parse(lastRecord.transacciones || '[]'),
          ordenes_limite: JSON.parse(lastRecord.ordenes_limite || '[]')
        };

        resolve(data);
      });
    });
  } catch (error) {
    console.error('Error leyendo datos del CSV:', error);
    // Si hay error, retornamos datos de fallback
    return {
      direccion: 0,
      dominancia: { left: 50, right: 50 },
      delta_futuros: { positivo: 0, negativo: 0 },
      delta_spot: { positivo: 0, negativo: 0 },
      transacciones: [],
      ordenes_limite: {
        futures: { asks: [], bids: [] },
        spot: { asks: [], bids: [] }
      }
    };
  }
}

export function registerRoutes(app: Express): Server {
  const server = createServer(app);
  setupAuth(app);

  // Ruta para SSE
  app.get('/api/market-data', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Enviar datos iniciales
    const initialData = await readLatestData();
    res.write(`data: ${JSON.stringify(initialData)}\n\n`);

    // Configurar el intervalo para enviar actualizaciones
    const interval = setInterval(async () => {
      if (!res.writableEnded) {
        try {
          const data = await readLatestData();
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch (error) {
          console.error('Error enviando datos:', error);
        }
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