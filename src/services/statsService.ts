import { GameStats } from '../types/game';

interface GameHistoryEntry {
  date: string;
  level: number;
  score: number;
  accuracy: number;
  averageResponseTime: number;
  scorePerMinute: number;
  totalAttempts: number;
  correctAnswers: number;
  problemTypeStats: {
    type: string;
    accuracy: number;
    total: number;
    correct: number;
  }[];
}

class StatsService {
  private readonly STORAGE_KEY = 'mathrunner_game_history';

  saveGameStats(stats: GameStats): void {
    const history = this.getGameHistory();
    const entry = this.createHistoryEntry(stats);
    history.push(entry);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
  }

  getGameHistory(): GameHistoryEntry[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private createHistoryEntry(stats: GameStats): GameHistoryEntry {
    const accuracy = stats.totalAttempts > 0
      ? (stats.correctAnswers / stats.totalAttempts) * 100
      : 0;

    const averageResponseTime = stats.totalAttempts > 0
      ? stats.averageResponseTime / 1000
      : 0;

    const scorePerMinute = stats.totalAttempts > 0
      ? stats.score / (stats.totalResponseTime / 1000 / 60)
      : 0;

    const problemTypeStats = Object.entries(stats.problemTypes).map(([type, typeStats]) => ({
      type,
      accuracy: typeStats.total > 0 ? (typeStats.correct / typeStats.total) * 100 : 0,
      total: typeStats.total,
      correct: typeStats.correct
    }));

    return {
      date: new Date().toISOString(),
      level: stats.level,
      score: stats.score,
      accuracy,
      averageResponseTime,
      scorePerMinute,
      totalAttempts: stats.totalAttempts,
      correctAnswers: stats.correctAnswers,
      problemTypeStats
    };
  }

  exportToCsv(stats: GameStats): string {
    const entry = this.createHistoryEntry(stats);
    
    // Créer les en-têtes
    const headers = [
      'Date',
      'Niveau',
      'Score',
      'Précision Globale (%)',
      'Temps de Réponse Moyen (s)',
      'Score par Minute',
      'Total Tentatives',
      'Réponses Correctes',
      ...entry.problemTypeStats.flatMap(op => [
        `${op.type} - Précision (%)`,
        `${op.type} - Total Questions`,
        `${op.type} - Réponses Correctes`
      ])
    ];

    // Créer la ligne de données
    const data = [
      entry.date,
      entry.level,
      entry.score,
      entry.accuracy.toFixed(1),
      entry.averageResponseTime.toFixed(2),
      entry.scorePerMinute.toFixed(1),
      entry.totalAttempts,
      entry.correctAnswers,
      ...entry.problemTypeStats.flatMap(op => [
        op.accuracy.toFixed(1),
        op.total,
        op.correct
      ])
    ];

    // Combiner les en-têtes et les données
    return `${headers.join(',')}\n${data.join(',')}`;
  }

  getPerformanceSummary(stats: GameStats): {
    bestScore: number;
    averageScore: number;
    totalGames: number;
    bestLevel: number;
    bestAccuracy: number;
    bestResponseTime: number;
  } {
    const history = this.getGameHistory();
    
    if (history.length === 0) {
      return {
        bestScore: stats.score,
        averageScore: stats.score,
        totalGames: 1,
        bestLevel: stats.level,
        bestAccuracy: stats.totalAttempts > 0 ? (stats.correctAnswers / stats.totalAttempts) * 100 : 0,
        bestResponseTime: stats.averageResponseTime
      };
    }

    return {
      bestScore: Math.max(...history.map(h => h.score), stats.score),
      averageScore: (history.reduce((sum, h) => sum + h.score, 0) + stats.score) / (history.length + 1),
      totalGames: history.length + 1,
      bestLevel: Math.max(...history.map(h => h.level), stats.level),
      bestAccuracy: Math.max(...history.map(h => h.accuracy), 
        stats.totalAttempts > 0 ? (stats.correctAnswers / stats.totalAttempts) * 100 : 0),
      bestResponseTime: Math.min(...history.map(h => h.averageResponseTime), 
        stats.averageResponseTime)
    };
  }
}

export const statsService = new StatsService();
