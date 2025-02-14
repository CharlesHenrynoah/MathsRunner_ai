import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { stockage } from "./storage";
import { chatService } from "./chat_service";
import { userStatsService } from './user_stats_service';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = registerRoutes(app);

  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;
      if (!req.user) {
        return res.status(401).json({ error: "Non authentifié" });
      }

      // Envoyer le message au service de chat
      const response = await chatService.chat(req.user.id.toString(), message);
      
      res.json({ response });
    } catch (error) {
      console.error("Erreur chat:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // Route pour démarrer la synchronisation en temps réel
  app.post('/api/stats/sync/start', async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId requis' });
    }
    
    // Pour l'instant, on renvoie juste un succès car la synchronisation est gérée en interne
    res.json({ success: true });
  });

  // Route pour arrêter la synchronisation
  app.post('/api/stats/sync/stop', async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'userId requis' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error stopping sync:', error);
      res.status(500).json({ error: 'Erreur lors de l\'arrêt de la synchronisation' });
    }
  });

  // Route pour obtenir les statistiques actuelles
  app.get('/api/stats/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Créer un objet de stats par défaut
      const defaultStats = {
        userId,
        lastUpdate: new Date(),
        personalStats: {
          niveau: 1,
          scoreMoyen: 0,
          meilleurScore: 0,
          tempsReponseMoyen: 0,
          derniersExercices: []
        },
        gameSessions: [],
        dashboardMetrics: {
          activeStatus: false,
          avgSessionDuration: 0,
          completionRate: 0,
          personalAvgScore: 0,
          levelComparison: {
            usersAtSameLevel: 0,
            avgScoreAtLevel: 0,
            retentionRate: 0
          },
          exercisePerformance: {},
          trends: []
        }
      };

      const stats = await userStatsService.getUserStats(userId);
      
      if (!stats) {
        return res.status(404).json({ error: 'Statistiques non trouvées' });
      }
      
      res.json(stats);
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
    }
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  await setupAuth(app);

  const port = 5002;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();

export default app;
