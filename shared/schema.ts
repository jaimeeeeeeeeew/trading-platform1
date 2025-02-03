import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  tradingPreferences: text("trading_preferences"),  // Para guardar preferencias del usuario en JSON
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  tradingPreferences: true,
}).extend({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;