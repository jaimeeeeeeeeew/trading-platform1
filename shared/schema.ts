import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  tradingPreferences: text("trading_preferences"),  // Para guardar preferencias del usuario en JSON
});

export const marketData = pgTable("market_data", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  time: timestamp("time").defaultNow().notNull(),
  ask_limit: numeric("ask_limit").notNull(),
  bid_limit: numeric("bid_limit").notNull(),
  buy_market: numeric("buy_market").notNull(),
  sell_market: numeric("sell_market").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  tradingPreferences: true,
}).extend({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
});

export const insertMarketDataSchema = createInsertSchema(marketData).omit({ 
  id: true,
  time: true
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type MarketData = typeof marketData.$inferSelect;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;