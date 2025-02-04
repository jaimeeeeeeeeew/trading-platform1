import { users, type User, type InsertUser } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import fs from "fs";
import path from "path";
import { createObjectCsvWriter } from "csv-writer";
import { parse } from "csv-parse";
import { promisify } from "util";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPreferences(userId: number, preferences: string): Promise<User>;
  deleteUser(userId: number): Promise<void>;
  sessionStore: session.Store;
}

export class CSVStorage implements IStorage {
  private csvPath: string;
  sessionStore: session.Store;

  constructor() {
    this.csvPath = path.join(process.cwd(), "users.csv");
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // Limpiar sesiones expiradas cada 24h
    });

    // Crear el archivo CSV si no existe
    if (!fs.existsSync(this.csvPath)) {
      fs.writeFileSync(this.csvPath, "id,username,password,tradingPreferences\n");
    }
  }

  private async readUsers(): Promise<User[]> {
    const parseAsync = promisify(parse);
    const fileContent = await fs.promises.readFile(this.csvPath, 'utf-8');
    const records = await parseAsync(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    return records.map((record: any) => ({
      id: parseInt(record.id),
      username: record.username,
      password: record.password,
      tradingPreferences: record.tradingPreferences || null
    }));
  }

  private async writeUsers(users: User[]): Promise<void> {
    const csvWriter = createObjectCsvWriter({
      path: this.csvPath,
      header: [
        { id: 'id', title: 'id' },
        { id: 'username', title: 'username' },
        { id: 'password', title: 'password' },
        { id: 'tradingPreferences', title: 'tradingPreferences' }
      ]
    });

    await csvWriter.writeRecords(users);
  }

  async getUser(id: number): Promise<User | undefined> {
    const users = await this.readUsers();
    return users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const users = await this.readUsers();
    return users.find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const users = await this.readUsers();
    const maxId = users.reduce((max, user) => Math.max(max, user.id), 0);
    const newUser: User = { 
      id: maxId + 1,
      username: insertUser.username,
      password: insertUser.password,
      tradingPreferences: insertUser.tradingPreferences || null
    };

    users.push(newUser);
    await this.writeUsers(users);

    return newUser;
  }

  async updateUserPreferences(userId: number, preferences: string): Promise<User> {
    const users = await this.readUsers();
    const userIndex = users.findIndex(user => user.id === userId);

    if (userIndex === -1) {
      throw new Error("Usuario no encontrado");
    }

    users[userIndex] = { ...users[userIndex], tradingPreferences: preferences };
    await this.writeUsers(users);

    return users[userIndex];
  }

  async deleteUser(userId: number): Promise<void> {
    const users = await this.readUsers();
    const filteredUsers = users.filter(user => user.id !== userId);
    await this.writeUsers(filteredUsers);
  }
}

export const storage = new CSVStorage();