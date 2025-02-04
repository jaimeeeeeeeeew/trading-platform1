import { db } from "./db";
import { eq, and, between } from "drizzle-orm";
import { users, trades, tradingMetrics, 
  type User, type InsertUser, type Trade, type InsertTrade,
  type TradingMetrics, type InsertMetrics } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPreferences(userId: number, preferences: string): Promise<User>;
  updateUserApiKeys(userId: number, keys: Record<string, string>): Promise<User>;

  // Trade operations
  createTrade(trade: InsertTrade): Promise<Trade>;
  getTrades(userId: number, startDate: Date, endDate: Date): Promise<Trade[]>;
  updateTrade(tradeId: number, updates: Partial<Trade>): Promise<Trade>;
  closeTrade(tradeId: number, exitPrice: number): Promise<Trade>;

  // Metrics operations
  getMetrics(userId: number, period: string, startDate: Date, endDate: Date): Promise<TradingMetrics | undefined>;
  updateMetrics(metrics: InsertMetrics): Promise<TradingMetrics>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // Limpiar sesiones expiradas cada 24h
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserPreferences(userId: number, preferences: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ tradingPreferences: preferences })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserApiKeys(userId: number, keys: Record<string, string>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ exchangeApiKeys: keys })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Trade operations
  async createTrade(trade: InsertTrade): Promise<Trade> {
    const [newTrade] = await db.insert(trades).values(trade).returning();
    return newTrade;
  }

  async getTrades(userId: number, startDate: Date, endDate: Date): Promise<Trade[]> {
    return await db
      .select()
      .from(trades)
      .where(
        and(
          eq(trades.userId, userId),
          between(trades.openTime, startDate, endDate)
        )
      );
  }

  async updateTrade(tradeId: number, updates: Partial<Trade>): Promise<Trade> {
    const [updatedTrade] = await db
      .update(trades)
      .set(updates)
      .where(eq(trades.id, tradeId))
      .returning();
    return updatedTrade;
  }

  async closeTrade(tradeId: number, exitPrice: number): Promise<Trade> {
    const [trade] = await db.select().from(trades).where(eq(trades.id, tradeId));
    if (!trade) throw new Error("Trade not found");

    const pnl = (exitPrice - trade.entryPrice) * (trade.side === 'BUY' ? 1 : -1) * trade.quantity;
    const pnlPercentage = (pnl / (trade.entryPrice * trade.quantity)) * 100;

    const [updatedTrade] = await db
      .update(trades)
      .set({
        exitPrice,
        status: 'CLOSED',
        closeTime: new Date(),
        pnl,
        pnlPercentage,
      })
      .where(eq(trades.id, tradeId))
      .returning();

    return updatedTrade;
  }

  // Metrics operations
  async getMetrics(userId: number, period: string, startDate: Date, endDate: Date): Promise<TradingMetrics | undefined> {
    const [metrics] = await db
      .select()
      .from(tradingMetrics)
      .where(
        and(
          eq(tradingMetrics.userId, userId),
          eq(tradingMetrics.period, period),
          eq(tradingMetrics.startDate, startDate),
          eq(tradingMetrics.endDate, endDate)
        )
      );
    return metrics;
  }

  async updateMetrics(metrics: InsertMetrics): Promise<TradingMetrics> {
    const [updatedMetrics] = await db
      .insert(tradingMetrics)
      .values(metrics)
      .returning();
    return updatedMetrics;
  }
}

export const storage = new DatabaseStorage();