import { GameStats, ProblemType } from '../types/game';

const DEFAULT_PROBLEM_TYPES = {
  addition: { correct: 0, total: 0 },
  subtraction: { correct: 0, total: 0 },
  multiplication: { correct: 0, total: 0 },
  division: { correct: 0, total: 0 },
  puissance: { correct: 0, total: 0 },
  algebre: { correct: 0, total: 0 }
};

class UserStatsService {
  private readonly STATS_KEY = 'mathrunner_stats';

  async saveUserStats(stats: GameStats): Promise<void> {
    try {
      const existingStatsStr = localStorage.getItem(this.STATS_KEY);
      const existingStats = existingStatsStr ? JSON.parse(existingStatsStr) : [];
      
      // S'assurer que tous les types de problèmes sont présents
      const newStats = {
        ...stats,
        problemTypes: {
          ...DEFAULT_PROBLEM_TYPES,
          ...stats.problemTypes
        },
        timestamp: new Date().toISOString(),
      };
      
      existingStats.push(newStats);
      localStorage.setItem(this.STATS_KEY, JSON.stringify(existingStats));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des stats:', error);
      throw error;
    }
  }

  async getUserStats(): Promise<GameStats[]> {
    try {
      const statsStr = localStorage.getItem(this.STATS_KEY);
      const stats = statsStr ? JSON.parse(statsStr) : [];
      
      // S'assurer que chaque entrée a tous les types de problèmes
      return stats.map((stat: GameStats) => ({
        ...stat,
        problemTypes: {
          ...DEFAULT_PROBLEM_TYPES,
          ...stat.problemTypes
        }
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des stats:', error);
      throw error;
    }
  }

  async getGlobalStats(): Promise<{
    bestScore: number;
    averageScore: number;
    totalGames: number;
    averageResponseTime: number;
    problemTypeStats: Record<ProblemType, { correct: number; total: number }>;
  }> {
    try {
      const stats = await this.getUserStats();
      if (stats.length === 0) {
        return {
          bestScore: 0,
          averageScore: 0,
          totalGames: 0,
          averageResponseTime: 0,
          problemTypeStats: DEFAULT_PROBLEM_TYPES
        };
      }

      // Calcul du meilleur score et de la moyenne
      const bestScore = Math.max(...stats.map(s => s.score));
      const totalScore = stats.reduce((acc, s) => acc + s.score, 0);
      const averageScore = totalScore / stats.length;

      // Calcul du temps moyen de réponse global
      const totalResponseTime = stats.reduce((acc, s) => {
        return acc + (s.averageResponseTime * s.totalAttempts);
      }, 0);
      const totalAttempts = stats.reduce((acc, s) => acc + s.totalAttempts, 0);
      const averageResponseTime = totalAttempts > 0 ? totalResponseTime / totalAttempts : 0;

      // Calcul des statistiques par type de problème
      const problemTypeStats = stats.reduce((acc, game) => {
        Object.entries(game.problemTypes).forEach(([type, stats]) => {
          if (!acc[type as ProblemType]) {
            acc[type as ProblemType] = { correct: 0, total: 0 };
          }
          acc[type as ProblemType].correct += stats.correct;
          acc[type as ProblemType].total += stats.total;
        });
        return acc;
      }, { ...DEFAULT_PROBLEM_TYPES });

      return {
        bestScore,
        averageScore,
        totalGames: stats.length,
        averageResponseTime,
        problemTypeStats,
      };
    } catch (error) {
      console.error('Erreur lors du calcul des stats globales:', error);
      throw error;
    }
  }
}

export const userStatsService = new UserStatsService();
