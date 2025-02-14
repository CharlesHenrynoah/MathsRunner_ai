import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { stockage } from "./storage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CompleteUserStats {
  userId: string;
  lastUpdate: Date;
  
  personalStats: {
    niveau: number;
    scoreMoyen: number;
    meilleurScore: number;
    tempsReponseMoyen: number;
    derniersExercices: Array<{
      date: Date;
      type: string;
      succes: boolean;
      tempsReponse: number;
      difficulte: number;
    }>;
  };
  
  gameSessions: Array<{
    sessionId: string;
    score: number;
    duree: number;
    date: Date;
    exercices: Array<{
      question: string;
      reponseUtilisateur: string;
      correct: boolean;
      tempsReponse: number;
      indiceUtilise: boolean;
    }>;
  }>;
  
  dashboardMetrics: {
    activeStatus: boolean;
    avgSessionDuration: number;
    completionRate: number;
    personalAvgScore: number;
    levelComparison: {
      usersAtSameLevel: number;
      avgScoreAtLevel: number;
      retentionRate: number;
    };
    exercisePerformance: {
      [key: string]: {
        avgSuccessRate: number;
        avgTime: number;
        improvementRate: number;
      };
    };
    trends: Array<{
      date: Date;
      score: number;
      sessionsCount: number;
    }>;
  };
}

interface GameSessionWithExercises {
  sessionId: string;
  score: number;
  duree: number;
  date: Date;
  exercices: string; // JSON string from SQLite
}

interface ExerciseStats {
  type: string;
  total: number;
  correctes: number;
  tempsReponseMoyen: number;
}

class UserStatsService extends EventEmitter {
  private static instance: UserStatsService;
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly statsDir = path.join(__dirname, '../data/user_stats');
  private readonly statsFileDir = '/Users/charles-henrynoah/Desktop/MathMastery 2/stats';
  private db: any = null;
  
  private constructor() {
    super();
    this.initializeService();
  }
  
  static getInstance(): UserStatsService {
    if (!UserStatsService.instance) {
      UserStatsService.instance = new UserStatsService();
    }
    return UserStatsService.instance;
  }
  
  private async initializeService() {
    await this.ensureStatsDirectory();
    await this.ensureStatsFileDirectory();
    await this.initializeDatabase();
  }
  
  private async ensureStatsDirectory() {
    try {
      await fs.mkdir(this.statsDir, { recursive: true });
      console.log('Répertoire stats créé:', this.statsDir);
    } catch (error) {
      console.error('Erreur création répertoire stats:', error);
    }
  }
  
  private async ensureStatsFileDirectory() {
    try {
      await fs.mkdir(this.statsFileDir, { recursive: true });
      console.log('Répertoire stats fichiers créé:', this.statsFileDir);
    } catch (error) {
      console.error('Erreur création répertoire stats fichiers:', error);
    }
  }
  
  private async initializeDatabase() {
    try {
      this.db = await open({
        filename: path.join(__dirname, '../data/mathmastery.db'),
        driver: sqlite3.Database
      });
      console.log('Base de données initialisée');
    } catch (error) {
      console.error('Erreur initialisation base de données:', error);
    }
  }
  
  async startRealTimeSync(userId: string, intervalMs: number = 5000) {
    console.log(`Démarrage sync temps réel pour ${userId}`);
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Première mise à jour immédiate
    await this.updateUserStats(userId);
    
    // Puis mises à jour régulières
    this.updateInterval = setInterval(async () => {
      await this.updateUserStats(userId);
    }, intervalMs) as unknown as NodeJS.Timeout;
  }
  
  async stopRealTimeSync() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('Sync temps réel arrêtée');
    }
  }
  
  private async updateUserStats(userId: string) {
    try {
      // Get latest stats from database
      const stats = await this.compileUserStats(userId);
      
      // Calculate dashboard metrics
      const dashboardMetrics = await this.calculateDashboardMetrics(userId);
      
      // Get exercise statistics
      const exerciseStats = await this.db.all(`
        SELECT 
          type,
          COUNT(*) as total,
          SUM(CASE WHEN succes = 1 THEN 1 ELSE 0 END) as correctes,
          AVG(tempsReponse) as tempsReponseMoyen
        FROM UserStats u
        JOIN json_each(u.derniersExercices) as e
        WHERE u.userId = ?
        GROUP BY type
      `, [userId]) as ExerciseStats[];
      
      // Format stats for JSON file
      const utilisateur = await stockage.getUtilisateur(Number(userId));
      if (!utilisateur) {
        throw new Error(`Utilisateur avec l'ID ${userId} non trouvé`);
      }

      const jsonStats = {
        utilisateur: {
          id: userId,
          nomUtilisateur: utilisateur.nomUtilisateur,
          email: utilisateur.email,
          date: new Date().toISOString()
        },
        donneesParDate: [{
          date: new Date().toISOString(),
          statistiquesPersonnelles: {
            niveau: stats.personalStats.niveau,
            scoreMoyen: stats.personalStats.scoreMoyen,
            meilleurScore: stats.personalStats.meilleurScore,
            tempsReponseMoyen: dashboardMetrics.avgSessionDuration
          },
          statistiquesParType: exerciseStats.map((stat: ExerciseStats) => ({
            type: stat.type,
            correctes: stat.correctes,
            total: stat.total,
            precision: `${((stat.correctes / stat.total) * 100).toFixed(1)}%`,
            tempsMoyenReponse: stat.tempsReponseMoyen
          })),
          tempsMoyenReponse: dashboardMetrics.avgSessionDuration,
          meilleurType: this.getMeilleurType(exerciseStats),
          typesProblemes: exerciseStats.map((s: ExerciseStats) => s.type)
        }]
      };

      // Save to JSON file
      const fileName = `statistiques_${utilisateur.nomUtilisateur}.json`;
      const filePath = path.join(this.statsFileDir, fileName);
      await fs.writeFile(filePath, JSON.stringify(jsonStats, null, 2));

    } catch (error) {
      console.error('Error updating user stats:', error);
      throw error;
    }
  }

  private getMeilleurType(exerciseStats: ExerciseStats[]): string {
    if (!exerciseStats || exerciseStats.length === 0) return "Aucun";
    
    const bestStat = exerciseStats.reduce((best, current) => {
      const currentSuccess = current.correctes / current.total || 0;
      const bestSuccess = best.correctes / best.total || 0;
      return currentSuccess > bestSuccess ? current : best;
    });

    return bestStat.type || "Aucun";
  }
  
  private async compileUserStats(userId: string): Promise<CompleteUserStats> {
    // Récupérer les statistiques personnelles
    const personalStats = await this.db.get(`
      SELECT * FROM UserStats WHERE userId = ?
    `, [userId]);
    
    // Récupérer l'historique des sessions
    const gameSessions = await this.db.all(`
      SELECT 
        s.*,
        json_group_array(json_object(
          'question', e.question,
          'reponseUtilisateur', e.reponseUtilisateur,
          'correct', e.correct,
          'tempsReponse', e.tempsReponse,
          'indiceUtilise', e.indiceUtilise
        )) as exercices
      FROM GameSession s
      LEFT JOIN Exercise e ON e.sessionId = s.sessionId
      WHERE s.userId = ?
      GROUP BY s.sessionId
      ORDER BY s.date DESC
      LIMIT 100
    `, [userId]) as GameSessionWithExercises[];
    
    // Calculer les métriques du tableau de bord
    const dashboardMetrics = await this.calculateDashboardMetrics(userId);
    
    return {
      userId,
      lastUpdate: new Date(),
      personalStats,
      gameSessions: gameSessions.map((session: GameSessionWithExercises) => ({
        ...session,
        exercices: JSON.parse(session.exercices)
      })),
      dashboardMetrics
    };
  }
  
  private async calculateDashboardMetrics(userId: string) {
    const [metrics, levelStats, exerciseStats] = await Promise.all([
      // Métriques générales
      this.db.get(`
        WITH UserMetrics AS (
          SELECT 
            COUNT(*) as totalSessions,
            AVG(score) as avgScore,
            AVG(duree) as avgDuration,
            COUNT(CASE WHEN date >= datetime('now', '-7 day') THEN 1 END) > 0 as isActive
          FROM GameSession
          WHERE userId = ?
          AND date >= datetime('now', '-30 day')
        )
        SELECT * FROM UserMetrics
      `, [userId]),
      
      // Statistiques de niveau
      this.db.get(`
        WITH LevelStats AS (
          SELECT 
            COUNT(DISTINCT u.userId) as usersAtLevel,
            AVG(s.score) as avgScoreAtLevel,
            COUNT(DISTINCT CASE WHEN s.date >= datetime('now', '-7 day') THEN u.userId END) * 100.0 / 
            COUNT(DISTINCT u.userId) as retentionRate
          FROM UserStats u
          LEFT JOIN GameSession s ON s.userId = u.userId
          WHERE u.niveau = (SELECT niveau FROM UserStats WHERE userId = ?)
        )
        SELECT * FROM LevelStats
      `, [userId]),
      
      // Performance par type d'exercice
      this.db.all(`
        WITH ExerciseStats AS (
          SELECT 
            type,
            AVG(CASE WHEN succes = 1 THEN 1.0 ELSE 0.0 END) as successRate,
            AVG(tempsReponse) as avgTime,
            (
              AVG(CASE WHEN date >= datetime('now', '-7 day') AND succes = 1 THEN 1.0 ELSE 0.0 END) -
              AVG(CASE WHEN date >= datetime('now', '-30 day') AND date < datetime('now', '-7 day') 
                  AND succes = 1 THEN 1.0 ELSE 0.0 END)
            ) * 100 as improvementRate
          FROM UserStats u
          JOIN json_each(u.derniersExercices) as e
          WHERE u.userId = ?
          GROUP BY type
        )
        SELECT * FROM ExerciseStats
      `, [userId])
    ]);
    
    // Formater les métriques
    return {
      activeStatus: metrics?.isActive || false,
      avgSessionDuration: metrics?.avgDuration || 0,
      completionRate: metrics?.totalSessions > 0 ? 1 : 0,
      personalAvgScore: metrics?.avgScore || 0,
      levelComparison: {
        usersAtSameLevel: levelStats?.usersAtSameLevel || 0,
        avgScoreAtLevel: levelStats?.avgScoreAtLevel || 0,
        retentionRate: levelStats?.retentionRate || 0
      },
      exercisePerformance: exerciseStats.reduce((acc: any, stat: any) => {
        acc[stat.type] = {
          avgSuccessRate: stat.successRate,
          avgTime: stat.avgTime,
          improvementRate: stat.improvementRate
        };
        return acc;
      }, {}),
      trends: await this.getTrends(userId)
    };
  }
  
  private async getTrends(userId: string) {
    return this.db.all(`
      WITH RECURSIVE dates(date) AS (
        SELECT date('now', '-29 days')
        UNION ALL
        SELECT date(date, '+1 day')
        FROM dates
        WHERE date < date('now')
      )
      SELECT 
        dates.date,
        COALESCE(AVG(s.score), 0) as score,
        COUNT(s.sessionId) as sessionsCount
      FROM dates
      LEFT JOIN GameSession s ON date(s.date) = dates.date AND s.userId = ?
      GROUP BY dates.date
      ORDER BY dates.date
    `, [userId]);
  }
  
  private async saveUserStats(userId: string, stats: CompleteUserStats) {
    const utilisateur = await stockage.getUtilisateur(Number(userId));
    if (!utilisateur) {
      throw new Error(`Utilisateur avec l'ID ${userId} non trouvé`);
    }
    const fileName = `statistiques_${utilisateur.nomUtilisateur}.json`;
    const filePath = path.join(this.statsDir, fileName);
    await fs.writeFile(filePath, JSON.stringify(stats, null, 2));
  }
  
  private getDefaultStats(userId: string): CompleteUserStats {
    return {
      userId,
      lastUpdate: new Date(),
      personalStats: {
        niveau: 1,
        scoreMoyen: 70,
        meilleurScore: 85,
        tempsReponseMoyen: 5.2,
        derniersExercices: [
          {
            date: new Date(),
            type: 'addition',
            succes: true,
            tempsReponse: 4.5,
            difficulte: 2
          },
          {
            date: new Date(Date.now() - 24 * 60 * 60 * 1000),
            type: 'multiplication',
            succes: false,
            tempsReponse: 6.8,
            difficulte: 3
          }
        ]
      },
      gameSessions: [
        {
          sessionId: 'default-session-1',
          score: 75,
          duree: 15,
          date: new Date(),
          exercices: [
            {
              question: '12 + 15',
              reponseUtilisateur: '27',
              correct: true,
              tempsReponse: 4.2,
              indiceUtilise: false
            }
          ]
        }
      ],
      dashboardMetrics: {
        activeStatus: true,
        avgSessionDuration: 15,
        completionRate: 0.8,
        personalAvgScore: 72,
        levelComparison: {
          usersAtSameLevel: 10,
          avgScoreAtLevel: 68,
          retentionRate: 75
        },
        exercisePerformance: {
          'addition': {
            avgSuccessRate: 0.85,
            avgTime: 4.5,
            improvementRate: 5
          },
          'multiplication': {
            avgSuccessRate: 0.65,
            avgTime: 6.2,
            improvementRate: -2
          }
        },
        trends: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          score: 65 + Math.random() * 10,
          sessionsCount: 1 + Math.floor(Math.random() * 3)
        }))
      }
    };
  }

  async getUserStats(userId: string): Promise<CompleteUserStats | null> {
    try {
      const utilisateur = await stockage.getUtilisateur(Number(userId));
      if (!utilisateur) {
        throw new Error(`Utilisateur avec l'ID ${userId} non trouvé`);
      }
      const fileName = `statistiques_${utilisateur.nomUtilisateur}.json`;
      const filePath = path.join(this.statsDir, fileName);
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          // Si le fichier n'existe pas, créer des stats par défaut
          const defaultStats = this.getDefaultStats(userId);
          await this.saveUserStats(userId, defaultStats);
          return defaultStats;
        }
        throw error;
      }
    } catch (error) {
      console.error(`Erreur lecture stats ${userId}:`, error);
      return null;
    }
  }

  async createInitialUserStatsFile(userId: string): Promise<string> {
    try {
      console.log(`[DEBUG] Création du fichier de stats initial pour l'utilisateur ${userId}`);
      
      const utilisateur = await stockage.getUtilisateur(Number(userId));
      if (!utilisateur) {
        throw new Error(`Utilisateur avec l'ID ${userId} non trouvé`);
      }

      const fileName = `statistiques_${utilisateur.nomUtilisateur}.json`;
      const filePath = path.join('/Users/charles-henrynoah/Desktop/MathMastery 2/stats', fileName);

      const initialStats = {
        utilisateur: {
          id: userId,
          nomUtilisateur: utilisateur.nomUtilisateur,
          email: utilisateur.email,
          date: new Date().toISOString()
        },
        donneesParDate: [
          {
            date: new Date().toISOString(),
            statistiquesPersonnelles: {
              niveau: 1,
              scoreMoyen: 0,
              meilleurScore: 0,
              tempsReponseMoyen: 0
            },
            statistiquesParType: [
              {
                type: "Addition",
                correctes: 0,
                total: 0,
                precision: "0%"
              },
              {
                type: "Soustraction",
                correctes: 0,
                total: 0,
                precision: "0%"
              },
              {
                type: "Multiplication",
                correctes: 0,
                total: 0,
                precision: "0%"
              },
              {
                type: "Division",
                correctes: 0,
                total: 0,
                precision: "0%"
              },
              {
                type: "Puissance",
                correctes: 0,
                total: 0,
                precision: "0%"
              },
              {
                type: "Algebre",
                correctes: 0,
                total: 0,
                precision: "0%"
              }
            ],
            dernierePartie: {
              score: 0,
              niveauAtteint: 1,
              questionsCorrectes: 0,
              questionsIncorrectes: 0,
              tempsMoyenReponse: 0,
              meilleurType: "Aucun"
            },
            historiqueDesParties: []
          }
        ]
      };

      await fs.writeFile(filePath, JSON.stringify(initialStats, null, 2), 'utf-8');
      console.log(`[DEBUG] Fichier de statistiques initial créé avec succès pour ${utilisateur.nomUtilisateur}`);
      
      return filePath;
    } catch (error) {
      console.error('[DEBUG] ERREUR dans createInitialUserStatsFile:', error);
      throw error;
    }
  }

  async updateStatsAfterGame(userId: string, gameData: {
    score: number;
    exercices: Array<{
      type: string;
      correct: boolean;
      tempsReponse: number;
      question: string;
      reponseUtilisateur: string;
      indiceUtilise: boolean;
    }>;
    duree: number;
  }): Promise<void> {
    try {
      console.log(`[DEBUG] Début de updateStatsAfterGame pour l'utilisateur ${userId}`);
      
      const utilisateur = await stockage.getUtilisateur(Number(userId));
      if (!utilisateur) {
        throw new Error(`Utilisateur avec l'ID ${userId} non trouvé`);
      }

      const fileName = `statistiques_${utilisateur.nomUtilisateur}.json`;
      const statsFilePath = path.join('/Users/charles-henrynoah/Desktop/MathMastery 2/stats', fileName);

      // Lire ou créer le fichier de stats
      let statsData: any;
      try {
        const fileContent = await fs.readFile(statsFilePath, 'utf-8');
        statsData = JSON.parse(fileContent);
      } catch (error) {
        await this.createInitialUserStatsFile(userId);
        const fileContent = await fs.readFile(statsFilePath, 'utf-8');
        statsData = JSON.parse(fileContent);
      }

      // Calculer les statistiques par type
      const statsParType = [
        "Addition", "Soustraction", "Multiplication", 
        "Division", "Puissance", "Algebre"
      ].map(type => {
        const exercicesDuType = gameData.exercices.filter(ex => ex.type === type);
        const total = exercicesDuType.length;
        const correctes = exercicesDuType.filter(ex => ex.correct).length;
        
        // Ajouter aux totaux précédents
        const dernieresStats = statsData.donneesParDate[statsData.donneesParDate.length - 1];
        const statsPrec = dernieresStats.statistiquesParType.find((s: any) => s.type === type);
        const totalCumule = total + (statsPrec?.total || 0);
        const correctesCumule = correctes + (statsPrec?.correctes || 0);
        
        return {
          type,
          correctes: correctesCumule,
          total: totalCumule,
          precision: totalCumule > 0 ? `${Math.round((correctesCumule / totalCumule) * 100)}%` : "0%"
        };
      });

      // Calculer les statistiques personnelles cumulées
      const dernieresStats = statsData.donneesParDate[statsData.donneesParDate.length - 1];
      const totalParties = (dernieresStats.historiqueDesParties?.length || 0) + 1;
      const scoreMoyen = Math.round(
        ((dernieresStats.statistiquesPersonnelles.scoreMoyen || 0) * (totalParties - 1) + gameData.score) / totalParties
      );
      
      const meilleurScore = Math.max(
        dernieresStats.statistiquesPersonnelles.meilleurScore || 0, 
        gameData.score
      );
      
      const tempsReponseMoyen = parseFloat(
        (((dernieresStats.statistiquesPersonnelles.tempsReponseMoyen || 0) * (totalParties - 1) + 
        gameData.duree / gameData.exercices.length) / totalParties).toFixed(3)
      );

      // Trouver le meilleur type
      const meilleurType = statsParType
        .filter(s => s.total > 0)
        .sort((a, b) => {
          const precisionA = parseInt(a.precision);
          const precisionB = parseInt(b.precision);
          return precisionB - precisionA;
        })[0]?.type || "Aucun";

      // Calculer la moyenne du temps de réponse pour cette partie
      const tempsMoyenReponsePartie = parseFloat(
        (gameData.duree / gameData.exercices.length).toFixed(2)
      );

      // Créer la nouvelle entrée
      const nouvellesDonnees = {
        date: new Date().toISOString(),
        statistiquesPersonnelles: {
          niveau: utilisateur.niveauActuel || 1,
          scoreMoyen: scoreMoyen,
          meilleurScore: meilleurScore,
          tempsReponseMoyen: tempsReponseMoyen || 0
        },
        statistiquesParType: statsParType,
        dernierePartie: {
          score: gameData.score,
          niveauAtteint: utilisateur.niveauActuel || 1,
          questionsCorrectes: gameData.exercices.filter(ex => ex.correct).length,
          questionsIncorrectes: gameData.exercices.filter(ex => !ex.correct).length,
          tempsMoyenReponse: tempsMoyenReponsePartie || 0,
          meilleurType: meilleurType
        },
        historiqueDesParties: [
          ...dernieresStats.historiqueDesParties,
          {
            date: new Date().toISOString(),
            typesProblemes: Array.from(new Set(gameData.exercices.map(ex => ex.type))),
            niveauMaxAtteint: utilisateur.niveauActuel || 1,
            score: gameData.score
          }
        ]
      };

      // Ajouter les nouvelles données
      statsData.donneesParDate.push(nouvellesDonnees);

      // Écrire le fichier
      await fs.writeFile(statsFilePath, JSON.stringify(statsData, null, 2), 'utf-8');
      console.log(`[DEBUG] Fichier de statistiques mis à jour avec succès pour ${utilisateur.nomUtilisateur}`);

    } catch (error) {
      console.error(`[DEBUG] ERREUR dans updateStatsAfterGame:`, error);
      throw error;
    }
  }
  
  async exportUserStatsToFile(userId: string): Promise<string> {
    try {
      const stats = await this.getUserStats(userId);
      if (!stats) {
        throw new Error('Statistiques non trouvées');
      }

      const exportPath = path.join(this.statsFileDir, `statistiques_${userId}.json`);
      await fs.writeFile(exportPath, JSON.stringify(stats, null, 2), 'utf-8');
      return exportPath;
    } catch (error) {
      console.error('Erreur lors de l\'exportation des statistiques:', error);
      throw error;
    }
  }

  saveUserStatsToDatabase(userId: string, gameData: {
      score: number; exercices: Array<{
          type: string;
          correct: boolean;
          tempsReponse: number;
          question: string;
          reponseUtilisateur: string;
          indiceUtilise: boolean;
      }>; duree: number;
  }, stats: CompleteUserStats) {
      throw new Error('Method not implemented.');
  }
}

export const userStatsService = UserStatsService.getInstance();
