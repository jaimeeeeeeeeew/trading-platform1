import { pgTable, text, serial, integer, boolean, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  tradingPreferences: text("trading_preferences"),  // Para guardar preferencias del usuario en JSON
  exchangeApiKeys: jsonb("exchange_api_keys"), // Para almacenar múltiples API keys de exchanges
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // 'BUY' | 'SELL'
  entryPrice: numeric("entry_price").notNull(),
  exitPrice: numeric("exit_price"),
  quantity: numeric("quantity").notNull(),
  leverage: integer("leverage").notNull().default(1),
  pnl: numeric("pnl"),
  pnlPercentage: numeric("pnl_percentage"),
  status: text("status").notNull(), // 'OPEN' | 'CLOSED'
  stopLoss: numeric("stop_loss"),
  takeProfit: numeric("take_profit"),
  openTime: timestamp("open_time").defaultNow().notNull(),
  closeTime: timestamp("close_time"),
  exchange: text("exchange").notNull().default('BINX'),
  notes: text("notes"),
});

export const tradingMetrics = pgTable("trading_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  period: text("period").notNull(), // 'DAILY' | 'WEEKLY' | 'MONTHLY'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalTrades: integer("total_trades").notNull(),
  winningTrades: integer("winning_trades").notNull(),
  losingTrades: integer("losing_trades").notNull(),
  winRate: numeric("win_rate").notNull(),
  averageWin: numeric("average_win").notNull(),
  averageLoss: numeric("average_loss").notNull(),
  largestWin: numeric("largest_win").notNull(),
  largestLoss: numeric("largest_loss").notNull(),
  profitFactor: numeric("profit_factor").notNull(),
  netPnl: numeric("net_pnl").notNull(),
  maxDrawdown: numeric("max_drawdown").notNull(),
  longestWinStreak: integer("longest_win_streak").notNull(),
  longestLoseStreak: integer("longest_lose_streak").notNull(),
  averageTradeTime: numeric("average_trade_time").notNull(), // en minutos
  totalVolume: numeric("total_volume").notNull(),
  averageLeverage: numeric("average_leverage").notNull(),
});

export const marketData = pgTable("market_data", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  time: timestamp("time").defaultNow().notNull(),
  ask_limit: numeric("ask_limit").notNull(),
  bid_limit: numeric("bid_limit").notNull(),
  buy_market: numeric("buy_market").notNull(),
  sell_market: numeric("sell_market").notNull(),
  futuros_basis: numeric("futuros_basis"),
  futuros_funding_rate: numeric("futuros_funding_rate"),
});

// Schema para inserción de usuarios
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  tradingPreferences: true,
  exchangeApiKeys: true
}).extend({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
});

// Schema para inserción de trades
export const insertTradeSchema = createInsertSchema(trades).omit({ 
  id: true,
  pnl: true,
  pnlPercentage: true,
  closeTime: true
});

// Schema para inserción de métricas
export const insertMetricsSchema = createInsertSchema(tradingMetrics).omit({ 
  id: true 
});

// Schema para inserción de datos de mercado
export const insertMarketDataSchema = createInsertSchema(marketData).omit({ 
  id: true,
  time: true
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type TradingMetrics = typeof tradingMetrics.$inferSelect;
export type MarketData = typeof marketData.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type InsertMetrics = z.infer<typeof insertMetricsSchema>;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;