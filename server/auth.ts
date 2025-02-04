import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID!,
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      path: '/',
      httpOnly: true
    },
    store: storage.sessionStore,
    name: 'connect.sid'
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async function verify(username: string, password: string, done: Function) {
      try {
        console.log('Attempting login for username:', username);
        const user = await storage.getUserByUsername(username);

        if (!user) {
          console.log('User not found');
          return done(null, false, { message: "Usuario no encontrado" });
        }

        console.log('User found, verifying password');
        const isValid = await comparePasswords(password, user.password);

        if (!isValid) {
          console.log('Invalid password');
          return done(null, false, { message: "Contraseña incorrecta" });
        }

        console.log('Login successful');
        return done(null, user);
      } catch (err) {
        console.error('Login error:', err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user: Express.User, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('Deserializing user:', id);
      const user = await storage.getUser(id);
      if (!user) {
        console.log('User not found during deserialization');
        return done(null, false);
      }
      console.log('User deserialized successfully');
      done(null, user);
    } catch (err) {
      console.error('Deserialization error:', err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "El nombre de usuario ya existe" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      console.log('Creating new user with username:', req.body.username);

      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({ 
          id: user.id,
          username: user.username,
          tradingPreferences: user.tradingPreferences,
        });
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log('Login attempt with username:', req.body.username);
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        console.error('Authentication error:', err);
        return next(err);
      }
      if (!user) {
        console.log('Authentication failed:', info?.message);
        return res.status(401).json({ error: info?.message || "Credenciales inválidas" });
      }

      console.log('Authentication successful, logging in');
      req.login(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return next(err);
        }
        res.json({
          id: user.id,
          username: user.username,
          tradingPreferences: user.tradingPreferences,
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    console.log('Logging out user');
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    console.log('Checking authentication status:', req.isAuthenticated());
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "No autenticado" });
    }
    res.json({
      id: req.user.id,
      username: req.user.username,
      tradingPreferences: req.user.tradingPreferences,
    });
  });
}