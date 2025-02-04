import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { createBinxClient } from './binx-client';
import { db } from './db';
import { and, between, eq } from 'drizzle-orm';
import { trades, tradingMetrics } from '@shared/schema';
import pkg from 'pg';
const { Pool } = pkg;

// Configuración de la conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const binxClient = createBinxClient();

export function registerRoutes(app: Express): Server {
  const server = createServer(app);
  setupAuth(app);

  // Ruta para obtener datos de la API de BINX
  app.get('/api/binx/market-data/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const marketData = await binxClient.getMarketData(symbol);
      res.json(marketData);
    } catch (error) {
      console.error('Error al obtener datos de BINX:', error);
      res.status(500).json({ error: 'Error al obtener datos de mercado' });
    }
  });

  // Ruta para obtener métricas de trading por periodo
  app.get('/api/trading/metrics', async (req, res) => {
    try {
      const { userId, startDate, endDate } = req.query;
      if (!userId || !startDate || !endDate) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos' });
      }

      const metrics = await db.select()
        .from(tradingMetrics)
        .where(
          and(
            eq(tradingMetrics.userId, Number(userId)),
            between(tradingMetrics.startDate, new Date(String(startDate)), new Date(String(endDate)))
          )
        );

      const tradeHistory = await db.select()
        .from(trades)
        .where(
          and(
            eq(trades.userId, Number(userId)),
            between(trades.openTime, new Date(String(startDate)), new Date(String(endDate)))
          )
        );

      // Calcular rachas
      let currentStreak = 0;
      let maxWinStreak = 0;
      let maxLoseStreak = 0;
      let currentWinStreak = 0;
      let currentLoseStreak = 0;

      tradeHistory.forEach(trade => {
        if (trade.pnl && trade.pnl > 0) {
          currentWinStreak++;
          currentLoseStreak = 0;
          maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
        } else if (trade.pnl && trade.pnl < 0) {
          currentLoseStreak++;
          currentWinStreak = 0;
          maxLoseStreak = Math.max(maxLoseStreak, currentLoseStreak);
        }
      });

      res.json({
        metrics,
        stats: {
          maxWinStreak,
          maxLoseStreak,
          totalTrades: tradeHistory.length,
          profitableTrades: tradeHistory.filter(t => t.pnl && t.pnl > 0).length,
        }
      });
    } catch (error) {
      console.error('Error al obtener métricas:', error);
      res.status(500).json({ error: 'Error al obtener métricas' });
    }
  });

  // Ruta para obtener información de la cuenta
  app.get('/api/binx/account', async (req, res) => {
    try {
      const accountInfo = await binxClient.getAccountInfo();
      res.json(accountInfo);
    } catch (error) {
      console.error('Error al obtener información de la cuenta:', error);
      res.status(500).json({ error: 'Error al obtener información de la cuenta' });
    }
  });

  // Ruta para obtener historial de trades
  app.get('/api/binx/trades/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const { limit = 50 } = req.query;
      const trades = await binxClient.getTradeHistory(symbol, Number(limit));
      res.json(trades);
    } catch (error) {
      console.error('Error al obtener historial de trades:', error);
      res.status(500).json({ error: 'Error al obtener historial de trades' });
    }
  });

  // Nueva ruta para insertar datos de mercado
  app.post('/api/market-data', async (req, res) => {
    try {
      const { symbol, ask_limit, bid_limit, buy_market, sell_market } = req.body;

      const result = await pool.query(
        `INSERT INTO market_data (symbol, ask_limit, bid_limit, buy_market, sell_market)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [symbol, ask_limit, bid_limit, buy_market, sell_market]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error al insertar datos:', error);
      res.status(500).json({ error: 'Error al insertar datos' });
    }
  });

  // Ruta para obtener datos históricos por símbolo
  app.get('/api/market-data/:symbol/history', async (req, res) => {
    try {
      const { symbol } = req.params;
      const { limit = 100 } = req.query;

      const result = await pool.query(
        `SELECT * FROM market_data 
         WHERE symbol = $1 
         ORDER BY time DESC 
         LIMIT $2`,
        [symbol, limit]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error al obtener datos históricos:', error);
      res.status(500).json({ error: 'Error al obtener datos históricos' });
    }
  });

  // Ruta SSE para datos en tiempo real
  app.get('/api/market-data/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendMarketData = async () => {
      try {
        const symbol = req.query.symbol as string || 'BINX:BTCUSDT';
        const data = await binxClient.getMarketData(symbol);
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
      } catch (error) {
        console.error('Error al obtener datos de mercado:', error);
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ error: 'Error al obtener datos de mercado' })}\n\n`);
        }
      }
    };

    // Enviar datos iniciales
    sendMarketData();

    // Configurar el intervalo para enviar actualizaciones
    const interval = setInterval(sendMarketData, 1000);

    // Limpiar el intervalo cuando el cliente se desconecte
    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  });

  return server;
}