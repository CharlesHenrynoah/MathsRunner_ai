import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { stockage } from "./storage";
import { Utilisateur as SelectUtilisateur } from "@shared/schema";
import { userStatsService } from "./user_stats_service";

declare global {
  namespace Express {
    interface User extends SelectUtilisateur {}
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
    secret: process.env.SESSION_SECRET || 'your-secret-key-dev',
    resave: false,
    saveUninitialized: false,
    store: stockage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 heures
    }
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const utilisateur = await stockage.getUtilisateurParNom(username);
      if (!utilisateur || !(await comparePasswords(password, utilisateur.motDePasse))) {
        return done(null, false);
      } else {
        return done(null, utilisateur);
      }
    }),
  );

  passport.serializeUser((utilisateur, done) => done(null, utilisateur.id));
  passport.deserializeUser(async (id: number, done) => {
    const utilisateur = await stockage.getUtilisateur(id);
    done(null, utilisateur);
  });

  app.post("/api/register", async (req, res, next) => {
    const existingUser = await stockage.getUtilisateurParNom(req.body.nomUtilisateur);
    if (existingUser) {
      return res.status(400).send("Le nom d'utilisateur existe déjà");
    }

    const utilisateur = await stockage.creerUtilisateur({
      ...req.body,
      motDePasse: await hashPassword(req.body.motDePasse),
    });

    // Créer le fichier de statistiques pour le nouvel utilisateur
    try {
      await userStatsService.createInitialUserStatsFile(utilisateur.id.toString());
    } catch (error) {
      console.error('Erreur lors de la création du fichier de stats:', error);
    }

    req.login(utilisateur, (err) => {
      if (err) return next(err);
      res.status(201).json(utilisateur);
    });
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Démarrer la synchronisation en temps réel des statistiques
    userStatsService.startRealTimeSync(req.user!.id.toString());
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    // Arrêter la synchronisation en temps réel des statistiques
    userStatsService.stopRealTimeSync();
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}